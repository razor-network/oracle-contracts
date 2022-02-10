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
        int8 power,
        uint32 epoch,
        uint32 aggregationMethod,
        uint32 tolerance,
        uint16[] updatedJobIDs,
        uint256 timestamp
    );

    /// @param newDelegatorAddress The address of the Delegator contract
    function upgradeDelegator(address newDelegatorAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegatorAddress != address(0x0), "Zero Address check");
        delegator = IDelegator(newDelegatorAddress);
    }

    /// @notice Creates a Job in the network.
    /// @dev Jobs are not directly reported by staker but just stores the URL and its corresponding details
    /// @param weight specifies the weight the result of each job carries
    /// @param power is used to specify the decimal shifts required on the result of a Job query
    /// @param selectorType defines the selectorType of the URL. Can be JSON/XHTML
    /// @param name of the URL
    /// @param selector of the URL
    /// @param url to be used for retrieving the data
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

    /// @notice Updates a Job in the network.
    /// @param jobID the job id for which the details need to change
    /// @param weight specifies the weight the result of each job carries
    /// @param power is used to specify the decimal shifts required on the result of a Job query
    /// @param selectorType defines the selectorType of the URL. Can be JSON/XHTML
    /// @param selector of the URL
    /// @param url to be used for retrieving the data
    function updateJob(
        uint16 jobID,
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external onlyRole(COLLECTION_MODIFIER_ROLE) notState(State.Commit) {
        require(jobID != 0, "ID cannot be 0");
        require(jobs[jobID].id == jobID, "Job ID not present");
        require(weight <= 100, "Weight beyond max");

        uint32 epoch = _getEpoch();

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;
        jobs[jobID].selectorType = uint8(selectorType);
        jobs[jobID].weight = weight;
        jobs[jobID].power = power;
        emit JobUpdated(jobID, selectorType, epoch, weight, power, block.timestamp, selector, url);
    }

    /// @notice Sets the status of the collection in the network.
    /// @param assetStatus the status that needs to be set for the collection
    /// @param id the collection id for which the status needs to change
    function setCollectionStatus(bool assetStatus, uint16 id) external onlyRole(COLLECTION_MODIFIER_ROLE) checkState(State.Confirm) {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");
        require(assetStatus != collections[id].active, "status not being changed");

        uint32 epoch = _getEpoch();
        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch) {
            _updateRegistry();
        }

        if (!collections[id].active) {
            numActiveCollections = numActiveCollections + 1;
        } else {
            numActiveCollections = numActiveCollections - 1;
        }

        collections[id].active = assetStatus;
        updateRegistryEpoch = epoch + 1;
        emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
    }

    /// @notice Creates a collection in the network.
    /// @dev Collections are to be reported by staker by querying the URLs in each job assigned in the collection
    /// and aggregating them based on the aggregation method specified in the collection
    /// @param tolerance specifies the percentage by which the staker's value can deviate from the value decided by the network
    /// @param power is used to specify the decimal shifts required on the result of a Collection
    /// @param aggregationMethod specifies the aggregation method to be used by the stakers
    /// @param jobIDs an array that holds which jobs should the stakers query for the stakers to report for the collection
    /// @param name of the collection
    function createCollection(
        uint32 tolerance,
        int8 power,
        uint32 aggregationMethod,
        uint16[] memory jobIDs,
        string calldata name
    ) external onlyRole(COLLECTION_MODIFIER_ROLE) checkState(State.Confirm) {
        require(jobIDs.length > 0, "no jobs added");
        require(tolerance <= maxTolerance, "Invalid tolerance value");

        uint32 epoch = _getEpoch();

        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch) {
            _updateRegistry();
        }

        numCollections = numCollections + 1;

        collections[numCollections] = Structs.Collection(true, numCollections, power, tolerance, aggregationMethod, jobIDs, name);

        numActiveCollections = numActiveCollections + 1;
        updateRegistryEpoch = epoch + 1;
        emit CollectionCreated(numCollections, block.timestamp);

        delegator.setIDName(name, numCollections);
    }

    /// @notice Updates a Collection in the network.
    /// @param collectionID the collection id for which the details need to change
    /// @param tolerance specifies the percentage by which the staker's value can deviate from the value decided by the network
    /// @param aggregationMethod specifies the aggregation method to be used by the stakers
    /// @param power is used to specify the decimal shifts required on the result of a Collection
    /// @param jobIDs an array that holds which jobs should the stakers query for the stakers to report for the collection
    function updateCollection(
        uint16 collectionID,
        uint32 tolerance,
        uint32 aggregationMethod,
        int8 power,
        uint16[] memory jobIDs
    ) external onlyRole(COLLECTION_MODIFIER_ROLE) notState(State.Commit) {
        require(collectionID <= numCollections, "Collection ID not present");
        require(collections[collectionID].active, "Collection is inactive");
        require(tolerance <= maxTolerance, "Invalid tolerance value");
        uint32 epoch = _getEpoch();
        collections[collectionID].power = power;
        collections[collectionID].tolerance = tolerance;
        collections[collectionID].aggregationMethod = aggregationMethod;
        collections[collectionID].jobIDs = jobIDs;

        emit CollectionUpdated(collectionID, power, epoch, aggregationMethod, tolerance, jobIDs, block.timestamp);
    }

    /// @inheritdoc ICollectionManager
    function updateRegistry() external override onlyRole(REGISTRY_MODIFIER_ROLE) {
        _updateRegistry();
    }

    /// @param id the id of the job
    /// @return job the Struct of the job information
    function getJob(uint16 id) external view returns (Structs.Job memory job) {
        require(id != 0, "ID cannot be 0");
        require(id <= numJobs, "ID does not exist");

        return jobs[id];
    }

    /// @param id the id of the collection
    /// @return collection the Struct of the collection information
    function getCollection(uint16 id) external view returns (Structs.Collection memory collection) {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");

        return collections[id];
    }

    /// @inheritdoc ICollectionManager
    function getCollectionStatus(uint16 id) external view override returns (bool) {
        require(id <= numCollections, "ID does not exist");

        return collections[id].active;
    }

    /// @inheritdoc ICollectionManager
    function getCollectionTolerance(uint16 i) external view override returns (uint32) {
        return collections[indexToIdRegistry[i + 1]].tolerance;
    }

    /// @inheritdoc ICollectionManager
    function getCollectionPower(uint16 id) external view override returns (int8) {
        require(id <= numCollections, "ID does not exist");

        return collections[id].power;
    }

    /// @return total number of jobs
    function getNumJobs() external view returns (uint16) {
        return numJobs;
    }

    /// @inheritdoc ICollectionManager
    function getNumCollections() external view override returns (uint16) {
        return numCollections;
    }

    /// @inheritdoc ICollectionManager
    function getNumActiveCollections() external view override returns (uint256) {
        return numActiveCollections;
    }

    /// @inheritdoc ICollectionManager
    function getUpdateRegistryEpoch() external view override returns (uint32) {
        return updateRegistryEpoch;
    }

    /// @inheritdoc ICollectionManager
    function getIdToIndexRegistryValue(uint16 id) external view override returns (uint16) {
        return idToIndexRegistry[id];
    }

    function _updateRegistry() internal {
        uint16 j = 1;
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
