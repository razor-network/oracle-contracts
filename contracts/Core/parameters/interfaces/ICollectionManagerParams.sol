// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface ICollectionManagerParams {
    function setEpochLength(uint16 _epochLength) external;

    function setMaxTolerance(uint32 _maxTolerance) external;
}
