pragma solidity ^0.8.0;
import "../lib/Structs.sol";

contract StakeStorage {

    uint256 public blockReward;
    // Constants public constants;
    mapping(address => uint256) public stakerIds;
    mapping(uint256 => Structs.Staker) public stakers;
    uint256 public numStakers = 0;
    // SchellingCoin public sch;
    uint256 public rewardPool = 0;
    uint256 public stakeGettingReward = 0;
}
