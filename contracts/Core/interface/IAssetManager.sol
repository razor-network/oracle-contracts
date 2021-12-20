// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
    function getCollectionStatus(uint16 id) external view returns (bool);

    function getNumActiveCollections() external view returns (uint256);

    function getCollectionPower(uint16 id) external view returns (int8);

    function getNumCollections() external view returns (uint16);

    function getUpdateRegistryEpoch() external view returns (uint32);
}
