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

    // For next epoch : Penalties
    /// @notice delayed mappping collectionid -> leafId
    mapping(uint16 => uint16) public collectionIdToLeafIdRegistryOfLastEpoch;

    /// For this epoch : Disputes
    /// @notice mapping for collectionid -> leafId
    mapping(uint16 => uint16) public collectionIdToLeafIdRegistry;

    /// @notice mapping for leafId -> collectionid
    mapping(uint16 => uint16) public leafIdToCollectionIdRegistry;

    /// @notice mapping for name of collection in bytes32 -> collectionid
    mapping(bytes32 => uint16) public ids;

    /// @notice number of active collections in the network
    uint16 public numActiveCollections;
    /// @notice epoch in which the registry needs to be updated
    uint32 public updateRegistryEpoch;
    /// @notice number of collections in the network
    uint16 public numCollections;
    /// @notice number of jobs in the network
    uint16 public numJobs;
}
