// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICollectionManagerParams {
    /**
     * @notice changing the maximum percentage deviation allowed from medians for all collections
     * @dev can be called only by the the address that has the governance role
     * @param _maxTolerance updated value for maxTolerance
     */
    function setMaxTolerance(uint32 _maxTolerance) external;
}
