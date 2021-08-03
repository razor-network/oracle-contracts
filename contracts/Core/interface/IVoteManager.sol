// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IVoteManager {
    function commit(uint32 epoch, bytes32 commitment) external;

    function reveal(
        uint32 epoch,
        bytes32 root,
        uint256[] calldata assetIds,
        uint256[] calldata values,
        bytes32[][] calldata proofs,
        bytes32 secret,
        address stakerAddress
    ) external;

    function getCommitment(uint256 stakerId) external view returns (bytes32);

    function getVote(
        uint256 stakerId,
        uint256 assetId
    ) external view returns (Structs.Vote memory vote);

    function getVoteWeight(
      uint32 epoch,
        uint256 assetId,
        uint256 voteValue
    ) external view returns (uint256);

    function getTotalInfluenceRevealed(uint32 epoch, uint256 assetId) external view returns (uint256);

  }
