// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./interface/IBlockManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IVoteManager.sol";
import "../Initializable.sol";
import "./ACL.sol";

/// @title StakeManager
/// @notice StakeManager handles stake, unstake, withdraw, reward, functions
/// for stakers
contract RewardManager is Initializable, ACL {
    IParameters public parameters;
    IStakeManager public stakeManager;
    IVoteManager public voteManager;
    IBlockManager public blockManager;

    modifier checkEpoch(uint32 epoch) {
        require(epoch == parameters.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState(uint256 state) {
        require(state == parameters.getState(), "incorrect state");
        _;
    }

    /// @param stakeManagerAddress The address of the VoteManager contract
    /// @param voteManagersAddress The address of the VoteManager contract
    /// @param blockManagerAddress The address of the BlockManager contract
    /// @param parametersAddress The address of the StateManager contract
    function initialize(
        address stakeManagerAddress,
        address voteManagersAddress,
        address blockManagerAddress,
        address parametersAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        voteManager = IVoteManager(voteManagersAddress);
        blockManager = IBlockManager(blockManagerAddress);
        parameters = IParameters(parametersAddress);
    }

    /// @notice gives penalty to stakers for failing to reveal or
    /// reveal value deviations
    /// @param stakerId The id of staker currently in consideration
    /// @param epoch the epoch value
    /// todo reduce complexity
    function givePenalties(uint32 stakerId, uint32 epoch) external initialized onlyRole(parameters.getRewardModifierHash()) {
        _givePenalties(stakerId, epoch);
    }

    /// @notice The function gives block reward for one valid proposer in the
    /// previous epoch by increasing stake of staker
    /// called from confirmBlock function of BlockManager contract
    /// @param stakerId The ID of the staker
    function giveBlockReward(uint32 stakerId, uint32 epoch) external onlyRole(parameters.getRewardModifierHash()) {
        uint256 blockReward = parameters.blockReward();
        if (parameters.blockReward() > 0) {
            uint256 newStake = stakeManager.getStaker(stakerId).stake + (blockReward);
            stakeManager.setStakerStake(stakerId, newStake, "Block Reward", epoch);
        }
    }

    /// @notice Calculates the stake and age inactivity penalties of the staker
    /// @param epochs The difference of epochs where the staker was inactive
    /// @param stakeValue The Stake that staker had in last epoch
    function calculateInactivityPenalties(
        uint32 epochs,
        uint256 stakeValue,
        uint256 ageValue
    ) public view returns (uint256, uint256) {
        uint256 penalty = ((epochs) * (stakeValue * (parameters.penaltyNotRevealNum()))) / parameters.penaltyNotRevealDenom();
        uint256 newStake = penalty < stakeValue ? stakeValue - penalty : 0;
        uint256 penaltyAge = epochs * 10000;
        uint256 newAge = penaltyAge < ageValue ? ageValue - penaltyAge : 0;
        return (newStake, newAge);
    }

    /// @notice The function gives out penalties to stakers during commit.
    /// The penalties are given for inactivity, failing to reveal
    /// , deviation from the median value of particular asset
    /// @param stakerId The staker id
    /// @param epoch The Epoch value in consideration
    function _giveInactivityPenalties(uint32 stakerId, uint32 epoch) internal {
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);

        uint32 epochLastRevealed = voteManager.getEpochLastRevealed(stakerId);
        uint32 epochLastActive = thisStaker.epochStaked < epochLastRevealed ? epochLastRevealed : thisStaker.epochStaked;
        // penalize or reward if last active more than epoch - 1
        uint32 inactiveEpochs = (epoch - epochLastActive == 0) ? 0 : epoch - epochLastActive - 1;

        if (inactiveEpochs <= parameters.gracePeriod()) {
            return;
        }
        uint256 previousStake = thisStaker.stake;
        uint256 newStake = thisStaker.stake;
        uint256 previousAge = thisStaker.age;
        uint256 newAge = thisStaker.age;
        uint32 epochLastCommitted = voteManager.getEpochLastCommitted(stakerId);

        // Not reveal penalty due to Randao
        if (epochLastRevealed < epochLastCommitted) {
            uint256 randaoPenalty = newStake < parameters.blockReward() ? newStake : parameters.blockReward();
            newStake = newStake - randaoPenalty;
        }
        // uint256 currentStake = previousStake;
        (newStake, newAge) = calculateInactivityPenalties(inactiveEpochs, newStake, previousAge);
        if (newStake < previousStake) {
            stakeManager.setStakerStake(thisStaker.id, newStake, "Inactivity Penalty", epoch);
        }
        if (newAge < previousAge) {
            stakeManager.setStakerAge(thisStaker.id, newAge, epoch);
        }
    }

    function _givePenalties(uint32 stakerId, uint32 epoch) internal {
        _giveInactivityPenalties(stakerId, epoch);
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);
        uint32 epochLastRevealed = voteManager.getEpochLastRevealed(stakerId);
        if (epochLastRevealed != 0 && epochLastRevealed < epoch - 1) {
            stakeManager.setStakerAge(thisStaker.id, 0, epoch);
            return;
        }
        uint256 previousAge = thisStaker.age;
        Structs.Block memory _block = blockManager.getBlock(epochLastRevealed);

        uint256[] memory mediansLastEpoch = _block.medians;

        if (mediansLastEpoch.length == 0) return;
        uint256 penalty = 0;
        for (uint8 i = 0; i < mediansLastEpoch.length; i++) {
            uint256 voteValueLastEpoch = voteManager.getVoteValue(thisStaker.id, i);
            // uint256 voteWeightLastEpoch = voteManager.getVoteWeight(thisStaker.id, i);
            uint256 medianLastEpoch = mediansLastEpoch[i];
            uint256 prod = previousAge * voteValueLastEpoch;
            // if (voteWeightLastEpoch > 0) {
            if (voteValueLastEpoch > medianLastEpoch) {
                penalty = penalty + (prod / medianLastEpoch - previousAge);
                // penalty = penalty + (previousAge * (voteValueLastEpoch - medianLastEpoch)**2) / medianLastEpoch**2;
            } else {
                penalty = penalty + (previousAge - prod / medianLastEpoch);
            }

        uint256 newAge = (previousAge + 10000 - (penalty));
        newAge = newAge > parameters.maxAge() ? parameters.maxAge() : newAge;

        stakeManager.setStakerAge(thisStaker.id, newAge, epoch);
    }
}
}
