// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.11;
import "../lib/Structs.sol";


contract StakeStorage {

    // Constants public constants;
    mapping (address => uint256) public stakerIds;
    mapping (uint256 => Structs.Staker) public stakers;
    uint256 public numStakers = 0;
    // SchellingCoin public sch;
    uint256 public rewardPool = 0;
    uint256 public stakeGettingReward = 0;

       // uint256 public totalStake = 0;
}
