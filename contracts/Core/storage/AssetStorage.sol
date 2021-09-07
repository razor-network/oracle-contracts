// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract AssetStorage {
    enum AssetTypes {
        None,
        Job,
        Collection
    }
    enum JobSelectorType {
        JSON,
        XHTML
    }
    mapping(uint8 => Structs.Job) public jobs;
    mapping(uint8 => Structs.Collection) public collections;

    uint8 public numAssets;
    uint8 public numActiveAssets;
}
