// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
    function createJob(
        bool repeat,
        string calldata url,
        string calldata selector
    ) external;

    function getResult(uint8 id) external view returns (uint32);

    function getAssetType(uint8 id) external view returns (uint8);

    function getJob(uint8 id)
        external
        view
        returns (
            bool repeat,
            uint32 result,
            string memory url,
            string memory selector,
            string memory name
        );

    function getCollection(uint8 id)
        external
        view
        returns (
            uint8[] memory jobIDs,
            uint32 result,
            uint32 aggregationMethod,
            string memory name
        );

    function getNumActiveAssets() external view returns (uint8);
}
