// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IRewardManager {
    /**
     * @notice gives penalty to stakers for failing to reveal or
     * reveal value deviations
     * @param stakerId The id of staker currently in consideration
     * @param epoch the epoch value
     */
    function givePenalties(uint32 epoch, uint32 stakerId) external;

    /**
     * @notice The function gives block reward for one valid proposer in the
     * previous epoch by increasing stake of staker
     * called from confirmBlock function of BlockManager contract. Commission
     * from the delegator's pool is given out to the staker from the block reward
     * @param stakerId The ID of the staker
     */
    function giveBlockReward(uint32 epoch, uint32 stakerId) external;

    /**
     * @notice The function gives out penalties to stakers during commit.
     * The penalties are given for inactivity, failing to reveal
     * , deviation from the median value of particular asset
     * @param stakerId The staker id
     * @param epoch The Epoch value in consideration
     */
    function giveInactivityPenalties(uint32 epoch, uint32 stakerId) external;
}
