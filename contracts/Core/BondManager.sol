// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "./interface/ICollectionManager.sol";
import "./interface/IBondManager.sol";
import "./parameters/child/BondManagerParams.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./storage/BondStorage.sol";
import "./StateManager.sol";
import "../lib/Structs.sol";
import "../Initializable.sol";
import "../Pause.sol";

contract BondManager is Initializable, BondStorage, StateManager, Pause, BondManagerParams, IBondManager {
    ICollectionManager public collectionManager;
    IERC20 public razor;

    modifier databondCreatorCheck(uint32 bondId, address databondCreator) {
        require(databonds[bondId].bondCreator == databondCreator, "invalid access to databond");
        _;
    }

    /**
     * @param razorAddress The address of the Razor token ERC20 contract
     * @param collectionManagerAddress The address of the CollectionManager contract
     */
    function initialize(address razorAddress, address collectionManagerAddress) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        collectionManager = ICollectionManager(collectionManagerAddress);
        razor = IERC20(razorAddress);
    }

    function createBond(
        uint32 epoch,
        Structs.Job[] memory mulJobs,
        uint256 bond,
        uint16 occurrence,
        int8 collectionPower,
        uint32 collectionTolerance,
        uint32 collectionAggregation,
        string calldata collectionName
    ) external initialized checkEpochAndState(State.Confirm, epoch, buffer) whenNotPaused {
        // minJobs=>governance param
        require(mulJobs.length >= minJobs, "invalid bond creation");
        require(mulJobs.length <= maxJobs, "number of jobs exceed maxJobs");
        require(minBond <= bond, "minBond not satisfied");

        numDataBond = numDataBond + 1;

        {
            uint256 minOccurrence = (mulJobs.length * depositPerJob) / bond;
            if (minOccurrence == 0) minOccurrence = 1;
            require(minOccurrence <= occurrence, "not enough bond paid per job");
        }
        // slither-disable-next-line reentrancy-benign
        uint16[] memory jobIds = collectionManager.createMulJob(mulJobs);
        // slither-disable-next-line reentrancy-benign
        uint16 collectionId = collectionManager.createCollection(
            collectionTolerance,
            collectionPower,
            occurrence,
            collectionAggregation,
            jobIds,
            collectionName
        );

        databonds[numDataBond] = Structs.DataBond(true, collectionId, occurrence, numDataBond, epoch, msg.sender, jobIds, bond);
        databondCollections.push(collectionId);

        require(razor.transferFrom(msg.sender, address(this), bond), "invalid transfer");
    }

    function updateDataBondJob(
        uint32 bondId,
        uint8 jobIndex,
        uint8 weight,
        int8 power,
        JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external databondCreatorCheck(bondId, msg.sender) {
        uint32 epoch = getEpoch();
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdated + epochLimitForUpdateBond <= epoch, "invalid databond update");

        databonds[bondId].epochBondLastUpdated = epoch;

        collectionManager.updateJob(databonds[bondId].jobIds[jobIndex], weight, power, selectorType, selector, url);
    }

    function updateDataBondCollection(
        uint32 bondId,
        uint16 collectionId,
        uint16 desiredOccurrence,
        uint32 tolerance,
        uint32 aggregationMethod,
        int8 power,
        uint16[] memory jobIds
    ) external databondCreatorCheck(bondId, msg.sender) {
        uint32 epoch = getEpoch();
        require(jobIds.length >= minJobs, "invalid bond updation");
        require(jobIds.length <= maxJobs, "number of jobs exceed maxJobs");
        require(databonds[bondId].collectionId == collectionId, "incorrect collectionId specified");
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdated + epochLimitForUpdateBond <= epoch, "invalid databond update");

        databonds[bondId].epochBondLastUpdated = epoch;
        databonds[bondId].jobIds = jobIds;

        uint256 minOccurrence = (databonds[bondId].jobIds.length * depositPerJob) / databonds[bondId].bond;
        if (minOccurrence == 0) minOccurrence = 1;
        require(minOccurrence <= desiredOccurrence, "not enough bond paid per job");
        if (desiredOccurrence != databonds[bondId].desiredOccurrence) {
            databonds[bondId].desiredOccurrence = uint16(desiredOccurrence);
            collectionManager.setCollectionOccurrence(databonds[bondId].collectionId, uint16(desiredOccurrence));
        }

        collectionManager.updateCollection(collectionId, tolerance, aggregationMethod, power, jobIds);
    }

    function addJobsToCollection(
        uint32 bondId,
        Structs.Job[] memory jobs,
        uint16 desiredOccurrence,
        int8 collectionPower,
        uint32 collectionTolerance,
        uint32 collectionAggregation
    ) external databondCreatorCheck(bondId, msg.sender) {
        require((databonds[bondId].jobIds.length + jobs.length) <= maxJobs, "number of jobs exceed maxJobs");

        // Add jobs to databond
        {
            uint32 epoch = getEpoch();
            // slither-disable-next-line timestamp
            require(databonds[bondId].epochBondLastUpdated + epochLimitForUpdateBond <= epoch, "invalid databond update");
            uint16 numJobs = collectionManager.getNumJobs();

            for (uint16 i = numJobs + 1; i <= numJobs + jobs.length; i++) {
                databonds[bondId].jobIds.push(i);
            }
            databonds[bondId].epochBondLastUpdated = epoch;
        }

        // Change occurrence
        {
            uint256 minOccurrence = ((databonds[bondId].jobIds.length) * depositPerJob) / databonds[bondId].bond;
            if (minOccurrence == 0) minOccurrence = 1;
            require(minOccurrence <= desiredOccurrence, "not enough bond paid per job");

            if (desiredOccurrence != databonds[bondId].desiredOccurrence) {
                databonds[bondId].desiredOccurrence = uint16(desiredOccurrence);
                collectionManager.setCollectionOccurrence(databonds[bondId].collectionId, uint16(desiredOccurrence));
            }
        }

        // slither-disable-next-line unused-return
        collectionManager.createMulJob(jobs);

        collectionManager.updateCollection(
            databonds[bondId].collectionId,
            collectionTolerance,
            collectionAggregation,
            collectionPower,
            databonds[bondId].jobIds
        );
    }

    function addBond(
        uint32 bondId,
        uint256 bond,
        uint16 desiredOccurrence
    ) external databondCreatorCheck(bondId, msg.sender) {
        databonds[bondId].bond = databonds[bondId].bond + bond;
        uint256 minOccurrence = (databonds[bondId].jobIds.length * depositPerJob) / databonds[bondId].bond;
        if (minOccurrence == 0) minOccurrence = 1;
        require(minOccurrence <= desiredOccurrence, "not enough bond paid per job");

        if (desiredOccurrence != databonds[bondId].desiredOccurrence) {
            databonds[bondId].desiredOccurrence = uint16(desiredOccurrence);
            collectionManager.setCollectionOccurrence(databonds[bondId].collectionId, uint16(desiredOccurrence));
        }

        require(razor.transferFrom(msg.sender, address(this), bond), "invalid transfer");
    }

    function unstakeBond(uint32 bondId, uint256 bond) external databondCreatorCheck(bondId, msg.sender) checkState(State.Confirm, buffer) {
        uint32 epoch = getEpoch();
        require(bond > 0, "bond being unstaked cant be 0");
        require(databonds[bondId].bond >= bond, "invalid bond amount");
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdated + epochLimitForUpdateBond <= epoch, "databond been updated recently");

        databonds[bondId].bond = databonds[bondId].bond - bond;
        bondLocks[bondId][msg.sender] = Structs.Lock(bond, epoch + withdrawLockPeriod);

        if (databonds[bondId].bond < minBond && databonds[bondId].active) {
            for (uint8 i = 0; i < databondCollections.length; i++) {
                if (databondCollections[i] == databonds[bondId].collectionId) {
                    databondCollections[i] = databondCollections[databondCollections.length - 1];
                    // slither-disable-next-line costly-loop
                    databondCollections.pop();
                    break;
                }
            }
            databonds[bondId].active = false;
            collectionManager.setCollectionStatus(false, databonds[bondId].collectionId);
        }
    }

    function withdrawBond(uint32 bondId) external databondCreatorCheck(bondId, msg.sender) {
        uint32 epoch = getEpoch();
        require(bondLocks[bondId][msg.sender].amount != 0, "no lock created");
        // slither-disable-next-line timestamp
        require(bondLocks[bondId][msg.sender].unlockAfter <= epoch, "Withdraw epoch not reached");

        uint256 withdrawAmount = bondLocks[bondId][msg.sender].amount;
        bondLocks[bondId][msg.sender] = Structs.Lock(0, 0);

        require(razor.transfer(msg.sender, withdrawAmount), "couldnt transfer");
    }

    function setDatabondStatus(bool databondStatus, uint16 bondId) external databondCreatorCheck(bondId, msg.sender) {
        uint32 epoch = getEpoch();
        require(databondStatus != databonds[bondId].active, "status not being changed");
        require(databonds[bondId].bond >= minBond, "bond needs to be >= minbond");
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdated + epochLimitForUpdateBond <= epoch, "databond been updated recently");
        if (databondStatus) {
            databondCollections.push(databonds[bondId].collectionId);
        } else {
            for (uint8 i = 0; i < databondCollections.length; i++) {
                if (databondCollections[i] == databonds[bondId].collectionId) {
                    databondCollections[i] = databondCollections[databondCollections.length - 1];
                    // slither-disable-next-line costly-loop
                    databondCollections.pop();
                    break;
                }
            }
        }
        databonds[bondId].active = databondStatus;
        databonds[bondId].epochBondLastUpdated = getEpoch();
        collectionManager.setCollectionStatus(databondStatus, databonds[bondId].collectionId);
    }

    function databondCollectionsReset() external override onlyRole(RESET_DATABOND_ROLE) {
        delete databondCollections;
        for (uint32 i = 1; i <= numDataBond; i++) {
            if (
                databonds[i].active &&
                databonds[i].bond >= minBond &&
                databonds[i].jobIds.length >= minJobs &&
                databonds[i].jobIds.length <= maxJobs
            ) {
                databondCollections.push(databonds[i].collectionId);
            } else if (databonds[i].active) {
                databonds[i].active = false;
                // slither-disable-next-line calls-loop
                collectionManager.setCollectionStatus(false, databonds[i].collectionId);
            }
        }
    }

    function occurrenceRecalculation() external override onlyRole(RESET_DATABOND_ROLE) {
        for (uint32 i = 1; i <= numDataBond; i++) {
            if (databonds[i].active && databonds[i].bond >= minBond) {
                uint256 occurrence = (databonds[i].jobIds.length * depositPerJob) / databonds[i].bond;
                if (occurrence == 0) occurrence = 1;
                databonds[i].desiredOccurrence = uint16(occurrence);
                // slither-disable-next-line calls-loop
                collectionManager.setCollectionOccurrence(databonds[i].collectionId, uint16(occurrence));
            }
        }
    }

    function getDatabondCollections() external view override returns (uint16[] memory) {
        return databondCollections;
    }

    function getDatabond(uint32 bondId) external view returns (Structs.DataBond memory databond) {
        require(bondId != 0, "ID cannot be 0");
        require(bondId <= numDataBond, "ID does not exist");

        return databonds[bondId];
    }
}
