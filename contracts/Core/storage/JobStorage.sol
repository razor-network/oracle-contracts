// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";


contract JobStorage {
    uint256 public numJobs;
    mapping (uint256 => Structs.Job) public jobs;
}
