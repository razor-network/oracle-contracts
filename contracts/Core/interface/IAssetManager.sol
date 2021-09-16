// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
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

    function getNumActiveAssets() external view returns (uint8);

    function getAssetIndex(uint8 id) external view returns (uint8);
}
