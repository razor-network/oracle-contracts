// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStateManager {
    /**
     * @notice to get the current state of protocol
     */
    function getState() external view returns (uint8);
}
