// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract CollectionStorage {
    enum JobSelectorType {
        JSON,
        XHTML
    }
    mapping(uint16 => Structs.Job) public jobs;
    mapping(uint16 => Structs.Collection) public collections;

    mapping(uint16 => uint16) public idToIndexRegistry;
    mapping(uint16 => uint16) public indexToIdRegistry;

    uint16 public numActiveCollections;
    uint32 public updateRegistryEpoch;
    uint16 public numCollections;
    uint16 public numJobs;
}
