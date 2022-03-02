// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDelegator {
    /**
     * @dev updates the address of the Collection Manager contract from where the delegator will fetch
     * results of the oracle
     * @param newDelegateAddress address of the Collection Manager
     */
    function updateAddress(address newDelegateAddress) external;

    /**
     * @dev using the hash of collection name, clients can query collection id with respect to its hash
     * @param _name bytes32 hash of the collection name
     * @return collection ID
     */
    function getCollectionID(bytes32 _name) external view returns (uint16);

    /**
     * @dev using the hash of collection name, clients can query the result of that collection
     * @param _name bytes32 hash of the collection name
     * @return result of the collection and its power
     */
    function getResult(bytes32 _name) external view returns (uint32, int8);

    /**
     * @dev using the collection id, clients can query the result of the collection
     * @param _id collection ID
     * @return result of the collection and its power
     */
    function getResultFromID(uint16 _id) external view returns (uint32, int8);

    /**
     * @return number of active collections in the oracle
     */
    function getNumActiveCollections() external view returns (uint256);
}
