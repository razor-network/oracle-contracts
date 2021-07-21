// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";


contract AssetStorage {
    mapping (uint256 => Structs.Job) public jobs;
    mapping (uint256 => Structs.Collection) public collections;

    enum assetTypes { None, Job, Collection }

    uint256 public numAssets;

    mapping (uint256 => Structs.Collection) public pendingCollections;
    mapping (uint256 => Structs.Job) public pendingJobs;
    uint256[] public pendingAssetActivation;
    uint256[] public pendingAssetDeactivation;
    uint256 public numPendingCollections;
    uint256 public numPendingJobs;
    uint256 public numActiveAssets;
}
