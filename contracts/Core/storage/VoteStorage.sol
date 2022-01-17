// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract VoteStorage {
    //stakerid -> commitment
    mapping(uint32 => Structs.Commitment) public commitments;

    // Epoch needs to be brought back due to AAR, each epoch would have different set of assets revealed
    // epoch -> stakerid -> assetid -> vote
    mapping(uint32 => mapping(uint32 => mapping(uint16 => uint32))) public votes;

    //epoch -> assetid -> weight
    mapping(uint32 => mapping(uint16 => uint256)) public totalInfluenceRevealed;

    //epoch -> assetid -> voteValue -> weight
    mapping(uint32 => mapping(uint16 => mapping(uint32 => uint256))) public voteWeights;

    //epoch-> stakerid->influence
    mapping(uint32 => mapping(uint32 => uint256)) public influenceSnapshot;

    mapping(uint32 => mapping(uint32 => uint256)) public stakeSnapshot;

    // stakerid=> epochLastRevealed, can be potentially moved to staker struct, but then we will have one more external call
    mapping(uint32 => uint32) public epochLastRevealed;

    bytes32 public salt;
}
