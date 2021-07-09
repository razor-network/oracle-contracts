// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./storage/AssetStorage.sol";
import "./ACL.sol";
import "./interface/IBlockManager.sol";


contract AssetManager is ACL, AssetStorage {

    IParameters public parameters;
    IBlockManager public blockManager;

    event JobCreated(
        uint256 id,
        uint256 epoch,
        string url,
        string selector,
        string name,
        bool repeat,
        address creator,
        uint256 timestamp,
        assetTypes assetType
    );

    event JobReported(
        uint256 id,
        uint256 value,
        uint256 epoch,
        string url,
        string selector,
        string name,
        bool repeat,
        address creator,
        bool active,
        uint256 timestamp
    );

    event JobUpdated(
        uint256 id,
        uint256 epoch,
        string url,
        string selector,
        uint256 timestamp
    );

    event JobActivityStatus(
        uint256 id,
        uint256 epoch,
        bool active,
        uint256 timestamp
    );

    event CollectionCreated(
        uint256 id,
        uint256 epoch,
        string name,
        uint32 aggregationMethod,
        uint256[] jobIDs,
        bool active,
        address creator,
        uint256 timestamp,
        assetTypes assetType
    );

    event CollectionReported(
        uint256 id,
        uint256 value,
        uint256 epoch,
        string name,
        uint32 aggregationMethod,
        uint256[] jobIDs,
        address creator,
        uint256 timestamp
    );

    event CollectionUpdated(
        uint256 id,
        uint256 epoch,
        string name,
        uint256[] updatedJobIDs,
        uint256 timestamp
    );

    event CollectionActivityStatus(
        uint256 id,
        uint256 epoch,
        bool active,
        uint256 timestamp
    );

    constructor(
        address parametersAddress,
        address blockManagerAddress
    ) {
       parameters = IParameters(parametersAddress);
       blockManager = IBlockManager(blockManagerAddress);
    }

    function createJob (
        string calldata url,
        string calldata selector,
        string calldata name,
        bool repeat
    ) 
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        uint256 epoch = parameters.getEpoch();
        
        numPendingJobs = numPendingJobs+1;

        Structs.Job memory job = Structs.Job(
            numPendingJobs, 
            epoch, 
            url, 
            selector, 
            name, 
            repeat, 
            true,
            msg.sender, 
            0,
            uint256(assetTypes.Job)
        );
        pendingJobs[numPendingJobs] = job;
        emit JobCreated(
            numPendingJobs, 
            epoch, 
            url, 
            selector, 
            name, 
            repeat,
            msg.sender,  
            block.timestamp, 
            assetTypes.Job
        );
    }

    function updateJob(
        uint256 jobID,
        string calldata url,
        string calldata selector
    ) 
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        require(jobs[jobID].assetType == uint256(assetTypes.Job), "Job ID not present");

        uint256 epoch = parameters.getEpoch();

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;

        emit JobUpdated(
        jobID,
        epoch,
        url,
        selector,
        block.timestamp
        );

    }

    function updateAssetStatus(
        uint256 id,
        bool isActive
    ) 
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        uint256 epoch = parameters.getEpoch();

        if(jobs[id].assetType == uint256(assetTypes.Job)){
            if(isActive){
                jobs[id].active = false;
            }
            else{
                jobs[id].active = true;
            }

            emit JobActivityStatus(
            id,
            epoch,
            jobs[id].active,
            block.timestamp
            );
        }
        else{
            if(isActive){
                collections[id].active = false;
            }
            else{
                collections[id].active = true;
            }

            emit CollectionActivityStatus(
            id,
            epoch,
            collections[id].active,
            block.timestamp
            );
            
        }
    }

    function fulfillAsset(
        uint256 id,
        uint256 value
    )
        external
        onlyRole(parameters.getAssetConfirmerHash())
    {
        uint256 epoch = parameters.getEpoch();
        if(jobs[id].assetType == uint256(assetTypes.Job)){

            Structs.Job storage job = jobs[id];

            if (!job.repeat) {
                job.active = false;
                numActiveAssets = numActiveAssets-1;
            }

            job.result = value;
            emit JobReported(
                job.id,
                value,
                epoch,
                job.url,
                job.selector,
                job.name,
                job.repeat,
                job.creator,
                job.active,
                block.timestamp
            );
        }
        else if(collections[id].assetType == uint256(assetTypes.Collection)){

            Structs.Collection storage collection = collections[id];

            collection.result = value;

            emit CollectionReported(
                collection.id,
                value,
                epoch,
                collection.name,
                collection.aggregationMethod,
                collection.jobIDs,
                collection.creator,
                block.timestamp
            );
        }
    }

    function createCollection(
        string calldata name,
        uint256[] memory jobIDs,
        uint32 aggregationMethod
    ) 
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        require(aggregationMethod > 0 && aggregationMethod < parameters.aggregationRange(), "Aggregation range out of bounds");
        require(jobIDs.length > 1, "Number of jobIDs low to create collection");

        uint256 epoch = parameters.getEpoch();
        require(blockManager.getBlock(epoch-1).proposerId != 0,"Block not yet confirmed");

        numPendingCollections = numPendingCollections+1;
        pendingCollections[numPendingCollections].id = numPendingCollections;
        pendingCollections[numPendingCollections].name = name;
        pendingCollections[numPendingCollections].aggregationMethod = aggregationMethod;
        pendingCollections[numPendingCollections].epoch = epoch;
        for(uint256 i = 0; i < jobIDs.length; i++){
            require(jobs[jobIDs[i]].assetType==uint256(assetTypes.Job),"Job ID not present");
            require(jobs[jobIDs[i]].active, "Job ID not active");
            require(!pendingCollections[numPendingCollections].jobIDExist[jobIDs[i]],"Duplicate JobIDs sent");
            pendingCollections[numPendingCollections].jobIDs.push(jobIDs[i]);
            pendingCollections[numPendingCollections].jobIDExist[jobIDs[i]] = true;
        }
        pendingCollections[numPendingCollections].creator = msg.sender;
        pendingCollections[numPendingCollections].assetType = uint256(assetTypes.Collection);
        pendingCollections[numPendingCollections].active = true;
        emit CollectionCreated(
            numPendingCollections,
            epoch,
            name,
            aggregationMethod,
            jobIDs,
            true,
            msg.sender,
            block.timestamp, 
            assetTypes.Collection
        );
    }

    function addJobToCollection(
        uint256 collectionID,
        uint256 jobID
    )  
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        require(collections[collectionID].assetType == uint256(assetTypes.Collection), "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        require(jobs[jobID].assetType == uint256(assetTypes.Job), "Job ID not present");
        require(jobs[jobID].active, "Job ID not active");
        require(!collections[collectionID].jobIDExist[jobID], "Job exists in this collection");
        
        uint256 epoch = parameters.getEpoch();
        collections[collectionID].jobIDs.push(jobID);
        collections[collectionID].jobIDExist[jobID] = true;

        emit CollectionUpdated(
        collectionID,
        epoch,
        collections[collectionID].name,
        collections[collectionID].jobIDs,
        block.timestamp
        );
    }

    function addPendingJobs() external {
        if(numPendingJobs!=0)
        {
            uint8 i;
            uint256 temp = numPendingJobs;
            for(i=1; i<=temp; i++){
                uint256 currentEpoch = parameters.getEpoch();
                if(pendingJobs[i].epoch  < currentEpoch){
                    numAssets = numAssets+1;
                    jobs[numAssets] = pendingJobs[i];
                    delete (pendingJobs[i]);
                    numActiveAssets = numActiveAssets+1;
                    numPendingJobs = numPendingJobs-1;
                }
            }
        }
    }

    function addPendingCollections() external {
        if(numPendingCollections!=0)
        {
            
            uint256 temp = numPendingCollections;
            for(uint8 i = 1; i <= temp; i++){
                uint256 currentEpoch = parameters.getEpoch();
                if(pendingCollections[i].epoch  < currentEpoch){
                    numAssets = numAssets+1;
                    collections[numAssets].id = numAssets; 
                    collections[numAssets].name = pendingCollections[i].name; 
                    collections[numAssets].aggregationMethod = pendingCollections[i].aggregationMethod; 
                    collections[numAssets].epoch = currentEpoch;
                    collections[numAssets].creator = pendingCollections[i].creator;
                    uint256[] memory jobIDs = pendingCollections[i].jobIDs;
                    for(uint256 j = 0; j < jobIDs.length; j++){
                        collections[numAssets].jobIDs.push(jobIDs[j]);
                        collections[numAssets].jobIDExist[jobIDs[j]] = true;
                    }
                    collections[numAssets].assetType = uint256(assetTypes.Collection);
                    delete (pendingCollections[i]);
                    numActiveAssets = numActiveAssets+1;
                    numPendingCollections = numPendingCollections-1;
                }
            }    
        }
    }

    function removeJobFromCollection(
        uint256 collectionID, 
        uint256 jobIDIndex
    )  
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        require(collections[collectionID].assetType == uint256(assetTypes.Collection), "Collection ID not present");
        require(collections[collectionID].jobIDs.length > jobIDIndex, "Index not in range");
        
        uint256 epoch = parameters.getEpoch();

        for (uint256 i = jobIDIndex; i < collections[collectionID].jobIDs.length-1; i++){
            collections[collectionID].jobIDs[i] = collections[collectionID].jobIDs[i+1];
        }
        collections[collectionID].jobIDs.pop();
    

        emit CollectionUpdated(
        collectionID,
        epoch,
        collections[collectionID].name,
        collections[collectionID].jobIDs,
        block.timestamp
        );
    }

    function getResult(
        uint256 id
    )
        external
        view
        returns(
            uint256 result
        )
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");
        
        if(jobs[id].assetType == uint256(assetTypes.Job)){
            return jobs[id].result;
        }
        else{
            return collections[id].result;
        }
    }

    function getJob(
        uint256 id
    )
        external
        view
        returns(
            string memory url,
            string memory selector,
            string memory name,
            bool repeat,
            uint256 result,
            bool active
        ) 
    {
        require(jobs[id].assetType == uint256(assetTypes.Job), "ID is not a job");
        Structs.Job memory job = jobs[id];
        return(job.url, job.selector, job.name, job.repeat, job.result, job.active);
    }

    function getCollection(
        uint256 id
    )
        external
        view
        returns(
            string memory name, 
            uint32 aggregationMethod, 
            uint256[] memory jobIDs, 
            uint256 result,
            bool active
        ) 
    {
        require(collections[id].assetType == uint256(assetTypes.Collection), "ID is not a collection");
        return(collections[id].name, collections[id].aggregationMethod, collections[id].jobIDs, collections[id].result, collections[id].active);
    }

    function getAssetType(
        uint256 id
    )
        external
        view
        returns(
            uint256
        )
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        if(jobs[id].assetType == uint256(assetTypes.Job)){
            return uint256(assetTypes.Job);
        }
        else{
            return uint256(assetTypes.Collection);
        }
    }

    function getActiveStatus(
        uint256 id
    )
        external
        view
        returns(
            bool
        )
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        if(jobs[id].assetType == uint256(assetTypes.Job)){
            return jobs[id].active;
        } 
        else{
            return collections[id].active;
        }
    }

    function getNumAssets() external view returns(uint256) {
        return numAssets;
    }

    function getActiveAssets() external view returns(uint256) {
      return numActiveAssets;
    }

    function getPendingJobs() external view returns(uint256) {
        return numPendingJobs;
    }

    function getPendingCollections() external view returns(uint256) {
        return numPendingCollections;
    }
}
