// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/ICollectionManager.sol";
import "../IDelegator.sol";
import "./storage/CollectionStorage.sol";
import "./parameters/child/CollectionManagerParams.sol";
import "./StateManager.sol";

contract CollectionManager is CollectionStorage, StateManager, CollectionManagerParams, ICollectionManager {
    IDelegator public delegator;

    event JobCreated(uint16 id, uint256 timestamp);

    event CollectionCreated(uint16 id, uint256 timestamp);

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

    event CollectionUpdated(
        uint16 id,
        uint32 epoch,
        uint32 aggregationMethod,
        int8 power,
        uint16 tolerance,
        uint16[] updatedJobIDs,
        uint256 timestamp
    );

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
    ) external onlyRole(COLLECTION_MODIFIER_ROLE) {
        require(weight <= 100, "Weight beyond max");
        numJobs = numJobs + 1;

        jobs[numJobs] = Structs.Job(numJobs, uint8(selectorType), weight, power, name, selector, url);

        emit JobCreated(numJobs, block.timestamp);
    }

    function updateJob(
        uint16 jobID,
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external onlyRole(COLLECTION_MODIFIER_ROLE) notState(State.Commit, epochLength) {
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
        onlyRole(COLLECTION_MODIFIER_ROLE)
        checkState(State.Confirm, epochLength)
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");

        uint32 epoch = _getEpoch(epochLength);
        if (assetStatus) {
            if (!collections[id].active) {
                // slither-disable-next-line incorrect-equality
                if (updateRegistryEpoch == epoch) {
                    _updateRegistry();
                }
                numActiveCollections = numActiveCollections + 1;
                collections[id].active = assetStatus;
                updateRegistryEpoch = epoch + 1;
                emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
            }
        } else {
            if (collections[id].active) {
                // slither-disable-next-line incorrect-equality
                if (updateRegistryEpoch == epoch) {
                    _updateRegistry();
                }
                numActiveCollections = numActiveCollections - 1;
                collections[id].active = assetStatus;
                updateRegistryEpoch = epoch + 1;
                emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
            }
        }
    }

    function createCollection(
        uint16 tolerance,
        int8 power,
        uint32 aggregationMethod,
        uint16[] memory jobIDs,
        string calldata name
    ) external onlyRole(COLLECTION_MODIFIER_ROLE) checkState(State.Confirm, epochLength) {
        require(jobIDs.length > 0, "no jobs added");
        require(tolerance <= maxTolerance, "Invalid tolerance value");

        uint32 epoch = _getEpoch(epochLength);

        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch == epoch) {
            _updateRegistry();
        }

        numCollections = numCollections + 1;

        collections[numCollections] = Structs.Collection(true, numCollections, tolerance, power, aggregationMethod, jobIDs, name);

        numActiveCollections = numActiveCollections + 1;
        updateRegistryEpoch = epoch + 1;
        emit CollectionCreated(numCollections, block.timestamp);

        delegator.setIDName(name, numCollections);
    }

    function updateCollection(
        uint16 collectionID,
        uint16 tolerance,
        uint32 aggregationMethod,
        int8 power,
        uint16[] memory jobIDs
    ) external onlyRole(COLLECTION_MODIFIER_ROLE) notState(State.Commit, epochLength) {
        require(collectionID <= numCollections, "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        require(tolerance <= maxTolerance, "Invalid tolerance value");
        uint32 epoch = _getEpoch(epochLength);
        collections[collectionID].power = power;
        collections[collectionID].tolerance = tolerance;
        collections[collectionID].aggregationMethod = aggregationMethod;
        collections[collectionID].jobIDs = jobIDs;

        emit CollectionUpdated(collectionID, epoch, aggregationMethod, power, tolerance, jobIDs, block.timestamp);
    }

    function updateRegistry() external override onlyRole(REGISTRY_MODIFIER_ROLE) {
        _updateRegistry();
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
        require(id <= numCollections, "ID does not exist");

        return collections[id].active;
    }

    function getCollectionTolerance(uint16 i) external view override returns (uint16) {
        return collections[indexToIdRegistry[i + 1]].tolerance;
    }

    function getCollectionPower(uint16 id) external view override returns (int8) {
        require(id <= numCollections, "ID does not exist");

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
        return updateRegistryEpoch;
    }

    function getIdToIndexRegistryValue(uint16 id) external view override returns (uint16) {
        return idToIndexRegistry[id];
    }

    function _updateRegistry() internal {
        uint8 j = 1;
        for (uint16 i = 1; i <= numCollections; i++) {
            if (collections[i].active) {
                idToIndexRegistry[i] = j;
                indexToIdRegistry[j] = i;
                j = j + 1;
            } else {
                idToIndexRegistry[i] = 0;
            }
        }
    }
}
