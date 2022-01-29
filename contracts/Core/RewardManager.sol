// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IBlockManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IVoteManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/ICollectionManager.sol";
import "../Initializable.sol";
import "./storage/Constants.sol";
import "./parameters/child/RewardManagerParams.sol";

/// @title StakeManager
/// @notice StakeManager handles stake, unstake, withdraw, reward, functions
/// for stakers
contract RewardManager is Initializable, Constants, RewardManagerParams, IRewardManager {
    IStakeManager public stakeManager;
    IVoteManager public voteManager;
    IBlockManager public blockManager;
    ICollectionManager public collectionManager;

    /// @param stakeManagerAddress The address of the VoteManager contract
    /// @param voteManagersAddress The address of the VoteManager contract
    /// @param blockManagerAddress The address of the BlockManager contract
    function initialize(
        address stakeManagerAddress,
        address voteManagersAddress,
        address blockManagerAddress,
        address collectionManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        voteManager = IVoteManager(voteManagersAddress);
        blockManager = IBlockManager(blockManagerAddress);
        collectionManager = ICollectionManager(collectionManagerAddress);
    }

    /// @notice gives penalty to stakers for failing to reveal or
    /// reveal value deviations
    /// @param stakerId The id of staker currently in consideration
    /// @param epoch the epoch value
    /// todo reduce complexity
    function givePenalties(uint32 epoch, uint32 stakerId) external override initialized onlyRole(REWARD_MODIFIER_ROLE) {
        _givePenalties(epoch, stakerId);
    }

    /// @notice The function gives block reward for one valid proposer in the
    /// previous epoch by increasing stake of staker
    /// called from confirmBlock function of BlockManager contract
    /// @param stakerId The ID of the staker
    function giveBlockReward(uint32 stakerId, uint32 epoch) external override onlyRole(REWARD_MODIFIER_ROLE) {
        uint256 prevStake = stakeManager.getStake(stakerId);
        stakeManager.setStakerStake(epoch, stakerId, StakeChanged.BlockReward, prevStake, prevStake + blockReward);
    }

    function giveInactivityPenalties(uint32 epoch, uint32 stakerId) external override onlyRole(REWARD_MODIFIER_ROLE) {
        _giveInactivityPenalties(epoch, stakerId);
    }

    /// @notice The function gives out penalties to stakers during commit.
    /// The penalties are given for inactivity, failing to reveal
    /// , deviation from the median value of particular asset
    /// @param stakerId The staker id
    /// @param epoch The Epoch value in consideration
    function _giveInactivityPenalties(uint32 epoch, uint32 stakerId) internal {
        uint32 epochLastRevealed = voteManager.getEpochLastRevealed(stakerId);
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);
        uint32 epochLastActive = thisStaker.epochFirstStakedOrLastPenalized < epochLastRevealed
            ? epochLastRevealed
            : thisStaker.epochFirstStakedOrLastPenalized;

        // penalize or reward if last active more than epoch - 1
        uint32 inactiveEpochs = (epoch - epochLastActive == 0) ? 0 : epoch - epochLastActive - 1;

        uint256 previousStake = thisStaker.stake;
        uint256 newStake = thisStaker.stake;
        uint32 previousAge = thisStaker.age;
        uint32 newAge = thisStaker.age;

        if (inactiveEpochs > gracePeriod) {
            (newStake, newAge) = _calculateInactivityPenalties(inactiveEpochs, newStake, previousAge);
        }
        // uint256 currentStake = previousStake;
        if (newStake < previousStake) {
            stakeManager.setStakerEpochFirstStakedOrLastPenalized(epoch, stakerId);
            stakeManager.setStakerStake(epoch, stakerId, StakeChanged.InactivityPenalty, previousStake, newStake);
        }
        if (newAge < previousAge) {
            stakeManager.setStakerAge(epoch, stakerId, newAge, AgeChanged.InactivityPenalty);
        }
    }

    function _givePenalties(uint32 epoch, uint32 stakerId) internal {
        _giveInactivityPenalties(epoch, stakerId);
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);
        uint32 epochLastRevealed = voteManager.getEpochLastRevealed(stakerId);
        if (epochLastRevealed != 0 && epochLastRevealed < epoch - 1) {
            return;
        }
        uint64 age = thisStaker.age + 10000;
        // cap age to maxAge
        age = age > maxAge ? maxAge : age;

        Structs.Block memory _block = blockManager.getBlock(epochLastRevealed);

        uint32[] memory mediansLastEpoch = _block.medians;

        if (mediansLastEpoch.length == 0) return;
        uint64 penalty = 0;
        for (uint16 i = 0; i < mediansLastEpoch.length; i++) {
            // slither-disable-next-line calls-loop
            uint64 voteValueLastEpoch = voteManager.getVoteValue(epoch - 1, stakerId, i);

            if (
                voteValueLastEpoch != 0
            ) // Only penalise if given asset revealed, please note here again revealed value of asset cant be zero
            {
                // uint32 voteWeightLastEpoch = voteManager.getVoteWeight(thisStaker.id, i);
                uint32 medianLastEpoch = mediansLastEpoch[i];
                if (medianLastEpoch == 0) continue;
                uint64 prod = age * voteValueLastEpoch;
                // slither-disable-next-line calls-loop
                uint16 tolerance = collectionManager.getCollectionTolerance(i);
                tolerance = tolerance <= maxTolerance ? tolerance : maxTolerance;
                uint64 maxVoteTolerance = medianLastEpoch + ((medianLastEpoch * tolerance) / BASE_DENOMINATOR);
                uint64 minVoteTolerance = medianLastEpoch - ((medianLastEpoch * tolerance) / BASE_DENOMINATOR);
                // if (voteWeightLastEpoch > 0) {
                if (voteValueLastEpoch > maxVoteTolerance) {
                    penalty = penalty + (prod / maxVoteTolerance - age);
                } else if (voteValueLastEpoch < minVoteTolerance) {
                    penalty = penalty + (age - prod / minVoteTolerance);
                }
            }
        }

        age = penalty > age ? 0 : age - uint32(penalty);

        stakeManager.setStakerAge(epoch, thisStaker.id, uint32(age), AgeChanged.VotingRewardOrPenalty);
    }

    /// @notice Calculates the stake and age inactivity penalties of the staker
    /// @param epochs The difference of epochs where the staker was inactive
    /// @param stakeValue The Stake that staker had in last epoch
    function _calculateInactivityPenalties(
        uint32 epochs,
        uint256 stakeValue,
        uint32 ageValue
    ) internal view returns (uint256, uint32) {
        uint256 penalty = ((epochs) * (stakeValue * penaltyNotRevealNum)) / BASE_DENOMINATOR;
        uint256 newStake = penalty < stakeValue ? stakeValue - penalty : 0;
        uint32 penaltyAge = epochs * 10000;
        uint32 newAge = penaltyAge < ageValue ? ageValue - penaltyAge : 0;
        return (newStake, newAge);
    }
}
