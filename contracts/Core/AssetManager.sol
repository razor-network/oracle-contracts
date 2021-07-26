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
        string calldata name
    ) 
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        uint256 epoch = parameters.getEpoch();
        
        numAssets = numAssets + 1;

        Structs.Job memory job = Structs.Job(
            numAssets, 
            epoch, 
            url, 
            selector, 
            name, 
            true,
            msg.sender, 
            uint256(assetTypes.Job)
        );
        jobs[numAssets] = job;
        emit JobCreated(
            numAssets, 
            epoch, 
            url, 
            selector, 
            name,
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

    function setAssetStatus(
        uint256 id,
        bool assetStatus
    ) 
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        if(assetStatus){
            pendingAssetActivation.push(id);
        }
        else{
            pendingAssetDeactivation.push(id);
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
        if(collections[id].assetType == uint256(assetTypes.Collection)){

            Structs.Collection storage collection = collections[id];

            if (!collection.repeat) {
                collection.active = false;

                for(uint j = 0; j < activeAssets.length; j++){
                    if(id == activeAssets[j]){
                        activeAssets[j] = activeAssets[activeAssets.length - 1];
                        activeAssets.pop();
                        break;
                    }
                }
            }

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
        uint32 aggregationMethod,
        bool repeat
    ) 
        external 
        onlyRole(parameters.getAssetModifierHash()) 
    {
        require(aggregationMethod > 0 && aggregationMethod < parameters.aggregationRange(), "Aggregation range out of bounds");
        require(jobIDs.length > 1, "Number of jobIDs low to create collection");

        uint256 epoch = parameters.getEpoch();

        numPendingCollections = numPendingCollections + 1;
        pendingCollections[numPendingCollections].id = numPendingCollections;
        pendingCollections[numPendingCollections].name = name;
        pendingCollections[numPendingCollections].aggregationMethod = aggregationMethod;
        pendingCollections[numPendingCollections].epoch = epoch;
        pendingCollections[numPendingCollections].creator = msg.sender;
        pendingCollections[numPendingCollections].repeat = repeat;
        pendingCollections[numPendingCollections].assetType = uint256(assetTypes.Collection);
        for(uint256 i = 0; i < jobIDs.length; i++){
            require(jobs[jobIDs[i]].assetType==uint256(assetTypes.Job),"Job ID not present");
            require(jobs[jobIDs[i]].active, "Job ID not active");
            require(!pendingCollections[numPendingCollections].jobIDExist[jobIDs[i]],"Duplicate JobIDs sent");
            pendingCollections[numPendingCollections].jobIDs.push(jobIDs[i]);
            pendingCollections[numPendingCollections].jobIDExist[jobIDs[i]] = true;
        }
        
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

    function addPendingCollections() 
        external
        onlyRole(parameters.getAssetConfirmerHash()) 
    {
        if(numPendingCollections != 0)
        {
            
            uint256 temp = numPendingCollections;
            for(uint8 i = 1; i <= temp; i++){
                uint256 currentEpoch = parameters.getEpoch();
                numAssets = numAssets + 1;

                collections[numAssets].id = numAssets; 
                collections[numAssets].name = pendingCollections[i].name; 
                collections[numAssets].aggregationMethod = pendingCollections[i].aggregationMethod; 
                collections[numAssets].epoch = currentEpoch;
                collections[numAssets].creator = pendingCollections[i].creator;
                collections[numAssets].repeat = pendingCollections[i].repeat;
                collections[numAssets].assetType = uint256(assetTypes.Collection);
                collections[numAssets].active = true;
                uint256[] memory jobIDs = pendingCollections[i].jobIDs;
                for(uint256 j = 0; j < jobIDs.length; j++){
                    collections[numAssets].jobIDs.push(jobIDs[j]);
                    collections[numAssets].jobIDExist[jobIDs[j]] = true;
                    pendingCollections[i].jobIDExist[jobIDs[j]] = false;
                }
                
                delete (pendingCollections[i]);

                numPendingCollections = numPendingCollections - 1;

                activeAssets.push(numAssets);
                
                emit CollectionActivityStatus(
                    numAssets,
                    currentEpoch,
                    collections[numAssets].active,
                    block.timestamp
                );

            }    
        }
    }

    function deactivateAssets() 
        external
        onlyRole(parameters.getAssetConfirmerHash()) 
    {
        uint256 epoch = parameters.getEpoch();
        
        for(uint256 i = 0; i < pendingAssetDeactivation.length; i++){
            uint256 id = pendingAssetDeactivation[i];

            if(jobs[id].assetType == uint256(assetTypes.Job)){
                jobs[id].active = false;
                emit JobActivityStatus(
                id,
                epoch,
                jobs[id].active,
                block.timestamp
                );
            }
            else{
                collections[id].active = false;

                for(uint j = 0; j < activeAssets.length; j++){
                    if(id == activeAssets[j]){
                        activeAssets[j] = activeAssets[activeAssets.length - 1];
                        activeAssets.pop();
                        break;
                    }
                }

                emit CollectionActivityStatus(
                id,
                epoch,
                collections[id].active,
                block.timestamp
                );
            }
        }
        delete(pendingAssetDeactivation);
    }

    function activateAssets() 
        external
        onlyRole(parameters.getAssetConfirmerHash()) 
    {
        uint256 epoch = parameters.getEpoch();
        
        for(uint256 i = 0; i < pendingAssetActivation.length; i++){
            uint256 id = pendingAssetActivation[i];
            if(jobs[id].assetType == uint256(assetTypes.Job)){
                jobs[id].active = true;

                emit JobActivityStatus(
                id,
                epoch,
                jobs[id].active,
                block.timestamp
                );
            }
            else{
                collections[id].active = true;

                activeAssets.push(id);

                emit CollectionActivityStatus(
                id,
                epoch,
                collections[id].active,
                block.timestamp
                );
            }
        }
        delete(pendingAssetActivation);
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
        require(collections[id].assetType == uint256(assetTypes.Collection),"ID not a collection");

        return collections[id].result;
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
            bool active
        ) 
    {
        require(jobs[id].assetType == uint256(assetTypes.Job), "ID is not a job");
        Structs.Job memory job = jobs[id];
        return(job.url, job.selector, job.name, job.active);
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
      return activeAssets.length;
    }

    function getActiveAssetsList() external view returns(uint256[] memory) {
      return activeAssets;
    }

    function getPendingCollections() external view returns(uint256) {
        return numPendingCollections;
    }
}
