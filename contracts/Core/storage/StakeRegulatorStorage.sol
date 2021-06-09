// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../lib/Structs.sol";

contract StakeRegulatorStorage {
    uint256 public blockReward;
    uint256 public rewardPool;
    uint256 public stakeGettingReward;
}
