pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
// import "../SimpleToken.sol";
// import "./Utils.sol";
// import "./BlockStorage.sol";
// import "./IStakeManager.sol";
// import "./IStateManager.sol";
// import "./IVoteManager.sol";
import "./JobStorage.sol";
import "./IStateManager.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./WriterRole.sol";


contract JobManager is WriterRole, JobStorage {

    event JobCreteted(uint256 id, uint256 epoch, string url, string selector, bool repeat,
                            address creator, uint256 credit);

    // event JobFulfilled(uint256 id, uint256 epoch, string url, string selector, bool repeat,
    //                     address creator, uint256 credit, bool fulfulled);

    event JobReported(uint256 id, uint256 value, uint256 epoch, uint256 timestamp,
                        string url, string selector, bool repeat,
                        address creator, uint256 credit, bool fulfilled);

    IStateManager public stateManager;

    //disable after init.
    function init(address _stateManagerAddress) external {
        stateManager = IStateManager(_stateManagerAddress);
    }

    function createJob (string calldata url, string calldata selector, bool repeat) external payable {
        numJobs = numJobs + 1;
        uint256 epoch = stateManager.getEpoch();
        Structs.Job memory job = Structs.Job(numJobs, epoch, url, selector, repeat, msg.sender, msg.value, false);
        jobs[numJobs] = job;
        emit JobCreteted(numJobs, epoch, url, selector, repeat, msg.sender, msg.value);
        // jobs.push(job);
    }

    function fulfillJob(uint256 jobId, uint256 value) external onlyWriter {
        Structs.Job storage job = jobs[jobId];
        uint256 epoch = stateManager.getEpoch();

        if (!job.repeat) {
            job.fulfilled = true;
            // emit JobFulfilled(job.id, epoch, job.url, job.selector,
            //job.repeat, job.creator, job.credit, job.fulfilled);
        }
        emit JobReported(job.id, value, epoch, now, job.url, job.selector, job.repeat,
        job.creator, job.credit, job.fulfilled);
    }
}
