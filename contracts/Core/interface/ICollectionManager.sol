// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICollectionManager {
    /**
     * @notice updates the idToIndex and indexToId resgistries.
     * @dev It is called by the blockManager when a block is confirmed. It is only called if there was a change in the
     * status of collections in the network
     */
    function updateRegistry() external;

    /**
     * @param id the id of the collection
     * @return status of the collection
     */
    function getCollectionStatus(uint16 id) external view returns (bool);

    /**
     * @return total number of active collections
     */
    function getNumActiveCollections() external view returns (uint256);

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
     * @return epoch in which the registry needs to be updated
     */
    function getUpdateRegistryEpoch() external view returns (uint32);

    /**
     * @param i the index of the collection
     * @return tolerance of the collection
     */
    function getCollectionTolerance(uint16 i) external view returns (uint32);

    /**
     * @param id the id of the collection
     * @return the index of the collection from idToIndexRegistry
     */
    function getIdToIndexRegistryValue(uint16 id) external view returns (uint16);
}
