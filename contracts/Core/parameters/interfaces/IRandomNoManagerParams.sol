// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRandomNoManagerParams {
    /**
     * @notice changing buffer length between the states
     * @dev can be called only by the the address that has the governance role
     * @param _bufferLength updated value to be set for buffer
     */
    function setBufferLength(uint8 _bufferLength) external;
}
