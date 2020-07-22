// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import "../lib/Structs.sol";


contract JobStorage {
    mapping (uint256 => Structs.Job) public jobs;
    uint256 public numJobs;
}
