// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardManagerParams {
    function setEpochLength(uint16 _epochLength) external;

    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external;

    function setBaseDenominator(uint16 _baseDenominator) external;

    function setBlockReward(uint256 _blockReward) external;

    function setGracePeriod(uint16 _gracePeriod) external;

    function setMaxAge(uint32 _maxAge) external;
}
