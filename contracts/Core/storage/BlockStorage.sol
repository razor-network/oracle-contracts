// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract BlockStorage {
    //epoch -> address -> dispute -> assetid
    mapping(uint256 => mapping(address => Structs.Dispute)) public disputes;
    //epoch -> proposalNumber -> block
    mapping(uint256 => Structs.Block[]) public proposedBlocks;
    mapping(uint256 => Structs.Block) public blocks;
}
