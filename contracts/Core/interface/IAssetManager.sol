// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
    function executePendingDeactivations(uint32 epoch) external;

    function getActiveCollections() external view returns (uint16[] memory);

    function getPendingDeactivations() external view returns (uint16[] memory);

    function getCollectionIndex(uint16 id) external view returns (uint16);

    function getNumActiveCollections() external view returns (uint256);

    function getCollectionPower(uint16 id) external view returns (int8);
}
