// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/ICollectionManager.sol";
import "../IDelegator.sol";
import "./interface/IVoteManager.sol";
import "./storage/CollectionStorage.sol";
import "./parameters/child/CollectionManagerParams.sol";
import "./StateManager.sol";
import "../Initializable.sol";

contract CollectionManager is Initializable, CollectionStorage, StateManager, CollectionManagerParams, ICollectionManager {
    IDelegator public delegator;
    IVoteManager public voteManager;

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

    function initialize(address voteManagerAddress) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        voteManager = IVoteManager(voteManagerAddress);
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
        initialized
        onlyRole(COLLECTION_MODIFIER_ROLE)
        checkState(State.Confirm, epochLength)
    {
        require(id != 0, "ID cannot be 0");
        require(id <= numCollections, "ID does not exist");
        require(assetStatus != collections[id].active, "status not being changed");

        uint32 epoch = _getEpoch(epochLength);
        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch) {
            // @dev : doubt @samAG9
            _updateRegistry();
        }
        _updateRegistryFuture();

        if (!collections[id].active) {
            numActiveCollections = numActiveCollections + 1;
        } else {
            numActiveCollections = numActiveCollections - 1;
        }

        collections[id].active = assetStatus;
        updateRegistryEpoch = epoch + 1;
        emit CollectionActivityStatus(collections[id].active, id, epoch, block.timestamp);
        voteManager.storeDepth(_getDepth()); // update depth now only, as from next epoch's commit it starts
    }

    function createCollection(
        uint16 tolerance,
        int8 power,
        uint32 aggregationMethod,
        uint16[] memory jobIDs,
        string calldata name
    ) external initialized onlyRole(COLLECTION_MODIFIER_ROLE) checkState(State.Confirm, epochLength) {
        require(jobIDs.length > 0, "no jobs added");
        require(tolerance <= maxTolerance, "Invalid tolerance value");

        uint32 epoch = _getEpoch(epochLength);

        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch) {
            _updateRegistry();
        }
        _updateRegistryFuture();
        numCollections = numCollections + 1;

        collections[numCollections] = Structs.Collection(true, numCollections, tolerance, power, aggregationMethod, jobIDs, name);

        numActiveCollections = numActiveCollections + 1;
        updateRegistryEpoch = epoch + 1;
        emit CollectionCreated(numCollections, block.timestamp);

        delegator.setIDName(name, numCollections);
        voteManager.storeDepth(_getDepth()); // TODO : Create method called as createCollectionBatch and update storeDepth only once
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

    function getNumActiveCollections() external view override returns (uint16) {
        return numActiveCollections;
    }

    function getUpdateRegistryEpoch() external view override returns (uint32) {
        return updateRegistryEpoch;
    }

    function getIdToIndexRegistryValue(uint16 id) external view override returns (uint16) {
        return idToIndexRegistry[id];
    }

    function getIndexToIdFutureRegistryValue(uint16 index) external view override returns (uint16) {
        return indexToIdRegistryFuture[index];
    }

    function _updateRegistry() internal {
        uint16 j = 1;
        for (uint16 i = 1; i <= numCollections; i++) {
            if (collections[i].active) {
                idToIndexRegistry[i] = j;
                // todo : opt : can we use future reg and assign directly, would save this SSTORE
                indexToIdRegistry[j] = i;
                j = j + 1;
            } else {
                idToIndexRegistry[i] = 0;
            }
        }
    }

    function _updateRegistryFuture() internal {
        uint16 j = 1;
        for (uint16 i = 1; i <= numCollections; i++) {
            if (collections[i].active) {
                indexToIdRegistryFuture[j] = i;
                j = j + 1;
            } else {
                indexToIdRegistryFuture[i] = 0;
            }
        }
    }

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
        bool flag;
        for (n = 0; x > 1; x >>= 1) {
            // O(n) 1<n<=16
            if (x % 2 != 0) flag = true; // for that (1)
            n += 1;
        }
        if (flag) n++;
    }
}
