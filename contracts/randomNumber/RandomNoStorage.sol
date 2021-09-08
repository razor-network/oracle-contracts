// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract RandomNoStorage {
    // client address => requestId => epoch
    mapping(address => mapping(bytes32 => uint32)) public requests;
    // epoch => secrets
    mapping(uint32 => bytes32) public secrets;
}
