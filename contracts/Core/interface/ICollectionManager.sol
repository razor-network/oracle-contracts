// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../lib/Structs.sol";
import "../storage/Constants.sol";

interface ICollectionManager {
    /**
     * @notice Creates a Multiple Jobs in the network.
     * @dev Jobs are not directly reported by staker but just stores the URL and its corresponding details
     * @param mulJobs multiple jobs that are to be created
     */
    function createMulJob(Structs.Job[] memory mulJobs) external returns (uint16[] memory);

    /**
     * @notice Creates a collection in the network.
     * @dev Collections are to be reported by staker by querying the URLs in each job assigned in the collection
     * and aggregating them based on the aggregation method specified in the collection
     * @param tolerance specifies the percentage by which the staker's value can deviate from the value decided by the network
     * @param power is used to specify the decimal shifts required on the result of a Collection
     * @param occurrence how often the collection needs to be reported upon
     * @param aggregationMethod specifies the aggregation method to be used by the stakers
     * @param jobIDs an array that holds which jobs should the stakers query for the stakers to report for the collection
     * @param name of the collection
     */
    function createCollection(
        uint32 tolerance,
        int8 power,
        uint16 occurrence,
        uint32 aggregationMethod,
        uint16[] memory jobIDs,
        string calldata name
    ) external returns (uint16);

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
        Constants.JobSelectorType selectorType,
        string calldata selector,
        string calldata url
    ) external;

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
    ) external;

    function setResult(
        uint32 epoch,
        uint16[] memory ids,
        uint256[] memory medians
    ) external;

    function setCollectionOccurrence(uint16 collectionId, uint16 occurrence) external;

    /**
     * @notice Sets the status of the collection in the network.
     * @param assetStatus the status that needs to be set for the collection
     * @param id the collection id for which the status needs to change
     */
    function setCollectionStatus(bool assetStatus, uint16 id) external;

    /**
     * @param id the id of the collection
     * @return status of the collection
     */
    function getCollectionStatus(uint16 id) external view returns (bool);

    /**
     * @return total number of active collections
     */
    function getNumActiveCollections() external view returns (uint16);

    /**
     * @return ids of active collections
     */
    function getActiveCollections() external view returns (uint16[] memory);

    /**
     * @param id the id of the collection
     * @return power of the collection
     */
    function getCollectionPower(uint16 id) external view returns (int8);

    /**
     * @return total number of collections
     */
    function getNumCollections() external view returns (uint16);

    /**
     * @return total number of jobs
     */
    function getNumJobs() external view returns (uint16);

    /**
     * @param i the leafId of the collection
     * @return tolerance of the collection
     */
    function getCollectionTolerance(uint16 i) external view returns (uint32);

    /**
     * @param leafId, the leafId of the collection
     * @return the id of the collection
     */
    function getCollectionIdFromLeafId(uint16 leafId) external view returns (uint16);

    /**
     * @param _name the name of the collection in bytes32
     * @return collection ID
     */
    function getCollectionID(bytes32 _name) external view returns (uint16);

    /**
     * @notice returns the result of the collection based on the name sent by the client
     * @param _name the name of the collection in bytes32
     * @return result of the collection
     * @return power of the resultant collection
     */
    function getResult(bytes32 _name) external view returns (uint256, int8);

    /**
     * @notice returns the result of the collection based on the id sent by the client
     * @param _id the id of the collection
     * @return result of the collection
     * @return power of the resultant collection
     */
    function getResultFromID(uint16 _id) external view returns (uint256, int8);
}
