// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../lib/Structs.sol";

contract BlockStorage {
    /// @notice mapping of epoch -> address -> dispute
    mapping(uint32 => mapping(address => Structs.Dispute)) public disputes;
    /// @notice mapping of epoch -> blockId -> block
    mapping(uint32 => mapping(uint32 => Structs.Block)) public proposedBlocks;
    /// @notice mapping of epoch->blockId
    mapping(uint32 => uint32[]) public sortedProposedBlockIds;
    /// @notice mapping of stakerId->epoch
    mapping(uint32 => uint32) public epochLastProposed;

    // slither-disable-next-line constable-states
    /// @notice total number of proposed blocks in an epoch
    uint32 public numProposedBlocks;
    // slither-disable-next-line constable-states
    /// @notice block index that is to be confirmed if not disputed
    int8 public blockIndexToBeConfirmed; // Index in sortedProposedBlockIds
    /// @notice mapping of  epoch -> blocks
    mapping(uint32 => Structs.Block) public blocks;
}
