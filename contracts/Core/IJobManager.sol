pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
// import "../SimpleToken.sol";
// import "./Utils.sol";
// import "./BlockStorage.sol";
// import "./IStakeManager.sol";
// import "./IStateManager.sol";
// import "./IVoteManager.sol";
// import "./JobStorage.sol";
// import "openzeppelin-solidity/contracts/math/SafeMath.sol";
// import "./WriterRole.sol";


interface IJobManager {

    function createJob (string calldata url, string calldata selector, bool repeat) external;
    function fulfillJob(uint256 jobId, uint256 value) external;
    function getResult(uint256 id) external view returns(uint256);
    function getJob(uint256 id) external view returns(string memory url, string memory selector, bool repeat, uint256 result);
}
