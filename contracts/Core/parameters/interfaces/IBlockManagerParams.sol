// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IBlockManagerParams {
    function setEpochLength(uint16 _epochLength) external;

    function setMaxAltBlocks(uint8 _maxAltBlocks) external;

    function setBlockReward(uint256 _blockReward) external;

    function setMinStake(uint256 _minStake) external;
}
