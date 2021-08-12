// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IVoteManager {
    function commit(uint32 epoch, bytes32 commitment) external;

    function reveal(
        uint32 epoch,
        bytes32 secret,
        uint48[] calldata values
    ) external;

    function snitch(
        uint32 epoch,
        address stakerAddress,
        bytes32 secret,
        uint48[] calldata values
    ) external;

    function getCommitment(uint32 stakerId) external view returns (bytes32);

    function getCommitmentEpoch(uint32 stakerId) external view returns (uint32);

    function getVoteValue(uint8 assetId, uint32 stakerId) external view returns (uint32);

    function getVote(uint32 stakerId) external view returns (Structs.Vote memory vote);

    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256);

    function getTotalInfluenceRevealed(uint32 epoch) external view returns (uint256);

    function getEpochLastRevealed(uint32 stakerId) external view returns (uint32);

    function getEpochLastCommitted(uint32 stakerId) external view returns (uint32);

    function getRandaoHash() external view returns (bytes32);
}
