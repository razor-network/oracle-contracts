// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "../../lib/Structs.sol";

contract StakeStorage {

    uint256 public blockReward;
    uint256 public numStakers;
    uint256 public rewardPool;
    uint256 public stakeGettingReward;

    mapping (address => uint256) public stakerIds;
    mapping (uint256 => Structs.Staker) public stakers;
}
