// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IParameters {

    function getEpoch() external view returns (uint32);

    function getState() external view returns (uint8);

    function getEpochLength() external view returns (uint16);

    function getMinStake() external view returns (uint256);

    function getAggregationRange() external view returns (uint8);

    function getMaxAltBlocks() external view returns (uint8);

    function getBlockReward() external view returns (uint256);

}
