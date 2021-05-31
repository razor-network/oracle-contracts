// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";


contract JobStorage {
    mapping (uint256 => Structs.Job) public jobs;
    mapping (uint256 => Structs.Collection) public collections;

    enum assetTypes { None, Job, Collection }

    uint256 public numAssets;
}
