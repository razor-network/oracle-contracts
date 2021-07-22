// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./interface/IBlockManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IVoteManager.sol";
import "./storage/RewardStorage.sol";
import "../Initializable.sol";
import "./ACL.sol";

/// @title StakeManager
/// @notice StakeManager handles stake, unstake, withdraw, reward, functions
/// for stakers

contract RewardManager is Initializable, ACL, RewardStorage {
    IParameters public parameters;
    IStakeManager public stakeManager;
    IVoteManager public voteManager;
    IBlockManager public blockManager;

    modifier checkEpoch(uint256 epoch) {
        require(epoch == parameters.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState(uint256 state) {
        require(state == parameters.getState(), "incorrect state");
        _;
    }

    constructor(uint256 _blockReward) {
        blockReward = _blockReward;
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

    function updateBlockReward(uint256 _blockReward)
        external
        onlyRole(parameters.getDefaultAdminHash())
    {
        blockReward = _blockReward;
    }

    /// @notice gives penalty to stakers for failing to reveal or
    /// reveal value deviations
    /// @param stakerId The id of staker currently in consideration
    /// @param epoch the epoch value
    /// todo reduce complexity
    function givePenalties(uint256 stakerId, uint256 epoch)
        external
        initialized
        onlyRole(parameters.getRewardModifierHash())
    {
        _givePenalties(stakerId, epoch);
    }

    /// @notice The function gives block reward for one valid proposer in the
    /// previous epoch by increasing stake of staker
    /// called from confirmBlock function of BlockManager contract
    /// @param stakerId The ID of the staker
    function giveBlockReward(uint256 stakerId, uint256 epoch)
        external
        onlyRole(parameters.getRewardModifierHash())
    {
        if (blockReward > 0) {
            uint256 newStake =
                stakeManager.getStaker(stakerId).stake + (blockReward);
            stakeManager.setStakerStake(
                stakerId,
                newStake,
                "Block Reward",
                epoch
            );
        }
    }

    /// @notice The function is used by the Votemanager reveal function
    /// to penalise the staker who lost his secret and make his stake less by "slashPenaltyAmount" and
    /// transfer to bounty hunter half the "slashPenaltyAmount" of the staker
    /// @param id The ID of the staker who is penalised
    /// @param bountyHunter The address of the bounty hunter
    function slash(
        uint256 id,
        address bountyHunter,
        uint256 epoch
    ) external onlyRole(parameters.getRewardModifierHash()) {
        uint256 slashPenaltyAmount = (stakeManager.getStaker(id).stake*parameters.slashPenaltyNum())
        /parameters.slashPenaltyDenom();
        uint256 stake =  stakeManager.getStaker(id).stake - slashPenaltyAmount;
        uint256 bountyReward = slashPenaltyAmount/2;
        stakeManager.setStakerStake(id, stake, "Slashed", epoch);
        stakeManager.transferBounty(bountyHunter, bountyReward);
    }

    /// @notice Calculates the inactivity penalties of the staker
    /// @param epochs The difference of epochs where the staker was inactive
    /// @param stakeValue The Stake that staker had in last epoch
    function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue)
        public
        view
        returns (uint256)
    {
        //If no of inactive epochs falls under grace period, do not penalise.
        if (epochs <= parameters.gracePeriod()) {
            return (stakeValue);
        }

        uint256 penalty =
            ((epochs) * (stakeValue * (parameters.penaltyNotRevealNum()))) /
                parameters.penaltyNotRevealDenom();
        if (penalty < stakeValue) {
            return (stakeValue - (penalty));
        } else {
            return (0);
        }
    }

    /// @notice The function gives out penalties to stakers during commit.
    /// The penalties are given for inactivity, failing to reveal
    /// , deviation from the median value of particular asset
    /// @param stakerId The staker id
    /// @param epoch The Epoch value in consideration
    function _giveInactivityPenalties(uint256 stakerId, uint256 epoch)
        internal
    {
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);

        uint256 epochLastActive =
            thisStaker.epochStaked < thisStaker.epochLastRevealed
                ? thisStaker.epochLastRevealed
                : thisStaker.epochStaked;
        // penalize or reward if last active more than epoch - 1
        uint256 inactiveEpochs =
            (epoch - epochLastActive == 0) ? 0 : epoch - epochLastActive - 1;
        uint256 previousStake = thisStaker.stake;
        // uint256 currentStake = previousStake;
        uint256 currentStake =
            calculateInactivityPenalties(inactiveEpochs, previousStake);
        if (currentStake < previousStake) {
            stakeManager.setStakerStake(
                thisStaker.id,
                currentStake,
                "Inactivity Penalty",
                epoch
            );
        }
    }

    function _givePenalties(uint256 stakerId, uint256 epoch) internal {
        _giveInactivityPenalties(stakerId, epoch);
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);
        uint256 previousAge = thisStaker.age;
        uint256 epochLastRevealed = thisStaker.epochLastRevealed;

        Structs.Block memory _block = blockManager.getBlock(epochLastRevealed);

        uint256[] memory mediansLastEpoch = _block.medians;

        if (mediansLastEpoch.length > 0) {
            uint256 penalty = 0;
            for (uint256 i = 0; i < mediansLastEpoch.length; i++) {
                uint256 voteLastEpoch =
                    voteManager
                        .getVote(epochLastRevealed, thisStaker.id, i)
                        .value;
                uint256 medianLastEpoch = mediansLastEpoch[i];

                if (voteLastEpoch > medianLastEpoch) {
                    penalty = penalty +
                    (previousAge * (voteLastEpoch - medianLastEpoch)**2)
                    /medianLastEpoch**2;
                } else {
                    penalty = penalty +
                    (previousAge*(medianLastEpoch - voteLastEpoch)**2)
                    /medianLastEpoch**2;
                }
            }

            uint256 newAge = (previousAge + 10000 - (penalty));
            newAge = newAge > parameters.getMaxAge() ?
            parameters.getMaxAge() :
            newAge;

            stakeManager.setStakerAge(
                thisStaker.id,
                newAge,
                epoch
            );
        }

    }
}
