// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IVoteManager {
    function getVoteValue(uint16 assetId, uint32 stakerId) external view returns (uint48);

    function getVote(uint32 stakerId) external view returns (Structs.Vote memory vote);

    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256);

    function getTotalInfluenceRevealed(uint32 epoch) external view returns (uint256);

    function getEpochLastRevealed(uint32 stakerId) external view returns (uint32);

    function getEpochLastCommitted(uint32 stakerId) external view returns (uint32);

    function getRandaoHash() external view returns (bytes32);
}
