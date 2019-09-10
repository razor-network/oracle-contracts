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
    event JobFulfilled(uint256 numJobs, string url, string selector, bool repeat,
                        address creator, uint256 credit, bool fulfulled);

    function createJob (string calldata url, string calldata selector, bool repeat) external;

    function fulfillJob(uint256 jobId) external;
}
