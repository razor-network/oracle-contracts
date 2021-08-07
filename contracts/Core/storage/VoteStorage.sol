// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract VoteStorage {

  struct Vote {
      uint32 epoch;
      uint32[] values;
  }

  struct Commitment {
      uint32 epoch;
      bytes32 commitmentHash;
  }
    //stakerid -> commitment
    mapping(uint32 => Commitment) public commitments;
    //stakerid  -> vote
    mapping(uint32 => Vote) public votes;
    //epoch -> asset -> stakeWeight
    mapping(uint32 => uint256) public totalInfluenceRevealed;
    //epoch -> assetid -> voteValue -> weight
    mapping(uint32 => mapping(uint8 => mapping(uint32 => uint256))) public voteWeights;
    bytes32 public secrets;
}
