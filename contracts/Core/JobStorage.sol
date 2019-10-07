pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
// import "../SimpleToken.sol";
// import "./Utils.sol";
// import "./IStakeManager.sol";
// import "./IStateManager.sol";
// import "./IVoteManager.sol";
import "../lib/Structs.sol";


contract JobStorage {
    mapping (uint256 => Structs.Job) public jobs;
    uint256 public numJobs;
}
