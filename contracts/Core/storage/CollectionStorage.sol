// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract AssetStorage {
    enum JobSelectorType {
        JSON,
        XHTML
    }
    mapping(uint16 => Structs.Job) public jobs;
    mapping(uint16 => Structs.Collection) public collections;

    uint16 public numActiveCollections;
    uint32 public updateRegistry;
    uint16 public numCollections;
    uint16 public numJobs;
}
