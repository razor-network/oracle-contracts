// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./storage/AssetStorage.sol";
import "./ACL.sol";

contract AssetManager is ACL, AssetStorage {
    IParameters public parameters;

    event JobCreated(
        uint8 id,
        uint32 epoch,
        string url,
        string selector,
        string name,
        bool repeat,
        address creator,
        uint256 timestamp,
        assetTypes assetType
    );

    event JobReported(
        uint8 id,
        uint256 value,
        uint32 epoch,
        string url,
        string selector,
        string name,
        bool repeat,
        address creator,
        bool active,
        uint256 timestamp
    );

    event JobUpdated(uint8 id, uint32 epoch, string url, string selector, uint256 timestamp);

    event JobActivityStatus(uint8 id, uint32 epoch, bool active, uint256 timestamp);

    event CollectionCreated(
        uint8 id,
        uint32 epoch,
        string name,
        uint32 aggregationMethod,
        uint8[] jobIDs,
        bool active,
        address creator,
        uint256 timestamp,
        assetTypes assetType
    );

    event CollectionReported(
        uint8 id,
        uint256 value,
        uint32 epoch,
        string name,
        uint32 aggregationMethod,
        uint8[] jobIDs,
        address creator,
        uint256 timestamp
    );

    event CollectionUpdated(uint8 id, uint32 epoch, string name, uint8[] updatedJobIDs, uint256 timestamp);

    event CollectionActivityStatus(uint8 id, uint32 epoch, bool active, uint256 timestamp);

    constructor(address parametersAddress) {
        parameters = IParameters(parametersAddress);
    }

    function createJob(
        string calldata url,
        string calldata selector,
        string calldata name,
        bool repeat
    ) external onlyRole(parameters.getAssetModifierHash()) {
        numAssets = numAssets + 1;
        uint32 epoch = parameters.getEpoch();
        Structs.Job memory job = Structs.Job(numAssets, epoch, url, selector, name, repeat, true, msg.sender, 0, uint8(assetTypes.Job));
        jobs[numAssets] = job;

        emit JobCreated(numAssets, epoch, url, selector, name, repeat, msg.sender, block.timestamp, assetTypes.Job);
    }

    function updateJob(
        uint8 jobID,
        string calldata url,
        string calldata selector
    ) external onlyRole(parameters.getAssetModifierHash()) {
        require(jobs[jobID].assetType == uint256(assetTypes.Job), "Job ID not present");

        uint32 epoch = parameters.getEpoch();

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;

        emit JobUpdated(jobID, epoch, url, selector, block.timestamp);
    }

    function setAssetStatus(uint8 id, bool assetStatus) external onlyRole(parameters.getAssetModifierHash()) {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        uint32 epoch = parameters.getEpoch();

        if (jobs[id].assetType == uint256(assetTypes.Job)) {
            jobs[id].active = assetStatus;

            emit JobActivityStatus(id, epoch, jobs[id].active, block.timestamp);
        } else {
            collections[id].active = assetStatus;

            emit CollectionActivityStatus(id, epoch, collections[id].active, block.timestamp);
        }
    }

    function createCollection(
        string calldata name,
        uint8[] memory jobIDs,
        uint32 aggregationMethod
    ) external onlyRole(parameters.getAssetModifierHash()) {
        require(aggregationMethod > 0 && aggregationMethod < parameters.aggregationRange(), "Aggregation range out of bounds");
        require(jobIDs.length > 1, "Number of jobIDs low to create collection");

        numAssets = numAssets + 1;
        uint32 epoch = parameters.getEpoch();
        collections[numAssets].id = numAssets;
        collections[numAssets].name = name;
        collections[numAssets].aggregationMethod = aggregationMethod;
        collections[numAssets].epoch = epoch;
        for (uint8 i = 0; i < jobIDs.length; i++) {
            require(jobs[jobIDs[i]].assetType == uint8(assetTypes.Job), "Job ID not present");
            require(jobs[jobIDs[i]].active, "Job ID not active");
            require(!collections[numAssets].jobIDExist[jobIDs[i]], "Duplicate JobIDs sent");
            collections[numAssets].jobIDs.push(jobIDs[i]);
            collections[numAssets].jobIDExist[jobIDs[i]] = true;
        }
        collections[numAssets].creator = msg.sender;
        collections[numAssets].assetType = uint8(assetTypes.Collection);
        collections[numAssets].active = true;

        emit CollectionCreated(numAssets, epoch, name, aggregationMethod, jobIDs, true, msg.sender, block.timestamp, assetTypes.Collection);
    }

    function addJobToCollection(uint8 collectionID, uint8 jobID) external onlyRole(parameters.getAssetModifierHash()) {
        require(collections[collectionID].assetType == uint8(assetTypes.Collection), "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        require(jobs[jobID].assetType == uint8(assetTypes.Job), "Job ID not present");
        require(jobs[jobID].active, "Job ID not active");
        require(!collections[collectionID].jobIDExist[jobID], "Job exists in this collection");

        uint32 epoch = parameters.getEpoch();
        collections[collectionID].jobIDs.push(jobID);
        collections[collectionID].jobIDExist[jobID] = true;

        emit CollectionUpdated(collectionID, epoch, collections[collectionID].name, collections[collectionID].jobIDs, block.timestamp);
    }

    function removeJobFromCollection(uint8 collectionID, uint8 jobIDIndex) external onlyRole(parameters.getAssetModifierHash()) {
        require(collections[collectionID].assetType == uint8(assetTypes.Collection), "Collection ID not present");
        require(collections[collectionID].jobIDs.length > jobIDIndex, "Index not in range");

        uint32 epoch = parameters.getEpoch();

        for (uint256 i = jobIDIndex; i < collections[collectionID].jobIDs.length - 1; i++) {
            collections[collectionID].jobIDs[i] = collections[collectionID].jobIDs[i + 1];
        }
        collections[collectionID].jobIDs.pop();

        emit CollectionUpdated(collectionID, epoch, collections[collectionID].name, collections[collectionID].jobIDs, block.timestamp);
    }

    function getResult(uint8 id) external view returns (uint32 result) {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        if (jobs[id].assetType == uint256(assetTypes.Job)) {
            return jobs[id].result;
        } else {
            return collections[id].result;
        }
    }

    function getJob(uint8 id)
        external
        view
        returns (
            string memory url,
            string memory selector,
            string memory name,
            bool repeat,
            uint32 result,
            bool active
        )
    {
        require(jobs[id].assetType == uint256(assetTypes.Job), "ID is not a job");
        Structs.Job memory job = jobs[id];
        return (job.url, job.selector, job.name, job.repeat, job.result, job.active);
    }

    function getCollection(uint8 id)
        external
        view
        returns (
            string memory name,
            uint32 aggregationMethod,
            uint8[] memory jobIDs,
            uint32 result,
            bool active
        )
    {
        require(collections[id].assetType == uint256(assetTypes.Collection), "ID is not a collection");
        return (
            collections[id].name,
            collections[id].aggregationMethod,
            collections[id].jobIDs,
            collections[id].result,
            collections[id].active
        );
    }

    function getAssetType(uint8 id) external view returns (uint8) {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        if (jobs[id].assetType == uint8(assetTypes.Job)) {
            return uint8(assetTypes.Job);
        } else {
            return uint8(assetTypes.Collection);
        }
    }

    function getActiveStatus(uint8 id) external view returns (bool) {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        if (jobs[id].assetType == uint256(assetTypes.Job)) {
            return jobs[id].active;
        } else {
            return collections[id].active;
        }
    }

    function getNumAssets() external view returns (uint8) {
        return numAssets;
    }
}
