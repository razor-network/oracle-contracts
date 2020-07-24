pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import "./JobStorage.sol";
import "./IStateManager.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./WriterRole.sol";


contract JobManager is WriterRole, JobStorage {

    event JobCreated(uint256 id, uint256 epoch, string url, string selector, string name, bool repeat,
                            address creator, uint256 credit, uint256 timestamp);
    // event JobFulfilled(uint256 id, uint256 epoch, string url, string selector, bool repeat,
    //                     address creator, uint256 credit, bool fulfulled);

    event JobReported(uint256 id, uint256 value, uint256 epoch,
                        string url, string selector, string name, bool repeat,
                        address creator, uint256 credit, bool fulfilled, uint256 timestamp);

    IStateManager public stateManager;

    //disable after init.
    function init(address _stateManagerAddress) external {
        stateManager = IStateManager(_stateManagerAddress);
    }

    function createJob (string calldata url, string calldata selector, string calldata name, bool repeat) external payable {
        numJobs = numJobs + 1;
        uint256 epoch = stateManager.getEpoch();
        Structs.Job memory job = Structs.Job(numJobs, epoch, url, selector, name, repeat, msg.sender, msg.value, false, 0);
        jobs[numJobs] = job;
        emit JobCreated(numJobs, epoch, url, selector, name, repeat, msg.sender, msg.value, now);
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
        emit JobReported(job.id, value, epoch, job.url, job.selector, job.name, job.repeat,
        job.creator, job.credit, job.fulfilled, now);
        job.result = value;
    }

    function getResult(uint256 id) external view returns(uint256) {
        return jobs[id].result;
    }

    function getJob(uint256 id) external view returns(string memory url, string memory selector, string memory name, bool repeat, uint256 result) {
        Structs.Job memory job = jobs[id];
        return(job.url, job.selector, job.name, job.repeat, job.result);
    }
}
