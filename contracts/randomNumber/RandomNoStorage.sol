// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract RandomNoStorage {
    /// @notice mapping of client address => nonce
    mapping(address => uint32) public nonce;
    /// @notice mapping of requestId => epoch
    mapping(bytes32 => uint32) public requests;
    /// @notice mapping of epoch => secrets
    mapping(uint32 => bytes32) public secrets;
}
