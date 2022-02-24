// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IBlockManagerParams {
    /**
     * @notice changing the maximum number of best proposed blocks to be considered for dispute
     * @dev can be called only by the the address that has the governance role
     * @param _maxAltBlocks updated value to be set for maxAltBlocks
     */
    function setMaxAltBlocks(uint8 _maxAltBlocks) external;

    /**
     * @notice changing the block reward given out to stakers
     * @dev can be called only by the the address that has the governance role
     * @param _blockReward updated value to be set for blockReward
     */
    function setBlockReward(uint256 _blockReward) external;

    /**
     * @notice changing minimum amount that to be staked for participation
     * @dev can be called only by the the address that has the governance role
     * @param _minStake updated value to be set for minStake
     */
    function setMinStake(uint256 _minStake) external;
}
