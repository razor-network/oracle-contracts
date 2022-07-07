// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDelegator {
    /**
     * @dev updates the address of the Collection Manager contract from where the delegator will fetch
     * results of the oracle
     * @param newDelegateAddress address of the Collection Manager
     * @param newRandomNoManagerAddress address of the Random Number Manager
     */
    function updateAddress(address newDelegateAddress, address newRandomNoManagerAddress) external;

    /**
     * @notice Allows Client to register for random number
     * Per request a rquest id is generated, which is binded to one epoch
     * this epoch is current epoch if Protocol is in commit state, or epoch + 1 if in any other state
     * @return requestId : unique request id
     */
    function register() external returns (bytes32);

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
    function getResult(bytes32 _name) external view returns (uint256, int8);

    /**
     * @dev using the collection id, clients can query the result of the collection
     * @param _id collection ID
     * @return result of the collection and its power
     */
    function getResultFromID(uint16 _id) external view returns (uint256, int8);

    /**
     * @return ids of active collections in the oracle
     */
    function getActiveCollections() external view returns (uint16[] memory);

    /**
     * @dev using the collection id, clients can query the status of collection
     * @param _id collection ID
     * @return status of the collection
     */
    function getCollectionStatus(uint16 _id) external view returns (bool);

    /**
     * @notice Allows client to pull random number once available
     * Random no is generated from secret of that epoch and request id, its unique per requestid
     * @param requestId : A unique id per request
     */
    function getRandomNumber(bytes32 requestId) external view returns (uint256);

    /**
     * @notice Fetch generic random number of last epoch
     * @return random number
     */
    function getGenericRandomNumberOfLastEpoch() external view returns (uint256);

    /**
     * @dev using epoch, clients can query random number generated of the epoch
     * @param _epoch epoch
     * @return random number
     */
    function getGenericRandomNumber(uint32 _epoch) external view returns (uint256);
}
