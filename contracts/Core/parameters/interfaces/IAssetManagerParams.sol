// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManagerParams {
    function setEpochLength(uint16 _epochLength) external;

    function setMaxTolerance(uint16 _maxTolerance) external;
}
