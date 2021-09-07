// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRandaoClient {
    /// @notice Allows Client to register for random number
    /// Per request a rquest id is generated, which is binded to one epoch
    /// this epoch is current epoch if Protocol is in commit state, or epoch + 1 if in any other state
    /// @return requestId : A unique id per request
    function register() external returns (uint256);

    /// @notice Allows client to pull random number once available
    /// Random no is generated from secret of that epoch and request id, its unique per requestid
    /// @param _requestId : A unique id per request
    function getRandomNumber(uint256 _requestId) external view returns (uint256);
}
