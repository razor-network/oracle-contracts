// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract VoteStorage {
    /// @notice mapping of stakerid -> commitment
    mapping(uint32 => Structs.Commitment) public commitments;

    // Epoch needs to be brought back due to AAR, each epoch would have different set of assets revealed
    /// @notice mapping of epoch -> stakerid -> assetid -> vote
    mapping(uint32 => mapping(uint32 => mapping(uint16 => uint256))) public votes;

    /// @notice mapping of epoch -> assetid -> weight
    mapping(uint32 => mapping(uint16 => uint256)) public totalInfluenceRevealed;

    /// @notice mapping of epoch -> assetid -> voteValue -> weight
    mapping(uint32 => mapping(uint16 => mapping(uint256 => uint256))) public voteWeights;

    /// @notice mapping of epoch-> stakerid->influence
    mapping(uint32 => mapping(uint32 => uint256)) public influenceSnapshot;

    /// @notice mapping of epoch-> stakerid->stake
    mapping(uint32 => mapping(uint32 => uint256)) public stakeSnapshot;

    /// @notice mapping of stakerid=> epochLastRevealed
    mapping(uint32 => uint32) public epochLastRevealed;

    /// @notice hash of last epoch and its block medians
    bytes32 public salt;

    /// @notice depth of a valid merkle tree
    uint256 public depth; // uint32 possible, pack if opp arise
}
