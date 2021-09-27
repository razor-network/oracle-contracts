// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
    function deactivateCollection(uint32 epoch, uint8 id) external returns (uint8);

    function getJob(uint8 id)
        external
        view
        returns (
            bool active,
            uint8 selectorType,
            uint8 weight,
            int8 power,
            string memory name,
            string memory selector,
            string memory url
        );

    function getCollection(uint8 id)
        external
        view
        returns (
            bool active,
            int8 power,
            uint8[] memory jobIDs,
            uint32 aggregationMethod,
            string memory name
        );

    function getActiveAssets() external view returns (uint8[] memory);

    function getPendingDeactivations(uint32 epoch) external view returns (uint8[] memory);

    function getAssetIndex(uint8 id) external view returns (uint8);
}
