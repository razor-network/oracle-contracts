// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IBlockManager {
    // elected proposer proposes block.
    //we use a probabilistic method to elect stakers weighted by stake
    // protocol works like this.
    //select a staker pseudorandomly (not weighted by anything)
    // that staker then tosses a biased coin.
    //bias = hisStake/biggestStake. if its heads, he can propose block
    // end of iteration. try next iteration
    // note that only one staker or no stakers selected in each iteration.
    // stakers elected in higher iterations can also propose hoping that
    // stakers with lower iteration do not propose for some reason
    function propose(
        uint32 epoch,
        uint32[] memory ids,
        uint32[] memory medians,
        uint256 iteration,
        uint256 biggestInfluencerId
    ) external;

    //anyone can give sorted votes in batches in dispute state

    function giveSorted(
        uint8 assetId,
        uint32 epoch,
        uint32[] calldata sorted
    ) external;

    function resetDispute(uint32 epoch) external;

    function isElectedProposer(
        uint32 stakerId,
        uint256 iteration,
        uint256 biggestInfluencerId
    ) external;

    function claimBlockReward() external;

    function confirmPreviousEpochBlock(uint32 stakerId) external;

    function getBlock(uint32 epoch) external view returns (Structs.Block memory _block);

    function getBlockMedians(uint32 epoch) external view returns (uint32[] memory _blockMedians);

    function getProposedBlockMedians(uint32 epoch, uint256 proposedBlock) external view returns (uint32[] memory _blockMedians);

    function getNumProposedBlocks(uint32 epoch) external view returns (uint8);

    function isBlockConfirmed(uint32 epoch) external view returns (bool);
}
