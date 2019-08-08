pragma solidity 0.5.10;
// pragma experimental ABIEncoderV2;
import "../SimpleToken.sol";
import "./Utils.sol";
// import "./BlockManager.sol";
import "./Blocks.sol";
import "./VoteManager.sol";
// import "../lib/Random.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../lib/Structs.sol";


contract StakeManager is Utils, Blocks, VoteManager {
    using SafeMath for uint256;
    mapping (address => uint256) public stakerIds;
    mapping (uint256 => Structs.Staker) public stakers;
    uint256 public numStakers = 0;
       // uint256 public totalStake = 0;
    event Staked(uint256 stakerId, uint256 amount);
    // SimpleToken public sch;
    uint256 public rewardPool = 0;
    uint256 public stakeGettingReward = 0;

    // constructor(address _schAddress) public {
    //     sch = SimpleToken(_schAddress);
    // }
    // stake during commit state only
    // we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    function stake (uint256 epoch, uint256 amount) public checkEpoch(epoch) checkState(Constants.commit()) {
        //not allowed during reveal period
        require(getState() != Constants.reveal());
        require(amount >= Constants.minStake(), "staked amount is less than minimum stake required");
        require(sch.transferFrom(msg.sender, address(this), amount), "sch transfer failed");
        uint256 stakerId = stakerIds[msg.sender];
        if (stakerId == 0) {
            numStakers = numStakers.add(1);
            stakers[numStakers] = Structs.Staker(numStakers, amount, epoch, 0, 0,
            epoch.add(Constants.unstakeLockPeriod()), 0);
            stakerId = numStakers;
            stakerIds[msg.sender] = stakerId;
        } else {
            require(stakers[stakerId].stake > 0,
                    "adding stake is not possible after withdrawal/slash. Please use a new address");
            stakers[stakerId].stake = stakers[stakerId].stake.add(amount);
        }
        // totalStake = totalStake.add(amount);
        emit Staked(stakerId, amount);
    }

    event Unstaked(uint256 stakerId);

    // staker must call unstake() and continue voting for Constants.WITHDRAW_LOCK_PERIOD
    //after which she can call withdraw() to finally Withdraw
    function unstake (uint256 epoch) public checkEpoch(epoch)  checkState(Constants.commit()) {
        uint256 stakerId = stakerIds[msg.sender];
        Structs.Staker storage staker = stakers[stakerId];
        require(staker.id != 0, "staker.id = 0");
        require(staker.stake > 0, "Nonpositive stake");
        require(staker.unstakeAfter <= epoch && staker.unstakeAfter != 0, "locked");
        staker.unstakeAfter = 0;
        staker.withdrawAfter = epoch.add(Constants.withdrawLockPeriod());
        emit Unstaked(stakerId);
    }

    event Withdrew(uint256 stakerId, uint256 amount);

    function withdraw (uint256 epoch) public checkEpoch(epoch) checkState(Constants.commit()) {
        uint256 stakerId = stakerIds[msg.sender];
        Structs.Staker storage staker = stakers[stakerId];
        require(staker.id != 0, "staker doesnt exist");
        require(staker.epochLastRevealed == epoch.sub(1), "Didnt reveal in last epoch");
        require(staker.unstakeAfter == 0, "Did not unstake");
        require((staker.withdrawAfter <= epoch) && staker.withdrawAfter != 0, "Withdraw epoch not reached");
        require(commitments[epoch][stakerId] == 0x0, "already commited this epoch. Cant withdraw");
        givePenalties(staker, epoch);
        require(staker.stake > 0, "Nonpositive Stake");
        // SimpleToken sch = SimpleToken(schAddress);
        // totalStake = totalStake.sub(stakers[stakerId].stake);
        stakers[stakerId].stake = 0;
        emit Withdrew(stakerId, stakers[stakerId].stake);
        require(sch.transfer(msg.sender, stakers[stakerId].stake), "couldnt transfer");
    }

    // internal functions vvvvvvvv
    //gives penalties for:
    // 2. not committing
    // 3. not revealing
    // 1. giving vting outside consensus
    //executed in state 0
    function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue) public pure returns(uint256) {
        if (epochs < 2) {
            return(stakeValue);
        }
        uint256 penalty = (epochs.sub(1)).mul((stakeValue.mul(Constants.penaltyNotRevealNum())).div(
        Constants.penaltyNotRevealDenom()));
        if (penalty < stakeValue) {
            return(stakeValue.sub(penalty));
        } else {
            return(0);
        }
    }

    // todo reduce complexity
    function givePenalties (Structs.Staker storage thisStaker, uint256 epoch) internal returns(uint256) {
        uint256 epochLastRevealed = thisStaker.epochLastRevealed;
        if (epoch > 1 && epochLastRevealed > 0) {
            uint256 epochLastActive = thisStaker.epochStaked < thisStaker.epochLastRevealed ?
                                    thisStaker.epochLastRevealed :
                                    thisStaker.epochStaked;
            // penalize or reward if last active more than epoch - 1
            uint256 penalizeEpochs = epoch.sub(epochLastActive);
            uint256 previousStake = thisStaker.stake;
            thisStaker.stake = calculateInactivityPenalties(penalizeEpochs, previousStake);
            // return(0);

            uint256[] memory mediansLastEpoch = blocks[epochLastRevealed].medians;
            if (mediansLastEpoch.length > 0) {

                uint256 y;
                for (uint256 i = 0; i < mediansLastEpoch.length; i++) {
                    uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id][i].value;
                    uint256 medianLastEpoch = mediansLastEpoch[i];

                    if (voteLastEpoch > (medianLastEpoch.mul(2))) {
                        thisStaker.stake = 0;
                        rewardPool = rewardPool.add(previousStake);
                        return(0);
                    } else if (voteLastEpoch > 0 &&
                        (voteLastEpoch < (medianLastEpoch.mul(Constants.safetyMarginLower())).div(100) ||
                        voteLastEpoch > (medianLastEpoch.mul(uint256(200).sub(
                                        Constants.safetyMarginLower()))).div(100))) {

                        if (medianLastEpoch > voteLastEpoch) {
                            y = y + (100 * (medianLastEpoch - voteLastEpoch))/medianLastEpoch;
                        } else {
                            y = y + (100 * (voteLastEpoch - medianLastEpoch))/medianLastEpoch;
                        }
                    }
                }

                if (y > 0) {
                    thisStaker.stake = previousStake.sub(((y - 1).mul(previousStake)).div(100*mediansLastEpoch.length));
                // thisStaker.stake = previousStake.sub(((y.sub(1)).mul(previousStake)).div(10000));

                    rewardPool = rewardPool.add(previousStake.sub(thisStaker.stake));
                    return(y);
                } else {
                //no penalty. only reward??
                    stakeGettingReward = stakeGettingReward.add(previousStake);//*(1 - y);
                }
            }
        }
    }

    function slash (uint256 id, address bountyHunter) internal {
        // SimpleToken sch = SimpleToken(schAddress);
        uint256 halfStake = stakers[id].stake.div(2);
        stakers[id].stake = 0;
        if (halfStake > 1) {
            // totalStake = totalStake.sub(halfStake);
            require(sch.transfer(bountyHunter, halfStake), "failed to transfer bounty");
        }
    }
    // function stakeTransfer(uint256 fromId, address to, uint256 amount) internal{
    //     // uint256 fromId = stakerIds[from];
    //     require(fromId!=0);
    //     require(stakers[fromId].stake >= amount);
    //     uint256 toId = stakerIds[to];
    //     stakers[fromId].stake = stakers[fromId].stake - amount;
    //     if (toId == 0) {
    //         numStakers = numStakers + 1;
    //         stakers[numStakers] = Structs.Staker(numStakers, amount, 0, 0, 0);
    //         stakerIds[to] = numStakers;
    //     } else {
    //         stakers[toId].stake = stakers[toId].stake + amount;
    //     }
    // }

}
