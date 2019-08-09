pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "../SimpleToken.sol";
import "./Utils.sol";
import "./BlockManager.sol";
// import "./Blocks.sol";
import "./VoteManager.sol";
// import "../lib/Random.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../lib/Structs.sol";


contract StakeManager is Utils, BlockManager, VoteManager {
    using SafeMath for uint256;

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
