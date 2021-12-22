// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IAssetManager.sol";
import "../IDelegator.sol";
import "./storage/AssetStorage.sol";
import "./parameters/child/AssetManagerParams.sol";
import "./StateManager.sol";
import "hardhat/console.sol";

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

    event CollectionUpdated(uint16 id, uint32 epoch, uint32 aggregationMethod, int8 power, uint16 tolerance, uint16[] updatedJobIDs, uint256 timestamp);

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
        numAssets = numAssets + 1;

        jobs[numAssets] = Structs.Job(numAssets, uint8(selectorType), weight, power, name, selector, url);

        emit AssetCreated(AssetType.Job, numAssets, block.timestamp);
        delegator.setIDName(name, numAssets);
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
                activeCollections.push(id);
                collections[id].assetIndex = uint16(activeCollections.length);
                collections[id].active = assetStatus;
                emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
            }
        } else {
            if (collections[id].active) {
                pendingDeactivations.push(id);
            }
        }
    }

    function executePendingDeactivations(uint32 epoch) external override onlyRole(ASSET_CONFIRMER_ROLE) {
        for (uint16 i = uint16(pendingDeactivations.length); i > 0; i--) {
            uint16 assetIndex = collections[pendingDeactivations[i - 1]].assetIndex;
            if (assetIndex == activeCollections.length) {
                activeCollections.pop();
            } else {
                activeCollections[assetIndex - 1] = activeCollections[activeCollections.length - 1];
                collections[activeCollections[assetIndex - 1]].assetIndex = assetIndex;
                activeCollections.pop();
            }
            collections[pendingDeactivations[i - 1]].assetIndex = 0;
            collections[pendingDeactivations[i - 1]].active = false;
            emit CollectionActivityStatus(
                collections[pendingDeactivations[i - 1]].active,
                pendingDeactivations[i - 1],
                epoch,
                block.timestamp
            );
            pendingDeactivations.pop();
        }
    }

    function createCollection(
        uint16 tolerance,
        int8 power,
        uint32 aggregationMethod,
        uint16[] memory jobIDs,
        string calldata name
    ) external onlyRole(ASSET_MODIFIER_ROLE) checkState(State.Confirm, epochLength) {
        require(jobIDs.length > 0, "no jobs added");
        require(tolerance <= maxTolerance, "Invalid tolerance value");

        numAssets = numAssets + 1;

        activeCollections.push(numAssets);
        collections[numAssets] = Structs.Collection(
            true,
            numAssets,
            uint16(activeCollections.length),
            tolerance,
            power,
            aggregationMethod,
            jobIDs,
            name
        );
        emit AssetCreated(AssetType.Collection, numAssets, block.timestamp);

        delegator.setIDName(name, numAssets);
    }

    function updateCollection(
        uint16 collectionID,
        uint16 tolerance,
        uint32 aggregationMethod,
        int8 power,
        uint16[] memory jobIDs
    ) external onlyRole(ASSET_MODIFIER_ROLE) notState(State.Commit, epochLength) {
        require(collections[collectionID].id == collectionID, "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        require(tolerance <= maxTolerance, "Invalid tolerance value");
        uint32 epoch = _getEpoch(epochLength);
        collections[collectionID].power = power;
        collections[collectionID].tolerance = tolerance;
        collections[collectionID].aggregationMethod = aggregationMethod;
        collections[collectionID].jobIDs = jobIDs;

        emit CollectionUpdated(
            collectionID,
            epoch,
            aggregationMethod,
            power,
            tolerance,
            jobIDs,
            block.timestamp
        );
    }

    function getAsset(uint16 id) external view returns (Structs.Job memory job, Structs.Collection memory collection) {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        return (jobs[id], collections[id]);
    }

    function getCollectionStatus(uint16 id) external view returns (bool) {
        require(collections[id].id == id, "Asset is not a collection");

        return collections[id].active;
    }

    function getCollectionIndex(uint16 id) external view override returns (uint16) {
        require(collections[id].id == id, "Asset is not a collection");
        return collections[id].assetIndex;
    }

    function getCollectionTolerance(uint16 i) external view override returns (uint16) {
        return collections[activeCollections[i]].tolerance;
    }

    function getCollectionPower(uint16 id) external view override returns (int8) {
        require(collections[id].id == id, "Asset is not a collection");

        return collections[id].power;
    }

    function getNumAssets() external view returns (uint16) {
        return numAssets;
    }

    function getActiveCollections() external view override returns (uint16[] memory) {
        return activeCollections;
    }

    function getNumActiveCollections() external view override returns (uint256) {
        return activeCollections.length;
    }

    function getPendingDeactivations() external view override returns (uint16[] memory) {
        return pendingDeactivations;
    }
}
