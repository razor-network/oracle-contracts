// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../lib/Structs.sol";

contract BlockStorage {
    //epoch -> address -> dispute -> assetid
    mapping(uint32 => mapping(address => Structs.Dispute)) public disputes;
    //epoch -> blockId -> block
    mapping(uint32 => mapping(uint8 => Structs.Block)) public proposedBlocks;
    //epoch->blockId
    mapping(uint32 => uint8[]) public sortedProposedBlockIds;
    // epoch -> blocks
    mapping(uint32 => Structs.Block) public blocks;
}
