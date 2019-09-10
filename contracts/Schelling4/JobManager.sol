pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
// import "../SimpleToken.sol";
// import "./Utils.sol";
// import "./BlockStorage.sol";
// import "./IStakeManager.sol";
// import "./IStateManager.sol";
// import "./IVoteManager.sol";
import "./JobStorage.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./WriterRole.sol";


contract JobManager is WriterRole, JobStorage {
    event JobFulfilled(uint256 numJobs, string url, string selector, bool repeat,
                        address creator, uint256 credit, bool fulfulled);

    function createJob (string calldata url, string calldata selector, bool repeat) external payable {
        numJobs = numJobs + 1;
        Structs.Job memory job = Structs.Job(numJobs, url, selector, repeat, msg.sender, msg.value, false);
        jobs[numJobs] = job;
        // jobs.push(job);
    }

    function fulfillJob(uint256 jobId) external onlyWriter {
        Structs.Job storage job = jobs[jobId];
        job.fulfilled = true;
        emit JobFulfilled(job.id, job.url, job.selector, job.repeat, job.creator, job.credit, job.fulfilled);
    }
}
