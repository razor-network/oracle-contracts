pragma solidity 0.5.10;
import "../lib/Structs.sol";


contract StakeStorage {

    // Constants public constants;
    mapping (address => uint256) public stakerIds;
    mapping (uint256 => Structs.Staker) public stakers;
    uint256 public numStakers = 0;
    // SimpleToken public sch;
    uint256 public rewardPool = 0;
    uint256 public stakeGettingReward = 0;

       // uint256 public totalStake = 0;
}
