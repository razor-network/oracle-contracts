// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IVoteManager {
    /**
     * @notice stores the salt calculated in block manager
     * @param _salt the hash of the last epoch and medians of the block
     */
    function storeSalt(bytes32 _salt) external;

    /**
     * @notice stores the depth of a valid merkle tree. Depth of the merkle tree sent by the stakers should match with this
     * for a valid commit/reveal
     * @param _depth depth of the merkle tree
     */
    function storeDepth(uint256 _depth) external;

    /**
     * @notice returns vote value of a collection reported by a particular staker
     * @param epoch in which the staker reveal this value
     * @param stakerId id of the staker
     * @param leafId seq position of collection in merkle tree
     * @return vote value
     */
    function getVoteValue(
        uint32 epoch,
        uint32 stakerId,
        uint16 leafId
    ) external view returns (uint256);

    /**
     * @notice returns vote weight of the value of the collection reported
     * @param epoch in which the staker reveal this value
     * @param leafId seq position of collection in merkle tree
     * @param voteValue one of the values of the collection being reported
     * @return vote weight of the vote
     */
    function getVoteWeight(
        uint32 epoch,
        uint16 leafId,
        uint256 voteValue
    ) external view returns (uint256);

    /**
     * @notice returns snapshot of influence of the staker when they revealed
     * @param epoch when the snapshot was taken
     * @param stakerId id of the staker
     * @return influence of the staker
     */
    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256);

    /**
     * @notice returns snapshot of stake of the staker when they revealed
     * @param epoch when the snapshot was taken
     * @param stakerId id of the staker
     * @return stake of the staker
     */
    function getStakeSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256);

    /**
     * @notice returns the total influence revealed of the collection
     * @param epoch when asset was being revealed
     * @param leafId seq position of collection in merkle tree
     * @return total influence revealed of the collection
     */
    function getTotalInfluenceRevealed(uint32 epoch, uint16 leafId) external view returns (uint256);

    /**
     * @notice returns the epoch a staker last revealed their votes
     * @param stakerId id of the staker
     * @return epoch last revealed
     */
    function getEpochLastRevealed(uint32 stakerId) external view returns (uint32);

    /**
     * @notice returns the epoch a staker last committed their votes
     * @param stakerId id of the staker
     * @return epoch last committed
     */
    function getEpochLastCommitted(uint32 stakerId) external view returns (uint32);

    /**
     * @return the salt
     */
    function getSalt() external view returns (bytes32);
}
