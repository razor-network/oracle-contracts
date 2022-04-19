// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";
import "../storage/Constants.sol";

interface IStakeManager {
    /**
     * @notice External function for setting stake of the staker
     * Used by RewardManager
     * @param _epoch The epoch in which stake changes
     * @param _id of the staker
     * @param reason the reason for stake to change
     * @param prevStake previous stake of the staker
     * @param _stake updated stake of the staker
     */
    function setStakerStake(
        uint32 _epoch,
        uint32 _id,
        Constants.StakeChanged reason,
        uint256 prevStake,
        uint256 _stake
    ) external;

    /**
     * @notice The function is used by the Votemanager reveal function and BlockManager FinalizeDispute
     * to penalise the staker who lost his secret or who got disputed and make his stake less by "slashPenaltyAmount" and
     * transfer to bounty hunter half the "slashPenaltyAmount" of the staker
     * @param epoch The epoch in which staker is slashed
     * @param stakerId The ID of the staker who is penalised
     * @param bountyHunter The address of the bounty hunter
     */
    function slash(
        uint32 epoch,
        uint32 stakerId,
        address bountyHunter
    ) external;

    /**
     * @notice External function for setting age of the staker
     * Used by RewardManager
     * @param _epoch The epoch in which age changes
     * @param _id of the staker
     * @param _age the updated new age
     * @param reason the reason for age change
     */
    function setStakerAge(
        uint32 _epoch,
        uint32 _id,
        uint32 _age,
        Constants.AgeChanged reason
    ) external;

    /**
     * @notice External function for setting stakerReward of the staker
     * Used by RewardManager
     * @param _epoch The epoch in which stakerReward changes
     * @param _id of the staker
     * @param reason the reason for stakerReward to change
     * @param prevStakerReward previous stakerReward of the staker
     * @param _stakerReward updated stakerReward of the staker
     */
    function setStakerReward(
        uint32 _epoch,
        uint32 _id,
        Constants.StakerRewardChanged reason,
        uint256 prevStakerReward,
        uint256 _stakerReward
    ) external;

    /**
     * @notice External function for setting epochFirstStakedOrLastPenalized of the staker
     * Used by RewardManager
     * @param _epoch The epoch in which staker first staked or was last penalized
     * @param _id of the staker
     */
    function setStakerEpochFirstStakedOrLastPenalized(uint32 _epoch, uint32 _id) external;

    /**
     * @notice remove all funds in case of emergency
     */
    function escape(address _address) external;

    /**
     * @notice event being thrown after every successful sRZR transfer taking place
     * @param from sender
     * @param to recepient
     * @param amount srzr amount being transferred
     * @param stakerId the id of the staker whose sRZR is involved in the transfer
     */
    function srzrTransfer(
        address from,
        address to,
        uint256 amount,
        uint32 stakerId
    ) external;

    /**
     * @param _address Address of the staker
     * @return The staker ID
     */
    function getStakerId(address _address) external view returns (uint32);

    /**
     * @param _id The staker ID
     * @return staker The Struct of staker information
     */
    function getStaker(uint32 _id) external view returns (Structs.Staker memory staker);

    /**
     * @return The number of stakers in the razor network
     */
    function getNumStakers() external view returns (uint32);

    /**
     * @param stakerId ID of the staker
     * @return influence of staker
     */
    function getInfluence(uint32 stakerId) external view returns (uint256);

    /**
     * @param stakerId ID of the staker
     * @return stake of staker
     */
    function getStake(uint32 stakerId) external view returns (uint256);

    /**
     * @param stakerId ID of the staker
     * @return epochFirstStakedOrLastPenalized of staker
     */
    function getEpochFirstStakedOrLastPenalized(uint32 stakerId) external view returns (uint32);

    /**
     * @return length of maturities array
     */
    function maturitiesLength() external view returns (uint32);
}
