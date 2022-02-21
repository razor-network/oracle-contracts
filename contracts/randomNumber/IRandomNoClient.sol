// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRandomNoClient {
    /**
     * @notice Allows Client to register for random number
     * Per request a rquest id is generated, which is binded to one epoch
     * this epoch is current epoch if Protocol is in commit state, or epoch + 1 if in any other state
     * @return requestId : unique request id
     */
    function register() external returns (bytes32);

    /**
     * @notice Allows client to pull random number once available
     * Random no is generated from secret of that epoch and request id, its unique per requestid
     * @param requestId : A unique id per request
     */
    function getRandomNumber(bytes32 requestId) external view returns (uint256);

    /**
     * @notice Allows client to get generic random number of last epoch
     * @return random number
     */
    function getGenericRandomNumberOfLastEpoch() external view returns (uint256);

    /**
     * @notice Allows client to get generic random number of any epoch
     * @param epoch random no of which epoch
     * @return random number
     */
    function getGenericRandomNumber(uint32 epoch) external view returns (uint256);
}
