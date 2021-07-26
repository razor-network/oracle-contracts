// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract AssetStorage {
    enum assetTypes {
        None,
        Job,
        Collection
    }
    mapping(uint256 => Structs.Job) public jobs;
    mapping(uint256 => Structs.Collection) public collections;
    uint256 public numAssets;
}
