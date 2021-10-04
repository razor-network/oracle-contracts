// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./interface/IAssetManager.sol";
import "../IDelegator.sol";
import "./storage/AssetStorage.sol";
import "./storage/Constants.sol";
import "./StateManager.sol";
import "./ACL.sol";

contract AssetManager is ACL, AssetStorage, Constants, StateManager, IAssetManager {
    IParameters public parameters;
    IDelegator public delegator;

    event AssetCreated(Structs.Job job, Structs.Collection collection, uint256 timestamp);

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

    event AssetActivityStatus(bool active, uint8 id, uint32 epoch, uint256 timestamp);

    event CollectionUpdated(uint8 id, uint32 epoch, uint32 aggregationMethod, int8 power, uint8[] updatedJobIDs, uint256 timestamp);

    constructor(address parametersAddress) {
        parameters = IParameters(parametersAddress);
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

        jobs[numAssets] = Structs.Job(true, numAssets, uint8(selectorType), weight, power, name, selector, url);

        emit AssetCreated(jobs[numAssets], Structs.Collection(false, 0, 0, 0, 0, new uint8[](0), ""), block.timestamp);
        delegator.setIDName(name, numAssets);
    }

    function updateJob(
        uint8 jobID,
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external onlyRole(ASSET_MODIFIER_ROLE) notState(State.Commit, parameters.epochLength()) {
        require(jobs[jobID].id == jobID, "Job ID not present");
        require(weight <= 100, "Weight beyond max");

        uint32 epoch = parameters.getEpoch();

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;
        jobs[jobID].selectorType = uint8(selectorType);
        jobs[jobID].weight = weight;
        jobs[jobID].power = power;
        emit JobUpdated(jobID, selectorType, epoch, weight, power, block.timestamp, selector, url);
    }

    function setAssetStatus(bool assetStatus, uint8 id)
        external
        onlyRole(ASSET_MODIFIER_ROLE)
        checkState(State.Confirm, parameters.epochLength())
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");
        require(collections[id].id == id, "incorrect id being deactivated");

        uint32 epoch = parameters.getEpoch();
        if (assetStatus) {
            if (!collections[id].active) {
                activeAssets.push(id);
                collections[id].assetIndex = uint8(activeAssets.length);
                collections[id].active = assetStatus;
                emit AssetActivityStatus(collections[id].active, id, epoch, block.timestamp);
            }
        } else {
            if (collections[id].active) {
                pendingDeactivations.push(id);
            }
        }
    }

    function deactivateCollection(uint32 epoch, uint8 id) external override onlyRole(ASSET_CONFIRMER_ROLE) returns (uint8) {
        uint8 assetIndex = collections[id].assetIndex;
        if (assetIndex == activeAssets.length) {
            activeAssets.pop();
        } else {
            activeAssets[assetIndex - 1] = activeAssets[activeAssets.length - 1];
            collections[activeAssets[assetIndex - 1]].assetIndex = assetIndex;
            activeAssets.pop();
        }
        collections[id].assetIndex = 0;
        collections[id].active = false;
        emit AssetActivityStatus(collections[id].active, id, epoch, block.timestamp);
        pendingDeactivations.pop();
        return assetIndex;
    }

    function createCollection(
        uint8[] memory jobIDs,
        uint32 aggregationMethod,
        int8 power,
        string calldata name
    ) external onlyRole(ASSET_MODIFIER_ROLE) checkState(State.Confirm, parameters.epochLength()) {
        require(aggregationMethod > 0 && aggregationMethod < parameters.aggregationRange(), "Aggregation range out of bounds");

        require(jobIDs.length > 0, "Number of jobIDs low to create collection");

        numAssets = numAssets + 1;

        for (uint8 i = 0; i < jobIDs.length; i++) {
            require(jobs[jobIDs[i]].id == jobIDs[i], "Job ID not present");
        }

        activeAssets.push(numAssets);
        collections[numAssets] = Structs.Collection(true, numAssets, uint8(activeAssets.length), power, aggregationMethod, jobIDs, name);
        emit AssetCreated(Structs.Job(false, 0, 0, 0, 0, "", "", ""), collections[numAssets], block.timestamp);

        delegator.setIDName(name, numAssets);
    }

    function updateCollection(
        uint8 collectionID,
        uint32 aggregationMethod,
        int8 power,
        uint8[] memory jobIDs
    ) external onlyRole(ASSET_MODIFIER_ROLE) notState(State.Commit, parameters.epochLength()) {
        require(collections[collectionID].id == collectionID, "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        uint32 epoch = parameters.getEpoch();
        collections[collectionID].power = power;
        collections[collectionID].aggregationMethod = aggregationMethod;
        for (uint8 i = 0; i < jobIDs.length; i++) {
            require(jobs[jobIDs[i]].id == jobIDs[i], "Job ID not present");
        }
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

    function getActiveStatus(uint8 id) external view returns (bool) {
        require(id != 0, "ID cannot be 0");
        require(id <= numAssets, "ID does not exist");

        return collections[id].active;
    }

    function getAssetIndex(uint8 id) external view override returns (uint8) {
        return collections[id].assetIndex;
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
