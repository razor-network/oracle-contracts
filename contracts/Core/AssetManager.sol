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
        uint256 credit,
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
        uint256 credit,
        bool fulfilled,
        uint256 timestamp
    );

    event CollectionCreated(
        uint256 id,
        uint256 epoch,
        string name,
        uint32 aggregationMethod,
        uint256[] jobIDs,
        address creator,
        uint256 credit,
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
        uint256 credit,
        uint256 timestamp
    );

    event CollectionUpdated(
        uint256 id,
        uint256 epoch,
        string name,
        uint256[] updatedJobIDs,
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
    ) external payable {
        
        uint256 epoch = parameters.getEpoch();
        require(blockManager.getBlock(epoch-1).proposerId != 0,"Block not yet confirmed");
        
        numPendingJobs = numPendingJobs+1;

        Structs.Job memory job = Structs.Job(
            numAssets,
            epoch,
            url,
            selector,
            name,
            repeat,
            msg.sender,
            msg.value,
            false,
            0,
            uint256(assetTypes.Job)
        );
        pendingJobs[numPendingJobs] = job;
        emit JobCreated(
            numAssets,
            epoch,
            url,
            selector,
            name,
            repeat,
            msg.sender,
            msg.value,
            block.timestamp,
            assetTypes.Job
        );
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
                job.fulfilled = true;
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
                job.credit,
                job.fulfilled,
                block.timestamp
            );
        }
        else if(collections[id].assetType==uint256(assetTypes.Collection)){

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
                collection.credit,
                block.timestamp
            );
        }
    }

    function createCollection(
        string calldata name,
        uint256[] memory jobIDs,
        uint32 aggregationMethod
    ) external payable
    {
        require(aggregationMethod > 0 && aggregationMethod < parameters.aggregationRange(),"Aggregation range out of bounds");
        require(jobIDs.length > 1,"Number of jobIDs low to create collection");

        uint256 epoch = parameters.getEpoch();
        require(blockManager.getBlock(epoch-1).proposerId != 0,"Block not yet confirmed");

        numPendingCollections = numPendingCollections+1;
        pendingCollections[numPendingCollections].id = numAssets;
        pendingCollections[numPendingCollections].name = name;
        pendingCollections[numPendingCollections].aggregationMethod = aggregationMethod;
        pendingCollections[numPendingCollections].epoch = epoch;
        pendingCollections[numPendingCollections].creator = msg.sender;
        pendingCollections[numPendingCollections].credit = msg.value;
        for(uint256 i = 0; i < jobIDs.length; i++){
            require(jobs[jobIDs[i]].assetType==uint256(assetTypes.Job),"Job ID not present");
            require(!pendingCollections[numPendingCollections].jobIDExist[jobIDs[i]],"Duplicate JobIDs sent");
            pendingCollections[numPendingCollections].jobIDs.push(jobIDs[i]);
            pendingCollections[numPendingCollections].jobIDExist[jobIDs[i]] = true;
        }
        pendingCollections[numPendingCollections].assetType = uint256(assetTypes.Collection);
        emit CollectionCreated(
            numPendingCollections,
            epoch,
            name,
            aggregationMethod,
            jobIDs,
            msg.sender,
            msg.value,
            block.timestamp,
            assetTypes.Collection
        );
    }

    function addJobToCollection(
        uint256 collectionID,
        uint256 jobID
        ) external {
        require(collections[collectionID].assetType==uint256(assetTypes.Collection),"Collection ID not present");
        require(jobs[jobID].assetType==uint256(assetTypes.Job),"Job ID not present");
        require(!collections[collectionID].jobIDExist[jobID],"Job exists in this collection");

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
                    collections[numAssets].credit = pendingCollections[i].credit;
                    uint256[] memory jobIDs = pendingCollections[i].jobIDs;
                    for(uint256 j = 0; j < jobIDs.length; j++){
                        require(jobs[jobIDs[j]].assetType==uint256(assetTypes.Job),"Job ID not present");
                        require(!collections[numAssets].jobIDExist[jobIDs[j]],"Duplicate JobIDs sent");
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
        require(id<=numAssets,"ID does not exist");

        if(jobs[id].assetType==uint256(assetTypes.Job)){
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
            uint256 result
        )
    {
        require(jobs[id].assetType==uint256(assetTypes.Job),"ID is not a job");
        Structs.Job memory job = jobs[id];
        return(job.url, job.selector, job.name, job.repeat, job.result);
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
            uint256 result
        )
    {
        require(collections[id].assetType==uint256(assetTypes.Collection),"ID is not a collection");
        return(collections[id].name, collections[id].aggregationMethod, collections[id].jobIDs, collections[id].result);
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
        require(id <= numAssets,"ID does not exist");

        if(jobs[id].assetType==uint256(assetTypes.Job)){
            return uint256(assetTypes.Job);
        }
        else{
            return uint256(assetTypes.Collection);
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
