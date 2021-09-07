// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract RandaoStorage {
    uint256 public requestId;
    // requestId => epoch
    mapping(uint256 => uint32) public requests;
    // epoch => secrets
    mapping(uint32 => bytes32) public secrets;
}
