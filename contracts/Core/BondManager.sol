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
        Structs.Job[] memory jobs,
        uint256 bond,
        uint32 occurrence,
        int8 collectionPower,
        uint32 collectionTolerance,
        uint32 collectionAggregation,
        string calldata collectionName
    ) external initialized checkEpochAndState(State.Confirm, epoch, buffer) whenNotPaused {
        // 2=>governance param
        require(jobs.length > 2, "invalid bond creation");
        require(jobs.length <= maxJobs, "number of jobs exceed maxJobs");
        require(minBond <= bond, "minBond not satisfied");

        numDataBond = numDataBond + 1;

        {
            uint256 minOccurence = (jobs.length * depositPerJob) / bond;
            if (minOccurence == 0) minOccurence = 1;
            require(minOccurence <= occurrence, "not enough bond paid per job");
        }

        uint16[] memory jobIds = collectionManager.createMulJob(jobs);

        uint16 collectionId = collectionManager.createCollection(
            collectionTolerance,
            collectionPower,
            uint32(occurrence),
            collectionAggregation,
            jobIds,
            collectionName
        );

        databonds[numDataBond] = Structs.DataBond(true, collectionId, epoch, msg.sender, jobIds, bond);
        databondCollections.push(collectionId);

        razor.transferFrom(msg.sender, address(this), bond);
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
        uint32 epoch = _getEpoch();
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdatedPerAddress + epochLimitForUpdateBond <= epoch, "invalid databond update");

        databonds[bondId].epochBondLastUpdatedPerAddress = epoch;

        collectionManager.updateJob(databonds[bondId].jobIds[jobIndex], weight, power, selectorType, selector, url);
    }

    function updateDataBondCollection(
        uint32 bondId,
        uint16 collectionId,
        uint32 tolerance,
        uint32 aggregationMethod,
        int8 power,
        uint16[] memory jobIds
    ) external databondCreatorCheck(bondId, msg.sender) {
        uint32 epoch = _getEpoch();
        require(jobIds.length > 2, "invalid bond updation");
        require(jobIds.length <= maxJobs, "number of jobs exceed maxJobs");
        require(databonds[bondId].collectionId == collectionId, "incorrect collectionId specified");
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdatedPerAddress + epochLimitForUpdateBond <= epoch, "invalid databond update");

        databonds[bondId].epochBondLastUpdatedPerAddress = epoch;
        databonds[bondId].jobIds = jobIds;

        collectionManager.updateCollection(collectionId, tolerance, aggregationMethod, power, jobIds);
    }

    function addJobsToCollection(
        uint32 bondId,
        Structs.Job[] memory jobs,
        int8 collectionPower,
        uint32 collectionTolerance,
        uint32 collectionAggregation
    ) external databondCreatorCheck(bondId, msg.sender) {
        uint32 epoch = _getEpoch();
        require((databonds[bondId].jobIds.length + jobs.length) <= maxJobs, "number of jobs exceed maxJobs");
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdatedPerAddress + epochLimitForUpdateBond <= epoch, "invalid databond update");

        {
            uint16 numJobs = collectionManager.getNumJobs();

            for (uint8 i = 0; i < jobs.length; i++) {
                numJobs = numJobs + 1;
                databonds[bondId].jobIds.push(numJobs);
            }
        }
        databonds[bondId].epochBondLastUpdatedPerAddress = epoch;

        collectionManager.createMulJob(jobs);

        collectionManager.updateCollection(
            databonds[bondId].collectionId,
            collectionTolerance,
            collectionAggregation,
            collectionPower,
            databonds[bondId].jobIds
        );
    }

    function addBond(uint32 bondId, uint256 bond) external databondCreatorCheck(bondId, msg.sender) {
        require(databonds[bondId].active, "databond not active");
        databonds[bondId].bond = databonds[bondId].bond + bond;
        razor.transferFrom(msg.sender, address(this), bond);
    }

    function unstakeBond(uint32 bondId, uint256 bond) external databondCreatorCheck(bondId, msg.sender) checkState(State.Confirm, buffer) {
        uint32 epoch = _getEpoch();
        require(bond > 0, "bond being unstaked can't be 0");
        require(databonds[bondId].bond <= bond, "invalid bond amount");
        // slither-disable-next-line timestamp
        require(databonds[bondId].epochBondLastUpdatedPerAddress + epochLimitForUpdateBond <= epoch, "databond been updated recently");

        databonds[bondId].bond = databonds[bondId].bond - bond;
        bondLocks[bondId][msg.sender] = Structs.Lock(bond, epoch + withdrawLockPeriod);

        if (databonds[bondId].bond < minBond && databonds[bondId].active) {
            for (uint8 i = 0; i < databondCollections.length; i++) {
                if (databondCollections[i] == databonds[bondId].collectionId) {
                    databondCollections[i] = databondCollections[databondCollections.length - 1];
                    databondCollections.pop();
                }
            }
            databonds[bondId].active = false;
            collectionManager.setCollectionStatus(false, databonds[bondId].collectionId);
        }
    }

    function withdrawBond(uint32 bondId) external databondCreatorCheck(bondId, msg.sender) {
        uint32 epoch = _getEpoch();
        require(bondLocks[bondId][msg.sender].amount != 0, "no lock created");
        // slither-disable-next-line timestamp
        require(bondLocks[bondId][msg.sender].unlockAfter <= epoch, "Withdraw epoch not reached");

        uint256 withdrawAmount = bondLocks[bondId][msg.sender].amount;
        bondLocks[bondId][msg.sender] = Structs.Lock(0, 0);

        require(razor.transfer(msg.sender, withdrawAmount), "couldnt transfer");
    }

    function setDatabondStatus(bool databondStatus, uint16 bondId) external checkState(State.Confirm, buffer) {
        require(databondStatus != databonds[bondId].active, "status not being changed");
        require(databonds[bondId].bond <= minBond, "bond needs to be >= to bond");
        if (databondStatus) {
            databondCollections.push(databonds[bondId].collectionId);
        } else {
            for (uint8 i = 0; i < databondCollections.length; i++) {
                if (databondCollections[i] == databonds[bondId].collectionId) {
                    databondCollections[i] = databondCollections[databondCollections.length - 1];
                    databondCollections.pop();
                }
            }
        }
        databonds[bondId].active = databondStatus;
        databonds[bondId].epochBondLastUpdatedPerAddress = _getEpoch();
        collectionManager.setCollectionStatus(databondStatus, databonds[bondId].collectionId);
    }

    function setOccurrence() external override onlyRole(OCCURRENCE_MODIFIER_ROLE) {
        for (uint32 i = 1; i <= numDataBond; i++) {
            if (databonds[i].active && databonds[i].bond >= minBond) {
                uint256 occurrence = (databonds[i].jobIds.length * depositPerJob) / databonds[i].bond;
                if (occurrence == 0) occurrence = 1;
                // slither-disable-next-line calls-loop
                collectionManager.setCollectionOccurrence(databonds[i].collectionId, uint32(occurrence));
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
