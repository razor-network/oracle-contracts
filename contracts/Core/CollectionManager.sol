// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/ICollectionManager.sol";
import "./interface/IBlockManager.sol";
import "./interface/IBondManager.sol";
import "./interface/IVoteManager.sol";
import "./storage/CollectionStorage.sol";
import "../Initializable.sol";
import "./parameters/child/CollectionManagerParams.sol";
import "./StateManager.sol";

contract CollectionManager is Initializable, CollectionStorage, StateManager, CollectionManagerParams, ICollectionManager {
    IVoteManager public voteManager;
    IBondManager public bondManager;

    /**
     * @dev Emitted when a job has been created
     * @param id the id of the job that was created
     * @param timestamp time at which the job was created
     */
    event JobCreated(uint16 indexed id, uint256 timestamp);

    /**
     * @dev Emitted when a collection has been created
     * @param id the id of the collection that was created
     * @param timestamp time at which the collection was created
     */
    event CollectionCreated(uint16 indexed id, uint256 timestamp);

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
        uint16 indexed id,
        JobSelectorType selectorType,
        uint32 indexed epoch,
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
    event CollectionActivityStatus(bool active, uint16 indexed id, uint32 indexed epoch, uint256 timestamp);

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
        uint16 indexed id,
        int8 power,
        uint32 indexed epoch,
        uint32 aggregationMethod,
        uint32 tolerance,
        uint16[] updatedJobIDs,
        uint256 timestamp
    );

    /**
     * @param voteManagerAddress The address of the Vote Manager contract
     * @param bondManagerAddress The address of the Bond Manager contract
     */
    function initialize(address voteManagerAddress, address bondManagerAddress) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        voteManager = IVoteManager(voteManagerAddress);
        bondManager = IBondManager(bondManagerAddress);
    }

    /// @inheritdoc ICollectionManager
    function createMulJob(Structs.Job[] memory mulJobs) external override onlyRole(COLLECTION_MODIFIER_ROLE) returns (uint16[] memory) {
        uint16[] memory jobIds = new uint16[](mulJobs.length);
        for (uint8 i = 0; i < mulJobs.length; i++) {
            require(mulJobs[i].weight <= 100, "Weight beyond max");

            // slither-disable-next-line costly-loop
            numJobs = numJobs + 1;

            jobs[numJobs] = Structs.Job(
                numJobs,
                uint8(mulJobs[i].selectorType),
                mulJobs[i].weight,
                mulJobs[i].power,
                mulJobs[i].name,
                mulJobs[i].selector,
                mulJobs[i].url
            );
            jobIds[i] = numJobs;

            emit JobCreated(numJobs, block.timestamp);
        }
        return jobIds;
    }

    /// @inheritdoc ICollectionManager
    function updateJob(
        uint16 jobID,
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external override initialized onlyRole(COLLECTION_MODIFIER_ROLE) notState(State.Commit, buffer) {
        require(jobID != 0, "ID cannot be 0");
        require(jobs[jobID].id == jobID, "Job ID not present");
        require(weight <= 100, "Weight beyond max");

        uint32 epoch = getEpoch();

        jobs[jobID].url = url;
        jobs[jobID].selector = selector;
        jobs[jobID].selectorType = uint8(selectorType);
        jobs[jobID].weight = weight;
        jobs[jobID].power = power;
        emit JobUpdated(jobID, selectorType, epoch, weight, power, block.timestamp, selector, url);
    }

    /// @inheritdoc ICollectionManager
    function setCollectionStatus(bool assetStatus, uint16 id)
        external
        override
        initialized
        onlyRole(COLLECTION_MODIFIER_ROLE)
        checkState(State.Confirm, buffer)
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");

        uint32 epoch = getEpoch();

        if (assetStatus) {
            if (!collections[id].active) {
                numActiveCollections = numActiveCollections + 1;
                collections[id].active = assetStatus;
            }
        } else {
            if (collections[id].active) {
                numActiveCollections = numActiveCollections - 1;
                collections[id].active = assetStatus;
            }
        }

        _updateRegistry();

        emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
        voteManager.storeDepth(getDepth(numActiveCollections)); // update depth now only, as from next epoch's commit it starts
    }

    /// @inheritdoc ICollectionManager
    function createCollection(
        uint32 tolerance,
        int8 power,
        uint16 occurrence,
        uint32 aggregationMethod,
        uint16[] memory jobIDs,
        string calldata name
    ) external override initialized onlyRole(COLLECTION_MODIFIER_ROLE) checkState(State.Confirm, buffer) returns (uint16) {
        require(jobIDs.length > 0, "no jobs added");
        require(tolerance <= maxTolerance, "Invalid tolerance value");

        uint256 jobsLength = jobIDs.length;
        for (uint8 i = 0; i < jobsLength; i++) {
            require(jobs[jobIDs[i]].id == jobIDs[i], "job not present");
        }

        numCollections = numCollections + 1;

        collections[numCollections] = Structs.Collection(
            true,
            numCollections,
            occurrence,
            power,
            0,
            tolerance,
            aggregationMethod,
            jobIDs,
            name,
            0
        );

        numActiveCollections = numActiveCollections + 1;

        _updateRegistry();

        emit CollectionCreated(numCollections, block.timestamp);

        _setIDName(name, numCollections);
        voteManager.storeDepth(getDepth(numActiveCollections)); // TODO : Create method called as createCollectionBatch and update storeDepth only once

        return numCollections;
    }

    /// @inheritdoc ICollectionManager
    function updateCollection(
        uint16 collectionID,
        uint32 tolerance,
        uint32 aggregationMethod,
        int8 power,
        uint16[] memory jobIDs
    ) external override initialized onlyRole(COLLECTION_MODIFIER_ROLE) notState(State.Commit, buffer) {
        require(jobIDs.length > 0, "no jobs added");
        require(collectionID <= numCollections, "Collection ID not present");
        require(tolerance <= maxTolerance, "Invalid tolerance value");
        uint32 epoch = getEpoch();

        uint256 jobsLength = jobIDs.length;
        for (uint8 i = 0; i < jobsLength; i++) {
            require(jobs[jobIDs[i]].id == jobIDs[i], "job not present");
        }

        collections[collectionID].power = power;
        collections[collectionID].tolerance = tolerance;
        collections[collectionID].aggregationMethod = aggregationMethod;
        collections[collectionID].jobIDs = jobIDs;

        emit CollectionUpdated(collectionID, power, epoch, aggregationMethod, tolerance, jobIDs, block.timestamp);
    }

    function setResult(
        uint32 epoch,
        uint16[] memory blockIds,
        uint256[] memory medians
    ) external override onlyRole(COLLECTION_CONFIRMER_ROLE) {
        bool toBeUpdated = false;
        uint16 _numActiveCollections = numActiveCollections;
        for (uint256 i = 0; i < blockIds.length; i++) {
            uint16 collectionId = blockIds[i];
            collections[collectionId].result = medians[i];
            collections[collectionId].epochLastReported = epoch;
            if (collections[collectionId].epochLastReported + collections[collectionId].occurrence != epoch + 1) {
                _numActiveCollections = _numActiveCollections - 1;
                collections[collectionId].active = false;
                toBeUpdated = true;
            }
        }

        uint16[] memory databondCollectionIds = bondManager.getDatabondCollections();
        for (uint256 i = 0; i < databondCollectionIds.length; i++) {
            uint16 collectionId = databondCollectionIds[i];
            if (
                collections[collectionId].epochLastReported + collections[collectionId].occurrence == epoch + 1 &&
                !collections[collectionId].active
            ) {
                _numActiveCollections = _numActiveCollections + 1;
                collections[collectionId].active = true;
                toBeUpdated = true;
            }
        }

        if (toBeUpdated) {
            _updateRegistry();
            numActiveCollections = _numActiveCollections;
        }
    }

    function setCollectionOccurrence(uint16 collectionId, uint16 occurrence) external override onlyRole(OCCURRENCE_MODIFIER_ROLE) {
        collections[collectionId].occurrence = occurrence;
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
    function getResult(bytes32 _name) external view override returns (uint256, int8) {
        uint16 id = ids[_name];
        return getResultFromID(id);
    }

    /// @inheritdoc ICollectionManager
    function getCollectionStatus(uint16 id) external view override returns (bool) {
        return collections[id].active;
    }

    /// @inheritdoc ICollectionManager
    function getCollectionTolerance(uint16 id) external view override returns (uint32) {
        return collections[id].tolerance;
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

    /// @inheritdoc ICollectionManager
    function getNumJobs() external view override returns (uint16) {
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
    function getCollectionIdFromLeafId(uint16 leafId) external view override returns (uint16) {
        return leafIdToCollectionIdRegistry[leafId];
    }

    /**
     * @return array of active collections
     */
    function getActiveCollections() external view override returns (uint16[] memory) {
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
    function getResultFromID(uint16 _id) public view override returns (uint256, int8) {
        return (collections[_id].result, collections[_id].power);
    }

    /**
     * @dev calculates the current depth of the merkle tree that stakers have to submit at the time of commit/reveal
     * @ return the depth of the MerkleTree
     * @param numberOfCollections number of collections
     */
    function getDepth(uint256 numberOfCollections) public pure returns (uint256 n) {
        // numActiveCollection is uint16, so further range not needed
        // Inspired and modified from : https://medium.com/coinmonks/math-in-solidity-part-5-exponent-and-logarithm-9aef8515136e

        // 100000;
        // >= 2**4 , n = 4
        // 000010;
        // >= 2**1
        // n = n+ 1 == 5

        uint256 x = numberOfCollections;

        if (x > 0) {
            x = x - 1;
            // Optimised way
            for (; x > 0; x >>= 1) {
                if (x >= 2**8) {
                    x >>= 8;
                    n += 8;
                }
                if (x >= 2**4) {
                    x >>= 4;
                    n += 4;
                }
                if (x >= 2**2) {
                    x >>= 2;
                    n += 2;
                }
                if (x >= 2**1) {
                    x >>= 1;
                    n += 1;
                }
                if (x == 1) {
                    x >>= 1;
                    n += 1;
                }
            }
        }
    }

    /**
     * @dev updates the collectionIdToLeafIdRegistry and leafIdToCollectionIdRegistry everytime a collection has been activated/deactivated/created
     * being called by setCollectionStatus and createCollection in CollectionManager
     */
    function _updateRegistry() internal {
        uint16 j = 0;
        for (uint16 i = 1; i <= numCollections; i++) {
            if (collections[i].active) {
                leafIdToCollectionIdRegistry[j] = i;
                j = j + 1;
            }
        }
    }

    /**
     * @dev hashes the name of the collection and the hashed value is mapped to its corresponding collection ID
     * @param name the name of collection
     * @param _id the id of the collection
     */
    function _setIDName(string calldata name, uint16 _id) internal {
        bytes32 _name = keccak256(abi.encodePacked(name));
        require(ids[_name] == 0, "Collection exists with same name");
        ids[_name] = _id;
    }
}
