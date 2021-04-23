pragma solidity ^0.8.0;
import "./JobStorage.sol";
import "./IStateManager.sol";

import "./ACL.sol";
import "../lib/Constants.sol";

contract JobManager is ACL, JobStorage {

    event JobCreated(uint256 id, uint256 epoch, string url, string selector, string name, bool repeat,
                            address creator, uint256 credit, uint256 timestamp, uint256 assetType);
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
        numAssets++;
        uint256 epoch = stateManager.getEpoch();
        Structs.Job memory job = Structs.Job(numAssets, epoch, url, selector, name, repeat, msg.sender, msg.value, false, 0,uint256(assetTypes.Job));
        jobs[numAssets] = job;

        emit JobCreated(numAssets, epoch, url, selector, name, repeat, msg.sender, msg.value, block.timestamp, uint256(assetTypes.Job));
        // jobs.push(job);
    }

    function fulfillJob(uint256 id, uint256 value) external onlyRole(Constants.getJobConfirmerHash()){
        if(jobs[id].assetType==uint256(assetTypes.Job)){
            Structs.Job storage job = jobs[id];
            uint256 epoch = stateManager.getEpoch();

            if (!job.repeat) {
                job.fulfilled = true;
                // emit JobFulfilled(job.id, epoch, job.url, job.selector,
                //job.repeat, job.creator, job.credit, job.fulfilled);
            }
            emit JobReported(job.id, value, epoch, job.url, job.selector, job.name, job.repeat,
            job.creator, job.credit, job.fulfilled, block.timestamp);
            job.result = value;
        }
        else if(collections[id].assetType==uint256(assetTypes.Collection)){

            Structs.Collection storage collection = collections[id];

            collection.result = value;

        }
    }

    function getResult(uint256 id) external view returns(uint256) {
        return jobs[id].result;
    }

    function getJob(uint256 id) external view returns(string memory url, string memory selector, string memory name, bool repeat, uint256 result) {
        Structs.Job memory job = jobs[id];
        return(job.url, job.selector, job.name, job.repeat, job.result);
    }

    function getNumJobs() external view returns(uint256) {
        return numJobs;
    }

    function createCollection(string calldata name, uint256[] memory jobIDs,uint8 aggregationMethod) external payable {
        require(aggregationMethod >= 0 && aggregationMethod < 3,"Aggregation range out of bounds");

        numCollections++;
        numAssets++;
        uint256 epoch = stateManager.getEpoch();
        collections[numAssets].id = numAssets; 
        collections[numAssets].name = name; 
        collections[numAssets].aggregationMethod = aggregationMethod; 
        collections[numAssets].epoch = epoch;
        collections[numAssets].creator = msg.sender;
        collections[numAssets].credit = msg.value;
        for(uint256 i = 0; i < jobIDs.length; i++){
            if(collections[numAssets].jobID_exist[jobIDs[i]]){
                continue;
            }
            collections[numAssets].numJobs++;
            collections[numAssets].jobIDs[collections[numAssets].numJobs] = jobIDs[i];
            collections[numAssets].jobID_exist[jobIDs[i]] = true;
        }
    }

    function addJobToCollection(uint256 collectionID, uint256 jobID) external {
        require(collections[collectionID].assetType!=uint256(assetTypes.Collection),"Collection ID not present");
        //require(jobID<=numJobs,"Job ID not present");
        require(!collections[collectionID].jobID_exist[jobID],"Job already exists in this collection");

        collections[collectionID].numJobs++;
        collections[collectionID].jobIDs[collections[collectionID].numJobs] = jobID;
        collections[collectionID].jobID_exist[jobID] = true;

    }
}
