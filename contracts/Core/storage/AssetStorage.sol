// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract AssetStorage {
    enum AssetType {
        Job,
        Collection
    }
    enum JobSelectorType {
        JSON,
        XHTML
    }
    mapping(uint16 => Structs.Job) public jobs;
    mapping(uint16 => Structs.Collection) public collections;

    uint16[] public pendingDeactivations;
    uint16[] public activeCollections;
    uint16 public numAssets;
}
