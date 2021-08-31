// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./storage/AssetStorage.sol";
import "./storage/Constants.sol";
import "./StateManager.sol";
import "./ACL.sol";

contract AssetManager is ACL, AssetStorage, Constants, StateManager {
    IParameters public parameters;

    event JobCreated(uint8 id, int8 power, address creator, uint32 epoch, uint256 timestamp, string name, string selector, string url);

    event JobUpdated(uint8 id, uint32 epoch, int8 power, uint256 timestamp, string selector, string url);

    event JobActivityStatus(bool active, uint8 id, uint32 epoch, uint256 timestamp);

    event CollectionCreated(
        bool active,
        uint8 id,
        int8 power,
        uint32 epoch,
        uint32 aggregationMethod,
        uint8[] jobIDs,
        address creator,
        uint256 timestamp,
        string name
    );

    event CollectionUpdated(
        uint8 id,
        uint32 epoch,
        uint32 aggregationMethod,
        int8 power,
        uint8[] updatedJobIDs,
        uint256 timestamp,
        string name
    );

    event CollectionActivityStatus(bool active, uint8 id, uint32 epoch, uint256 timestamp);

    constructor(address parametersAddress) {
        parameters = IParameters(parametersAddress);
    }

    function createJob(
        int8 power,
        string calldata name,
        string calldata selector,
        string calldata url
    ) external onlyRole(ASSET_MODIFIER_ROLE) {
        numAssets = numAssets + 1;
        uint32 epoch = parameters.getEpoch();

        jobs[numAssets] = Structs.Job(true, numAssets, uint8(assetTypes.Job), power, epoch, msg.sender, name, selector, url);

        emit JobCreated(numAssets, power, msg.sender, epoch, block.timestamp, name, selector, url);
    }

    function updateJob(
        uint8 jobID,
        int8 power,
        string calldata selector,
        string calldata url
    ) external onlyRole(ASSET_MODIFIER_ROLE) notCommitState(State.Commit, parameters.epochLength()) {
        require(jobs[jobID].assetType == uint8(assetTypes.Job), "Job ID not present");

        uint32 epoch = parameters.getEpoch();

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;
        jobs[jobID].power = power;
        emit JobUpdated(jobID, epoch, power, block.timestamp, selector, url);
    }

    function setAssetStatus(bool assetStatus, uint8 id)
        external
        onlyRole(ASSET_MODIFIER_ROLE)
        checkState(State.Confirm, parameters.epochLength())
    {
        require(id != 0, "ID cannot be 0");

        require(id <= numAssets, "ID does not exist");

        uint32 epoch = parameters.getEpoch();

        if (jobs[id].assetType == uint8(assetTypes.Job)) {
            jobs[id].active = assetStatus;

            emit JobActivityStatus(jobs[id].active, id, epoch, block.timestamp);
        } else {
            if (assetStatus) {
                if (!collections[id].active) {
                    activeAssets.push(id);
                    collections[id].assetIndex = uint8(activeAssets.length);
                }
            } else {
                if (collections[id].active) {
                    for (uint8 j = 0; j < activeAssets.length; j++) {
                        if (id == activeAssets[j]) {
                            activeAssets[j] = activeAssets[activeAssets.length - 1];
                            activeAssets.pop();
                            collections[id].assetIndex = 0;
                            if (j != activeAssets.length) {
                                collections[activeAssets[j]].assetIndex = j + 1;
                            }
                            break;
                        }
                    }
                }
            }

            collections[id].active = assetStatus;

            emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
        }
    }

    function createCollection(
        uint8[] memory jobIDs,
        uint32 aggregationMethod,
        int8 power,
        string calldata name
    ) external onlyRole(ASSET_MODIFIER_ROLE) checkState(State.Confirm, parameters.epochLength()) {
        require(aggregationMethod > 0 && aggregationMethod < parameters.aggregationRange(), "Aggregation range out of bounds");

        require(jobIDs.length > 1, "Number of jobIDs low to create collection");

        numAssets = numAssets + 1;
        uint32 epoch = parameters.getEpoch();

        collections[numAssets].id = numAssets;
        collections[numAssets].power = power;
        collections[numAssets].epoch = epoch;
        collections[numAssets].aggregationMethod = aggregationMethod;
        collections[numAssets].name = name;
        for (uint8 i = 0; i < jobIDs.length; i++) {
            require(jobs[jobIDs[i]].assetType == uint8(assetTypes.Job), "Job ID not present");

            require(jobs[jobIDs[i]].active, "Job ID not active");

            require(!collections[numAssets].jobIDExist[jobIDs[i]], "Duplicate JobIDs sent");

            collections[numAssets].jobIDs.push(jobIDs[i]);

            collections[numAssets].jobIDExist[jobIDs[i]] = true;
        }
        collections[numAssets].active = true;
        collections[numAssets].assetType = uint8(assetTypes.Collection);
        collections[numAssets].creator = msg.sender;
        activeAssets.push(numAssets);
        collections[numAssets].assetIndex = uint8(activeAssets.length);
        emit CollectionCreated(true, numAssets, power, epoch, aggregationMethod, jobIDs, msg.sender, block.timestamp, name);
    }

    function addJobToCollection(uint8 collectionID, uint8 jobID)
        external
        onlyRole(ASSET_MODIFIER_ROLE)
        notCommitState(State.Commit, parameters.epochLength())
    {
        require(collections[collectionID].assetType == uint8(assetTypes.Collection), "Collection ID not present");

        require(collections[collectionID].active, "Collection is inactive");

        require(jobs[jobID].assetType == uint8(assetTypes.Job), "Job ID not present");

        require(jobs[jobID].active, "Job ID not active");

        require(!collections[collectionID].jobIDExist[jobID], "Job exists in this collection");

        uint32 epoch = parameters.getEpoch();

        collections[collectionID].jobIDs.push(jobID);

        collections[collectionID].jobIDExist[jobID] = true;

        emit CollectionUpdated(
            collectionID,
            epoch,
            collections[collectionID].aggregationMethod,
            collections[collectionID].power,
            collections[collectionID].jobIDs,
            block.timestamp,
            collections[collectionID].name
        );
    }

    function removeJobFromCollection(uint8 collectionID, uint8 jobIDIndex)
        external
        onlyRole(ASSET_MODIFIER_ROLE)
        notCommitState(State.Commit, parameters.epochLength())
    {
        require(collections[collectionID].assetType == uint8(assetTypes.Collection), "Collection ID not present");

        require(collections[collectionID].jobIDs.length > jobIDIndex, "Index not in range");

        uint32 epoch = parameters.getEpoch();

        for (uint8 i = jobIDIndex; i < collections[collectionID].jobIDs.length - 1; i++) {
            collections[collectionID].jobIDs[i] = collections[collectionID].jobIDs[i + 1];
        }
        collections[collectionID].jobIDs.pop();

        emit CollectionUpdated(
            collectionID,
            epoch,
            collections[collectionID].aggregationMethod,
            collections[collectionID].power,
            collections[collectionID].jobIDs,
            block.timestamp,
            collections[collectionID].name
        );
    }

    function updateCollection(
        uint8 collectionID,
        uint32 aggregationMethod,
        int8 power
    ) external onlyRole(ASSET_MODIFIER_ROLE) {
        require(collections[collectionID].assetType == uint8(assetTypes.Collection), "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");

        uint32 epoch = parameters.getEpoch();

        collections[collectionID].power = power;
        collections[collectionID].aggregationMethod = aggregationMethod;

        emit CollectionUpdated(
            collectionID,
            epoch,
            collections[collectionID].aggregationMethod,
            collections[collectionID].power,
            collections[collectionID].jobIDs,
            block.timestamp,
            collections[collectionID].name
        );
    }

    // function getResult(uint8 id) external view returns (uint32 result) {
    //     require(id != 0, "ID cannot be 0");
    //
    //     require(id <= numAssets, "ID does not exist");
    //
    //     if (jobs[id].assetType == uint8(assetTypes.Job)) {
    //         return jobs[id].result;
    //     } else {
    //         return collections[id].result;
    //     }
    // }

    function getJob(uint8 id)
        external
        view
        returns (
            bool active,
            int8 power,
            string memory name,
            string memory selector,
            string memory url
        )
    {
        require(jobs[id].assetType == uint8(assetTypes.Job), "ID is not a job");

        Structs.Job memory job = jobs[id];
        return (job.active, job.power, job.name, job.selector, job.url);
    }

    function getCollection(uint8 id)
        external
        view
        returns (
            bool active,
            int8 power,
            uint8[] memory jobIDs,
            uint32 aggregationMethod,
            string memory name
        )
    {
        require(collections[id].assetType == uint8(assetTypes.Collection), "ID is not a collection");

        return (
            collections[id].active,
            collections[id].power,
            collections[id].jobIDs,
            collections[id].aggregationMethod,
            collections[id].name
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

        if (jobs[id].assetType == uint8(assetTypes.Job)) {
            return jobs[id].active;
        } else {
            return collections[id].active;
        }
    }

    function getAssetIndex(uint8 id) external view returns (uint8) {
        require(collections[id].assetType == uint8(assetTypes.Collection), "ID needs to be a collection");

        return collections[id].assetIndex;
    }

    function getNumAssets() external view returns (uint8) {
        return numAssets;
    }

    function getNumActiveAssets() external view returns (uint8) {
        return uint8(activeAssets.length);
    }

    function getActiveAssets() external view returns (uint8[] memory) {
        return activeAssets;
    }
}
