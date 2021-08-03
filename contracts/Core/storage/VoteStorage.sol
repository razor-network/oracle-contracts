// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract VoteStorage {
    //stakerid -> commitment
    mapping(uint256 => Structs.Commitment) public commitments;
    //stakerid -> assetid -> vote
    mapping(uint256 => mapping(uint256 => Structs.Vote)) public votes;
    //epoch -> asset -> stakeWeight
    mapping(uint32 => mapping(uint256 => uint256)) public totalInfluenceRevealed;
    //epoch -> assetid -> voteValue -> weight
    mapping(uint32 => mapping(uint256 => mapping(uint256 => uint256))) public voteWeights;
}
