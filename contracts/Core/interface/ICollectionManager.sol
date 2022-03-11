// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICollectionManager {
    /**
     * @notice updates the collectionIdToLeafIdRegistryOfLastEpoch resgistries.
     * @dev It is called by the blockManager when a block is confirmed. It is only called if there was a change in the
     * status of collections in the network
     */
    function updateDelayedRegistry() external;

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
     * @param id the id of the collection
     * @return power of the collection
     */
    function getCollectionPower(uint16 id) external view returns (int8);

    /**
     * @return total number of collections
     */
    function getNumCollections() external view returns (uint16);

    /**
     * @param i the leafId of the collection
     * @return tolerance of the collection
     */
    function getCollectionTolerance(uint16 i) external view returns (uint32);

    /**
     * @param id the id of the collection
     * @return the leafId of the collection from collectionIdToLeafIdRegistry
     */
    function getLeafIdOfCollection(uint16 id) external view returns (uint16);

    /**
     * @param leafId, the leafId of the collection
     * @return the id of the collection
     */
    function getCollectionIdFromLeafId(uint16 leafId) external view returns (uint16);

    /**
     * @param id the id of the collection
     * @return the leafId of the collection from collectionIdToLeafIdRegistryOfLastEpoch
     */
    function getLeafIdOfCollectionForLastEpoch(uint16 id) external view returns (uint16);

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
    function getResult(bytes32 _name) external view returns (uint32, int8);

    /**
     * @notice returns the result of the collection based on the id sent by the client
     * @param _id the id of the collection
     * @return result of the collection
     * @return power of the resultant collection
     */
    function getResultFromID(uint16 _id) external view returns (uint32, int8);

    /**
     * @return epoch in which the registry needs to be updated
     */
    function getUpdateRegistryEpoch() external view returns (uint32);
}
