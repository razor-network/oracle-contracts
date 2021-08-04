// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
    function createJob(
        string calldata url,
        string calldata selector,
        bool repeat
    ) external;

    function fulfillAsset(uint8 id, uint256 value) external;

    function getResult(uint8 id) external view returns (uint256);

    function getAssetType(uint8 id) external view returns (uint8);

    function getJob(uint8 id)
        external
        view
        returns (
            string memory url,
            string memory selector,
            string memory name,
            bool repeat,
            uint256 result
        );

    function getCollection(uint8 id)
        external
        view
        returns (
            string memory name,
            uint32 aggregationMethod,
            uint256[] memory jobIDs,
            uint256 result
        );
}
