// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract CollectionStorage {
    enum JobSelectorType {
        JSON,
        XHTML
    }
    /// @notice mapping for JobID -> Job Info
    mapping(uint16 => Structs.Job) public jobs;
    /// @notice mapping for CollectionID -> Collection Info
    mapping(uint16 => Structs.Collection) public collections;

    /// @notice mapping for collectionid -> index in block medians 
    mapping(uint16 => uint16) public idToIndexRegistry;
    /// @notice mapping for index in block medians -> collectionid
    mapping(uint16 => uint16) public indexToIdRegistry;

    /// @notice number of active collections in the network
    uint16 public numActiveCollections;
    /// @notice epoch in which the registry needs to be updated
    uint32 public updateRegistryEpoch;
    /// @notice number of collections in the network
    uint16 public numCollections;
    /// @notice number of jobs in the network
    uint16 public numJobs;
}
