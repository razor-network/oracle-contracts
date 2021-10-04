// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
    function deactivateCollection(uint32 epoch, uint8 id) external returns (uint8);

    function getActiveAssets() external view returns (uint8[] memory);

    function getPendingDeactivations() external view returns (uint8[] memory);

    function getAssetIndex(uint8 id) external view returns (uint8);

    function getNumActiveAssets() external view returns (uint256);

    function getCollectionPower(uint8 id) external view returns (int8);
}
