// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IVoteManager {
    function storeSalt(bytes32 _salt) external;

    function storeDepth(uint256 _depth) external;

    function getVoteValue(
        uint32 epoch,
        uint32 stakerId,
        uint16 assetId
    ) external view returns (uint32);

    function getVoteWeight(
        uint32 epoch,
        uint16 assetId,
        uint32 voteValue
    ) external view returns (uint256);

    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256);

    function getStakeSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256);

    function getTotalInfluenceRevealed(uint32 epoch, uint16 activeCollectionIndex) external view returns (uint256);

    function getEpochLastRevealed(uint32 stakerId) external view returns (uint32);

    function getEpochLastCommitted(uint32 stakerId) external view returns (uint32);

    function getSalt() external view returns (bytes32);
}
