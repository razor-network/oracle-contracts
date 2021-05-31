// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IStateManager.sol";
import "./storage/AssetStorage.sol";
import "../lib/Constants.sol";
import "./ACL.sol";


contract AssetManager is ACL, AssetStorage {

    IStateManager public stateManager;

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

    //disable after init.
    function init(address _stateManagerAddress) external {
        stateManager = IStateManager(_stateManagerAddress);
    }

    function createJob (
        string calldata url, 
        string calldata selector, 
        string calldata name, 
        bool repeat
    ) external payable {
        numAssets = numAssets + 1;
        uint256 epoch = stateManager.getEpoch();
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
        jobs[numAssets] = job;

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
        onlyRole(Constants.getAssetConfirmerHash())
    {
        uint256 epoch = stateManager.getEpoch();
        if(jobs[id].assetType == uint256(assetTypes.Job)){

            Structs.Job storage job = jobs[id];

            if (!job.repeat) {
                job.fulfilled = true;
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
        require(aggregationMethod > 0 && aggregationMethod < Constants.getAggregationRange(),"Aggregation range out of bounds");
        require(jobIDs.length > 1,"Number of jobIDs low to create collection");

        numAssets = numAssets + 1;
        uint256 epoch = stateManager.getEpoch();
        collections[numAssets].id = numAssets; 
        collections[numAssets].name = name; 
        collections[numAssets].aggregationMethod = aggregationMethod; 
        collections[numAssets].epoch = epoch;
        collections[numAssets].creator = msg.sender;
        collections[numAssets].credit = msg.value;
        for(uint256 i = 0; i < jobIDs.length; i++){
            require(jobs[jobIDs[i]].assetType==uint256(assetTypes.Job),"Job ID not present");
            require(!collections[numAssets].jobIDExist[jobIDs[i]],"Duplicate JobIDs sent");
            collections[numAssets].jobIDs.push(jobIDs[i]);
            collections[numAssets].jobIDExist[jobIDs[i]] = true;
        }
        collections[numAssets].assetType = uint256(assetTypes.Collection);

        emit CollectionCreated(
            numAssets, 
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
        
        uint256 epoch = stateManager.getEpoch();
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
}
