// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IAssetManager.sol";
import "../IDelegator.sol";
import "./storage/AssetStorage.sol";
import "./parameters/child/AssetManagerParams.sol";
import "./storage/Constants.sol";
import "./StateManager.sol";
import "./ACL.sol";

contract AssetManager is ACL, AssetStorage, Constants, StateManager, AssetManagerParams, IAssetManager {
    IDelegator public delegator;

    event AssetCreated(AssetType assetType, uint8 id, uint256 timestamp);

    event JobUpdated(
        uint8 id,
        JobSelectorType selectorType,
        uint32 epoch,
        uint8 weight,
        int8 power,
        uint256 timestamp,
        string selector,
        string url
    );

    event CollectionActivityStatus(bool active, uint8 id, uint32 epoch, uint256 timestamp);

    event CollectionUpdated(uint8 id, uint32 epoch, uint32 aggregationMethod, int8 power, uint8[] updatedJobIDs, uint256 timestamp);

    constructor(address governanceAddress) {
        governance = governanceAddress;
    }

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
        uint8 jobID,
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external onlyRole(ASSET_MODIFIER_ROLE) notState(State.Commit, epochLength) {
        require(jobID != 0, "ID cannot be 0");
        require(jobs[jobID].id == jobID, "Job ID not present");
        require(weight <= 100, "Weight beyond max");

        uint32 epoch = getEpoch(epochLength);

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;
        jobs[jobID].selectorType = uint8(selectorType);
        jobs[jobID].weight = weight;
        jobs[jobID].power = power;
        emit JobUpdated(jobID, selectorType, epoch, weight, power, block.timestamp, selector, url);
    }

    function setCollectionStatus(bool assetStatus, uint8 id) external onlyRole(ASSET_MODIFIER_ROLE) checkState(State.Confirm, epochLength) {
        require(id != 0, "ID cannot be 0");
        require(collections[id].id == id, "Asset is not a collection");

        uint32 epoch = getEpoch(epochLength);
        if (assetStatus) {
            if (!collections[id].active) {
                activeAssets.push(id);
                collections[id].assetIndex = uint8(activeAssets.length);
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
        for (uint8 i = uint8(pendingDeactivations.length); i > 0; i--) {
            uint8 assetIndex = collections[pendingDeactivations[i - 1]].assetIndex;
            if (assetIndex == activeAssets.length) {
                activeAssets.pop();
            } else {
                activeAssets[assetIndex - 1] = activeAssets[activeAssets.length - 1];
                collections[activeAssets[assetIndex - 1]].assetIndex = assetIndex;
                activeAssets.pop();
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
        uint8[] memory jobIDs,
        uint32 aggregationMethod,
        int8 power,
        string calldata name
    ) external onlyRole(ASSET_MODIFIER_ROLE) checkState(State.Confirm, epochLength) {
        require(aggregationMethod > 0 && aggregationMethod < 3, "Aggregation range out of bounds");

        require(jobIDs.length > 0, "Number of jobIDs low to create collection");

        numAssets = numAssets + 1;

        activeAssets.push(numAssets);
        collections[numAssets] = Structs.Collection(true, numAssets, uint8(activeAssets.length), power, aggregationMethod, jobIDs, name);
        emit AssetCreated(AssetType.Collection, numAssets, block.timestamp);

        delegator.setIDName(name, numAssets);
    }

    function updateCollection(
        uint8 collectionID,
        uint32 aggregationMethod,
        int8 power,
        uint8[] memory jobIDs
    ) external onlyRole(ASSET_MODIFIER_ROLE) notState(State.Commit, epochLength) {
        require(collections[collectionID].id == collectionID, "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        uint32 epoch = getEpoch(epochLength);
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

    // function getResult(uint8 id) external view returns (uint32 result) {
    //     require(id != 0, "ID cannot be 0");
    //
    //     require(id <= numAssets, "ID does not exist");
    //
    //     if (jobs[id].assetType == uint8(AssetTypes.Job)) {
    //         return jobs[id].result;
    //     } else {
    //         return collections[id].result;
    //     }
    // }

    function getAsset(uint8 id) external view returns (Structs.Job memory job, Structs.Collection memory collection) {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        return (jobs[id], collections[id]);
    }

    function getCollectionStatus(uint8 id) external view returns (bool) {
        require(collections[id].id == id, "Asset is not a collection");

        return collections[id].active;
    }

    function getAssetIndex(uint8 id) external view override returns (uint8) {
        return collections[id].assetIndex;
    }

    function getCollectionPower(uint8 id) external view override returns (int8) {
        require(collections[id].id == id, "Asset is not a collection");

        return collections[id].power;
    }

    function getNumAssets() external view returns (uint8) {
        return numAssets;
    }

    function getActiveAssets() external view override returns (uint8[] memory) {
        return activeAssets;
    }

    function getNumActiveAssets() external view override returns (uint256) {
        return activeAssets.length;
    }

    function getPendingDeactivations() external view override returns (uint8[] memory) {
        return pendingDeactivations;
    }
}
