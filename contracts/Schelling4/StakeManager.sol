pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "../SimpleToken.sol";
import "./Utils.sol";
import "./WriterRole.sol";
import "./StakeStorage.sol";
import "./IStateManager.sol";
import "./IBlockManager.sol";
import "./IVoteManager.sol";
import "../lib/Constants.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title StakeManager
/// @notice StakeManager handles stake, unstake, withdraw, reward, functions
/// for stakers

contract StakeManager is Utils, WriterRole, StakeStorage {
    using SafeMath for uint256;
    SimpleToken public sch;
    IVoteManager public voteManager;
    IBlockManager public blockManager;
    IStateManager public stateManager;

    modifier checkEpoch (uint256 epoch) {
        require(epoch == stateManager.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == stateManager.getState(), "incorrect state");
        _;
    }

    /// @param _schAddress The address of the Schelling token ERC20 contract
    /// @param _voteManagerAddress The address of the VoteManager contract
    /// @param _blockManagerAddress The address of the BlockManager contract
    /// @param _stateManagerAddress The address of the StateManager contract
    /// todo disable after init
    function init (address _schAddress, address _voteManagerAddress,
        address _blockManagerAddress, address _stateManagerAddress) external {
        sch = SimpleToken(_schAddress);
        voteManager = IVoteManager(_voteManagerAddress);
        blockManager = IBlockManager(_blockManagerAddress);
        stateManager = IStateManager(_stateManagerAddress);
    }

    /// @param _id The ID of the staker
    /// @param _stake The amount of schelling tokens that staker stakes
    function setStakerStake(uint256 _id, uint256 _stake) external onlyWriter {
        _setStakerStake(_id, _stake);
    }

    /// @param _id The ID of the staker
    /// @param _epochLastRevealed The number of epoch that staker revealed asset values
    function setStakerEpochLastRevealed(uint256 _id, uint256 _epochLastRevealed) external onlyWriter {
        stakers[_id].epochLastRevealed = _epochLastRevealed;
    }

    /// @param stakerId The ID of the staker
    function updateCommitmentEpoch(uint256 stakerId) external onlyWriter {
        stakers[stakerId].epochLastCommitted = stateManager.getEpoch();
    }

    event Staked(uint256 epoch, uint256 stakerId, uint256 amount, uint256 timestamp);

    /// @notice stake during commit state only
    /// we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    /// @param epoch The Epoch value for which staker is requesting to stake
    /// @param amount The amount of schelling tokens Staker stakes
    function stake (uint256 epoch, uint256 amount) external checkEpoch(epoch) checkState(Constants.commit()) {
        // not allowed during reveal period
        require(stateManager.getState() != Constants.reveal(), "Incorrect state");
        require(amount >= Constants.minStake(), "staked amount is less than minimum stake required");
        require(sch.transferFrom(msg.sender, address(this), amount), "sch transfer failed");
        uint256 stakerId = stakerIds[msg.sender];
        if (stakerId == 0) {
            numStakers = numStakers.add(1);
            stakers[numStakers] = Structs.Staker(numStakers, msg.sender, amount, epoch, 0, 0,
            epoch.add(Constants.unstakeLockPeriod()), 0);
            stakerId = numStakers;
            stakerIds[msg.sender] = stakerId;
        } else {
            require(stakers[stakerId].stake > 0,
                    "adding stake is not possible after withdrawal/slash. Please use a new address");
            stakers[stakerId].stake = stakers[stakerId].stake.add(amount);
        }
        // totalStake = totalStake.add(amount);
        emit Staked(epoch, stakerId, amount, now);
    }

    event Unstaked(uint256 epoch, uint256 stakerId, uint256 amount, uint256 timestamp);

    /// @notice staker must call unstake() and continue voting for Constants.WITHDRAW_LOCK_PERIOD
    /// after which she can call withdraw() to finally Withdraw
    /// @param epoch The Epoch value for which staker is requesting to unstake
    function unstake (uint256 epoch) external checkEpoch(epoch)  checkState(Constants.commit()) {
        uint256 stakerId = stakerIds[msg.sender];
        Structs.Staker storage staker = stakers[stakerId];
        require(staker.id != 0, "staker.id = 0");
        require(staker.stake > 0, "Nonpositive stake");
        require(staker.unstakeAfter <= epoch && staker.unstakeAfter != 0, "locked");
        staker.unstakeAfter = 0;
        staker.withdrawAfter = epoch.add(Constants.withdrawLockPeriod());
        emit Unstaked(epoch, stakerId, staker.stake, now);
    }

    event Withdrew(uint256 epoch, uint256 stakerId, uint256 amount, uint256 timestamp);

    /// @notice Helps stakers withdraw their stake if previously unstaked
    /// @param epoch The Epoch value for which staker is requesting a withdraw
    function withdraw (uint256 epoch) external checkEpoch(epoch) checkState(Constants.commit()) {
        uint256 stakerId = stakerIds[msg.sender];
        Structs.Staker storage staker = stakers[stakerId];
        require(staker.id != 0, "staker doesnt exist");
        require(staker.epochLastRevealed == epoch.sub(1), "Didnt reveal in last epoch");
        require(staker.unstakeAfter == 0, "Did not unstake");
        require((staker.withdrawAfter <= epoch) && staker.withdrawAfter != 0, "Withdraw epoch not reached");
        require(voteManager.getCommitment(epoch, stakerId) == 0x0, "already commited this epoch. Cant withdraw");
        _givePenalties(staker, epoch);
        require(staker.stake > 0, "Nonpositive Stake");
        // SimpleToken sch = SimpleToken(schAddress);
        // totalStake = totalStake.sub(stakers[stakerId].stake);
        uint256 toTransfer = stakers[stakerId].stake;
        stakers[stakerId].stake = 0;
        emit Withdrew(epoch, stakerId, stakers[stakerId].stake, now);
        require(sch.transfer(msg.sender, toTransfer), "couldnt transfer");
    }

    /// @notice gives penalty to stakers for failing to reveal or
    /// reveal value deviations
    /// @param thisStaker The information of staker currently in consideration
    /// @param epoch the epoch value
    /// todo reduce complexity
    function givePenalties (Structs.Staker calldata thisStaker, uint256 epoch) external onlyWriter {
        _givePenalties(thisStaker, epoch);
    }

    /// @notice The function gives block reward for one valid proposer in the
    /// previous epoch by minting new tokens from the schelling token contract
    /// called from confirmBlock function of BlockManager contract
    /// @param stakerId The ID of the staker
    function giveBlockReward(uint256 stakerId) external onlyWriter {
        if (Constants.blockReward() > 0) {
            stakers[stakerId].stake = stakers[stakerId].stake.add(Constants.blockReward());
            // stakers[proposerId].stake = stakers[proposerId].stake.add(Constants.blockReward());
            // totalStake = totalStake.add(Constants.blockReward());
            require(sch.mint(address(this), Constants.blockReward()));
        }
    }

    /// @notice This function is called in VoteManager reveal function to give
    /// rewards to all the stakers who have correctly staked, committed, revealed
    /// the Values of assets according to the razor protocol rules.
    /// @param thisStaker The staker struct with staker info
    /// @param epoch The epoch number for which reveal has been called
    function giveRewards (Structs.Staker calldata thisStaker, uint256 epoch) external onlyWriter {
        if (epoch > 1 && stakeGettingReward > 0) {
            uint256 epochLastRevealed = thisStaker.epochLastRevealed;
            uint256[] memory mediansLastEpoch = blockManager.getBlockMedians(epochLastRevealed);
            // require(mediansLastEpoch.length > 0);
            if (mediansLastEpoch.length > 0) {
                //epoch->stakerid->assetid->vote
                // mapping (uint256 => mapping (uint256 =>  mapping (uint256 => Structs.Vote))) public votes;
                uint256 rewardable = 0;
                for (uint256 i = 0; i < mediansLastEpoch.length; i++) {
                    uint256 voteLastEpoch = voteManager.getVote(epochLastRevealed, thisStaker.id, i).value;
                    uint256 medianLastEpoch = mediansLastEpoch[i];

                    //give rewards if voted in zone
                    if ((voteLastEpoch * 100 >= (Constants.safetyMarginLower() * medianLastEpoch) ||
                        (voteLastEpoch * 100 <= ((200-Constants.safetyMarginLower()) * medianLastEpoch)))) {
                        rewardable = rewardable + 1;
                    }
                }
                // emit DebugUint256(rewardable);
                // emit DebugUint256(rewardPool);
                uint256 newStake = thisStaker.stake + (thisStaker.stake*rewardPool*rewardable)/
                (stakeGettingReward*mediansLastEpoch.length);
                _setStakerStake(thisStaker.id, newStake);
            }
        }
    }

    /// @notice The function is used by the Votemanager reveal function
    /// to penalise the staker who lost his secret and make his stake zero and
    /// transfer to bounty hunter half the schelling tokens of the stakers stake
    /// @param id The ID of the staker who is penalised
    /// @param bountyHunter The address of the bounty hunter
    function slash (uint256 id, address bountyHunter) external onlyWriter {
        // SimpleToken sch = SimpleToken(schAddress);
        uint256 halfStake = stakers[id].stake.div(2);
        stakers[id].stake = 0;
        if (halfStake > 1) {
            // totalStake = totalStake.sub(halfStake);
            require(sch.transfer(bountyHunter, halfStake), "failed to transfer bounty");
        }
    }

    /// @param _address Address of the staker
    /// @return The staker ID
    function getStakerId(address _address) external view returns(uint256) {
        return(stakerIds[_address]);
    }

    /// @param _id The staker ID
    /// @return The Struct of staker information
    function getStaker(uint256 _id) external view returns(Structs.Staker memory staker) {
        return(stakers[_id]);
    }

    /// @return The number of stakers in the razor network
    function getNumStakers() external view returns(uint256) {
        return(numStakers);
    }

    /// @return The rewardpool
    function getRewardPool() external view returns(uint256) {
        return(rewardPool);
    }

    /// @return The stakeGettingReward value
    function getStakeGettingReward() external view returns(uint256) {
        return(stakeGettingReward);
    }

    /// @notice Calculates the inactivity penalties of the staker
    /// @param epochs The difference of epochs where the staker was inactive
    /// @param stakeValue The Stake that staker had in last epoch
    function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue) public pure returns(uint256) {
        if (epochs < 2) {
            return(stakeValue);
        }
        // penalty =( epochs -1)*stakeValue*penNum/penDiv
        uint256 penalty = (epochs.sub(1)).mul((stakeValue.mul(Constants.penaltyNotRevealNum())).div(
        Constants.penaltyNotRevealDenom()));
        if (penalty < stakeValue) {
            return(stakeValue.sub(penalty));
        } else {
            return(0);
        }
    }

    /// @notice internal function for setting stake of the staker
    /// called in the giveRewards function
    /// @param _id of the staker
    /// @param _stake the amount of schelling tokens staked
    function _setStakerStake(uint256 _id, uint256 _stake) internal {
        stakers[_id].stake = _stake;
    }

    /// @notice The function gives out penalties to stakers during withdraw
    /// and commit. The penalties are given for inactivity, failing to reveal
    /// even though unstaked, deviation from the median value of particular asset
    /// @param thisStaker The staker information
    /// @param epoch The Epoch value in consideration
    function _givePenalties (Structs.Staker memory thisStaker, uint256 epoch) internal {
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

            uint256[] memory mediansLastEpoch = blockManager.getBlockMedians(epochLastRevealed);
            if (mediansLastEpoch.length > 0) {

                uint256 y;
                for (uint256 i = 0; i < mediansLastEpoch.length; i++) {
                    uint256 voteLastEpoch = voteManager.getVote(epochLastRevealed, thisStaker.id, i).value;
                    uint256 medianLastEpoch = mediansLastEpoch[i];

                    if (voteLastEpoch > (medianLastEpoch.mul(2))) {
                        thisStaker.stake = 0;
                        rewardPool = rewardPool.add(previousStake);
                        // return(0);
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
                    // return(y);
                } else {
                //no penalty. only reward??
                    stakeGettingReward = stakeGettingReward.add(previousStake);//*(1 - y);
                }
            }
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
