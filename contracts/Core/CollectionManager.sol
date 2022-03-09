// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/ICollectionManager.sol";
import "./interface/IBlockManager.sol";
import "./interface/IVoteManager.sol";
import "./storage/CollectionStorage.sol";
import "../Initializable.sol";
import "./parameters/child/CollectionManagerParams.sol";
import "./StateManager.sol";

contract CollectionManager is Initializable, CollectionStorage, StateManager, CollectionManagerParams, ICollectionManager {
    IBlockManager public blockManager;
    IVoteManager public voteManager;

    /**
     * @dev Emitted when a job has been created
     * @param id the id of the job that was created
     * @param timestamp time at which the job was created
     */
    event JobCreated(uint16 id, uint256 timestamp);

    /**
     * @dev Emitted when a collection has been created
     * @param id the id of the collection that was created
     * @param timestamp time at which the collection was created
     */
    event CollectionCreated(uint16 id, uint256 timestamp);

    /**
     * @dev Emitted when a job has been updated
     * @param id the id of the job that was updated
     * @param selectorType updated selector type of the job
     * @param epoch in which the job was updated
     * @param weight updated weight
     * @param power updated power
     * @param timestamp time at which the job was updated
     * @param selector updated selector
     * @param url updated url
     */
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

    /**
     * @dev Emiited when there is a change in status of an existing collection
     * @param active updated status of the collection
     * @param id of the collection for which the status has been changed
     * @param epoch in which the status change took place
     * @param timestamp time at which the status change took place
     */
    event CollectionActivityStatus(bool active, uint16 id, uint32 epoch, uint256 timestamp);

    /**
     * @dev Emitted when a collection has been updated
     * @param id the id of the collection that was updated
     * @param power updated power
     * @param epoch in which the collection was updated
     * @param aggregationMethod updated aggregationMethod
     * @param tolerance updated tolerance
     * @param updatedJobIDs updated job ids for the collections
     * @param timestamp time at which the collection was updated
     */
    event CollectionUpdated(
        uint16 id,
        int8 power,
        uint32 epoch,
        uint32 aggregationMethod,
        uint32 tolerance,
        uint16[] updatedJobIDs,
        uint256 timestamp
    );

    /**
     * @param voteManagerAddress The address of the Vote Manager contract
     * @param blockManagerAddress The address of the Block Manager contract
     */
    function initialize(address voteManagerAddress, address blockManagerAddress) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        voteManager = IVoteManager(voteManagerAddress);
        blockManager = IBlockManager(blockManagerAddress);
    }

    /** @notice Creates a Job in the network.
     * @dev Jobs are not directly reported by staker but just stores the URL and its corresponding details
     * @param weight specifies the weight the result of each job carries
     * @param power is used to specify the decimal shifts required on the result of a Job query
     * @param selectorType defines the selectorType of the URL. Can be JSON/XHTML
     * @param name of the URL
     * @param selector of the URL
     * @param url to be used for retrieving the data
     */
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

    /**
     * @notice Updates a Job in the network.
     * @param jobID the job id for which the details need to change
     * @param weight specifies the weight the result of each job carries
     * @param power is used to specify the decimal shifts required on the result of a Job query
     * @param selectorType defines the selectorType of the URL. Can be JSON/XHTML
     * @param selector of the URL
     * @param url to be used for retrieving the data
     */
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

    /** @notice Sets the status of the collection in the network.
     * @param assetStatus the status that needs to be set for the collection
     * @param id the collection id for which the status needs to change
     */
    function setCollectionStatus(bool assetStatus, uint16 id) external onlyRole(COLLECTION_MODIFIER_ROLE) checkState(State.Confirm) {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");
        require(assetStatus != collections[id].active, "status not being changed");

        uint32 epoch = _getEpoch();

        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch) {
            _updateDelayedRegistry();
        }

        if (!collections[id].active) {
            numActiveCollections = numActiveCollections + 1;
        } else {
            numActiveCollections = numActiveCollections - 1;
        }

        collections[id].active = assetStatus;
        updateRegistryEpoch = epoch + 1;
        _updateRegistry();

        emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
        voteManager.storeDepth(_getDepth()); // update depth now only, as from next epoch's commit it starts
    }

    /** @notice Creates a collection in the network.
     * @dev Collections are to be reported by staker by querying the URLs in each job assigned in the collection
     * and aggregating them based on the aggregation method specified in the collection
     * @param tolerance specifies the percentage by which the staker's value can deviate from the value decided by the network
     * @param power is used to specify the decimal shifts required on the result of a Collection
     * @param aggregationMethod specifies the aggregation method to be used by the stakers
     * @param jobIDs an array that holds which jobs should the stakers query for the stakers to report for the collection
     * @param name of the collection
     */
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
            _updateDelayedRegistry();
        }

        numCollections = numCollections + 1;

        collections[numCollections] = Structs.Collection(true, numCollections, power, tolerance, aggregationMethod, jobIDs, name);

        numActiveCollections = numActiveCollections + 1;

        updateRegistryEpoch = epoch + 1;
        _updateRegistry();

        emit CollectionCreated(numCollections, block.timestamp);

        _setIDName(name, numCollections);
        voteManager.storeDepth(_getDepth()); // TODO : Create method called as createCollectionBatch and update storeDepth only once
    }

    /** @notice Updates a Collection in the network.
     * @param collectionID the collection id for which the details need to change
     * @param tolerance specifies the percentage by which the staker's value can deviate from the value decided by the network
     * @param aggregationMethod specifies the aggregation method to be used by the stakers
     * @param power is used to specify the decimal shifts required on the result of a Collection
     * @param jobIDs an array that holds which jobs should the stakers query for the stakers to report for the collection
     */
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
    function updateDelayedRegistry() external override onlyRole(REGISTRY_MODIFIER_ROLE) {
        _updateDelayedRegistry();
    }

    /**
     * @param id the id of the job
     * @return job the Struct of the job information
     */
    function getJob(uint16 id) external view returns (Structs.Job memory job) {
        require(id != 0, "ID cannot be 0");
        require(id <= numJobs, "ID does not exist");

        return jobs[id];
    }

    /**
     * @param id the id of the collection
     * @return collection the Struct of the collection information
     */
    function getCollection(uint16 id) external view returns (Structs.Collection memory collection) {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");

        return collections[id];
    }

    /// @inheritdoc ICollectionManager
    function getResult(bytes32 _name) external view override returns (uint32, int8) {
        uint16 id = ids[_name];
        return getResultFromID(id);
    }

    /// @inheritdoc ICollectionManager
    function getCollectionStatus(uint16 id) external view override returns (bool) {
        return collections[id].active;
    }

    /// @inheritdoc ICollectionManager
    function getCollectionTolerance(uint16 i) external view override returns (uint32) {
        return collections[leafIdToCollectionIdRegistry[i]].tolerance;
    }

    /// @inheritdoc ICollectionManager
    function getCollectionPower(uint16 id) external view override returns (int8) {
        require(id <= numCollections, "ID does not exist");

        return collections[id].power;
    }

    /// @inheritdoc ICollectionManager
    function getCollectionID(bytes32 _hname) external view override returns (uint16) {
        return ids[_hname];
    }

    /**
     * @return total number of jobs
     */
    function getNumJobs() external view returns (uint16) {
        return numJobs;
    }

    /// @inheritdoc ICollectionManager
    function getNumCollections() external view override returns (uint16) {
        return numCollections;
    }

    /// @inheritdoc ICollectionManager
    function getNumActiveCollections() external view override returns (uint16) {
        return numActiveCollections;
    }

    /// @inheritdoc ICollectionManager
    function getUpdateRegistryEpoch() external view override returns (uint32) {
        return updateRegistryEpoch;
    }

    /// @inheritdoc ICollectionManager
    function getLeafIdOfCollection(uint16 id) external view override returns (uint16) {
        return collectionIdToLeafIdRegistry[id];
    }

    /// @inheritdoc ICollectionManager
    function getLeafIdOfCollectionForLastEpoch(uint16 id) external view override returns (uint16) {
        return collectionIdToLeafIdRegistryOfLastEpoch[id];
    }

    /// @inheritdoc ICollectionManager
    function getCollectionIdFromLeafId(uint16 leafId) external view override returns (uint16) {
        return leafIdToCollectionIdRegistry[leafId];
    }

    /**
     * @return array of active collections
     */
    function getActiveCollections() external view returns (uint16[] memory) {
        uint16[] memory result = new uint16[](numActiveCollections);
        uint16 j = 0;
        for (uint16 i = 1; i <= numCollections; i++) {
            if (collections[i].active) {
                result[j] = i;
                j = j + 1;
            }
        }
        return result;
    }

    /// @inheritdoc ICollectionManager
    function getResultFromID(uint16 _id) public view override returns (uint32, int8) {
        return (blockManager.getLatestResults(_id), collections[_id].power);
    }

    /**
     * @dev updates the collectionIdToLeafIdRegistry and leafIdToCollectionIdRegistry everytime a collection has been activated/deactivated/created
     */
    function _updateRegistry() internal {
        uint16 j = 0;
        for (uint16 i = 1; i <= numCollections; i++) {
            if (collections[i].active) {
                collectionIdToLeafIdRegistry[i] = j;
                leafIdToCollectionIdRegistry[j] = i;
                j = j + 1;
            } else {
                collectionIdToLeafIdRegistry[i] = 0;
            }
        }
    }

    function _updateDelayedRegistry() internal {
        uint16 j = 0;
        for (uint16 i = 1; i <= numCollections; i++) {
            if (collections[i].active) {
                collectionIdToLeafIdRegistryOfLastEpoch[i] = j;
                j = j + 1;
            } else {
                collectionIdToLeafIdRegistryOfLastEpoch[i] = 0;
            }
        }
    }

    /**
     * @dev hashes the name of the collection and the hashed value is mapped to its corresponding collection ID
     */
    function _setIDName(string calldata name, uint16 _id) internal {
        bytes32 _name = keccak256(abi.encodePacked(name));
        require(ids[_name] == 0, "Collection exists with same name");
        ids[_name] = _id;
    }

    /**
     * @dev calculates the current depth of the merkle tree that stakers have to submit at the time of commit/reveal
     */
    function _getDepth() internal view returns (uint256 n) {
        // numActiveCollection is uint16, so further range not needed
        // Inspired and modified from : https://medium.com/coinmonks/math-in-solidity-part-5-exponent-and-logarithm-9aef8515136e
        // TODO : Looks like there is better version compared in gas
        // https://ethereum.stackexchange.com/questions/8086/logarithm-math-operation-in-solidity/32900

        // 100000;
        // >= 2**4 , n = 4
        // 000010;
        // >= 2**1
        // n = n+ 1 == 5

        uint256 x = numActiveCollections;
        // X = 2 ** n ;

        // Optimised way
        // for (; x > 0; x >>= 1) {
        // if (x >= 2**8) { x >>= 8; n += 8; }
        // if (x >= 2**4) { x >>= 4; n += 4; }
        // if (x >= 2**2) { x >>= 2; n += 2; }
        // if (x >= 2**1) { x >>= 1; n += 1; }
        // if (x == 1) { x >>= 1; n += 1; }
        // }

        // for 6
        // 110
        // optimised version of above would return 2
        // 000
        // but we want 3
        // so we have to give importance to 1(1)0 as well
        // as in our case result for 100 and 110 is diff
        // so thats why we have to go unoptimised way

        // I dont know if we can use above optimised way and somehow detect that in middle(1) as well
        // So thats why lets have above as commented
        // and check in new issue, if we could do so

        //6
        //110, 6
        //011, 3
        //001, 1
        //000, 0

        // 8
        // 1000
        // 0100
        // 0010
        // 0001
        // 0000

        // Have tested function upto 2**16;
        bool flag = false;
        for (n = 0; x > 1; x >>= 1) {
            // O(n) 1<n<=16
            if (x % 2 != 0) flag = true; // for that (1)
            n += 1;
        }
        if (flag) n++;
    }
}
