// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IAssetManager.sol";
import "../IDelegator.sol";
import "./storage/AssetStorage.sol";
import "./parameters/child/AssetManagerParams.sol";
import "./StateManager.sol";

contract AssetManager is AssetStorage, StateManager, AssetManagerParams, IAssetManager {
    IDelegator public delegator;

    event AssetCreated(AssetType assetType, uint16 id, uint256 timestamp);

    event JobUpdated(
        uint16 id,
        JobSelectorType selectorType,
        uint32 epoch,
        uint8 weight,
        int8 power,
        uint256 timestamp,
        string selector,
        string url
    );

    event CollectionActivityStatus(bool active, uint16 id, uint32 epoch, uint256 timestamp);

    event CollectionUpdated(uint16 id, uint32 epoch, uint32 aggregationMethod, int8 power, uint16[] updatedJobIDs, uint256 timestamp);

    function upgradeDelegator(address newDelegatorAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegatorAddress != address(0x0), "Zero Address check");
        delegator = IDelegator(newDelegatorAddress);
    }

    function createJob(
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata name,
        string calldata selector,
        string calldata url
    ) external onlyRole(ASSET_MODIFIER_ROLE) {
        require(weight <= 100, "Weight beyond max");
        numJobs = numJobs + 1;

        jobs[numJobs] = Structs.Job(numJobs, uint8(selectorType), weight, power, name, selector, url);

        emit AssetCreated(AssetType.Job, numJobs, block.timestamp);
    }

    function updateJob(
        uint16 jobID,
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external onlyRole(ASSET_MODIFIER_ROLE) notState(State.Commit, epochLength) {
        require(jobID != 0, "ID cannot be 0");
        require(jobs[jobID].id == jobID, "Job ID not present");
        require(weight <= 100, "Weight beyond max");

        uint32 epoch = _getEpoch(epochLength);

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;
        jobs[jobID].selectorType = uint8(selectorType);
        jobs[jobID].weight = weight;
        jobs[jobID].power = power;
        emit JobUpdated(jobID, selectorType, epoch, weight, power, block.timestamp, selector, url);
    }

    function setCollectionStatus(bool assetStatus, uint16 id)
        external
        onlyRole(ASSET_MODIFIER_ROLE)
        checkState(State.Confirm, epochLength)
    {
        require(id != 0, "ID cannot be 0");
        require(collections[id].id == id, "Asset is not a collection");

        uint32 epoch = _getEpoch(epochLength);
        if (assetStatus) {
            if (!collections[id].active) {
                if (updateRegistry == epoch) {
                    // update registry
                    delegator.updateRegistry(numCollections);
                }
                numActiveCollections = numActiveCollections + 1;
                collections[id].active = assetStatus;
                updateRegistry = epoch + 1;
                emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
            }
        } else {
            if (collections[id].active) {
                if (updateRegistry == epoch) {
                    // update registry
                    delegator.updateRegistry(numCollections);
                }
                numActiveCollections = numActiveCollections - 1;
                collections[id].active = assetStatus;
                updateRegistry = epoch + 1;
                emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
            }
        }
    }

    function createCollection(
        uint16[] memory jobIDs,
        uint32 aggregationMethod,
        int8 power,
        string calldata name
    ) external onlyRole(ASSET_MODIFIER_ROLE) checkState(State.Confirm, epochLength) {
        require(jobIDs.length > 0, "no jobs added");

        uint32 epoch = _getEpoch(epochLength);

        if (updateRegistry == epoch) {
            // update registry
            delegator.updateRegistry(numCollections);
        }

        numCollections = numCollections + 1;

        collections[numCollections] = Structs.Collection(true, numCollections, power, aggregationMethod, jobIDs, name);

        numActiveCollections = numActiveCollections + 1;
        updateRegistry = epoch + 1;
        emit AssetCreated(AssetType.Collection, numCollections, block.timestamp);

        delegator.setIDName(name, numCollections);
    }

    function updateCollection(
        uint16 collectionID,
        uint32 aggregationMethod,
        int8 power,
        uint16[] memory jobIDs
    ) external onlyRole(ASSET_MODIFIER_ROLE) notState(State.Commit, epochLength) {
        require(collections[collectionID].id == collectionID, "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        uint32 epoch = _getEpoch(epochLength);
        collections[collectionID].power = power;
        collections[collectionID].aggregationMethod = aggregationMethod;
        collections[collectionID].jobIDs = jobIDs;

        emit CollectionUpdated(
            collectionID,
            epoch,
            collections[collectionID].aggregationMethod,
            collections[collectionID].power,
            collections[collectionID].jobIDs,
            block.timestamp
        );
    }

    function getJob(uint16 id) external view returns (Structs.Job memory job) {
        require(id != 0, "ID cannot be 0");
        require(id <= numJobs, "ID does not exist");

        return jobs[id];
    }

    function getCollection(uint16 id) external view returns (Structs.Collection memory collection) {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");

        return collections[id];
    }

    function getCollectionStatus(uint16 id) external view override returns (bool) {
        require(collections[id].id == id, "Asset is not a collection");

        return collections[id].active;
    }

    function getCollectionPower(uint16 id) external view override returns (int8) {
        require(collections[id].id == id, "Asset is not a collection");

        return collections[id].power;
    }

    function getNumJobs() external view returns (uint16) {
        return numJobs;
    }

    function getNumCollections() external view override returns (uint16) {
        return numCollections;
    }

    function getNumActiveCollections() external view override returns (uint256) {
        return numActiveCollections;
    }

    function getUpdateRegistryEpoch() external view override returns (uint32) {
        return updateRegistry;
    }
}
