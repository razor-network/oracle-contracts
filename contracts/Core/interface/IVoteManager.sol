// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IVoteManager {
    function commit(uint32 epoch, bytes32 commitment) external;

    function reveal(
        uint32 epoch,
        uint8[] calldata ids,
        uint256[] calldata values,
        bytes32 secret,
        address stakerAddress) external;

    function getCommitment(uint32 stakerId) external view returns (bytes32);

    function getVoteValue(uint32 stakerId, uint32 assetId) external view returns (uint256);

    function getVoteWeight(uint32 stakerId, uint32 assetId) external view returns (uint256);

    function getVoteWeights(
        uint32 epoch,
        uint8 assetId,
        uint256 voteValue
    ) external view returns (uint256);

    function getTotalInfluenceRevealed(uint32 epoch, uint8 assetId) external view returns (uint256);
    function getEpochLastRevealed(uint32 stakerId) external view returns (uint32);
    function getEpochLastCommitted(uint32 stakerId) external view returns (uint32);

}
