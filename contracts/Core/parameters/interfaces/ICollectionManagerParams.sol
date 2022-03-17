// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICollectionManagerParams {
    /**
     * @notice changing the maximum percentage deviation allowed from medians for all collections
     * @dev can be called only by the the address that has the governance role
     * @param _maxTolerance updated value for maxTolerance
     */
    function setMaxTolerance(uint32 _maxTolerance) external;

    /**
     * @notice changing buffer length between the states
     * @dev can be called only by the the address that has the governance role
     * @param _bufferLength updated value to be set for buffer
     */
    function setBufferLength(uint8 _bufferLength) external;

    /**
     * @notice changing epoch length
     * @dev can be called only by the the address that has the governance role
     * @param _epochLength updated value to be set for epoch
     */
    function setEpochLength(uint16 _epochLength) external;
}
