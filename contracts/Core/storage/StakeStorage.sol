// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract StakeStorage {
    uint32 public numStakers;

    mapping(address => uint32) public stakerIds;
    mapping(uint32 => Structs.Staker) public stakers;
    mapping(address => mapping(address => Structs.Lock)) public locks;
}
