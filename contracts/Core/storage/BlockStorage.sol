// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract BlockStorage {
    //epoch -> address -> dispute -> assetid
    mapping(uint32 => mapping(address => Structs.Dispute)) public disputes;
    //epoch -> proposalNumber -> block
    mapping(uint32 => Structs.Block[]) public proposedBlocks;
    mapping(uint32 => Structs.Block) public blocks;
}
