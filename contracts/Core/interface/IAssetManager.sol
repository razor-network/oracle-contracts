// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IAssetManager {
    function createJob(
        string calldata url,
        string calldata selector,
        bool repeat
    ) external;

    function createJob (string calldata url, string calldata selector) external;

    function fulfillAsset(uint256 id, uint256 value) external;

    function getResult(uint256 id) external view returns(uint256);

    function getAssetType(uint256 id) external view returns(uint256);

    function getJob(uint256 id)
        external
        view
        returns(
            string memory url,
            string memory selector,
            string memory name,
            bool active
        );
    
    function getCollection(uint256 id)
        external
        view
        returns(
            string memory name,
            uint32 aggregationMethod,
            uint256[] memory jobIDs,
            uint256 result,
            bool active,
            bool repeat
        );

    function getPendingJobs() external view returns(uint256);

    function getPendingCollections() external view returns(uint256);

    function getNumActiveAssets() external view returns(uint256);
    
    function getActiveAssets() external view returns(uint256[] memory);
}
