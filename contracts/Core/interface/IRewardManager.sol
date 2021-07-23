// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IRewardManager {

    function givePenalties (uint256 stakerId, uint256 epoch) external;
    function giveBlockReward(uint256 stakerId, uint256 epoch) external;
    function giveRewards (uint256 stakerId, uint256 epoch) external;
    function incrementRewardPool(uint256 penalty) external;
    function getRewardPool() external view returns(uint256);
    function getStakeGettingReward() external view returns(uint256);
}
