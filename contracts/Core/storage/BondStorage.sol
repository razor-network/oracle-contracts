// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../lib/Structs.sol";

contract BondStorage {
    mapping(uint32 => Structs.DataBond) public databonds;
    mapping(uint32 => mapping(address => Structs.Lock)) public bondLocks;

    uint16[] public databondCollections;
    uint32 public numDataBond;
}
