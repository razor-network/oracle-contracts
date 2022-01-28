// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardManagerParams {
    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external;

    function setBlockReward(uint256 _blockReward) external;

    function setGracePeriod(uint16 _gracePeriod) external;

    function setMaxAge(uint32 _maxAge) external;

    function setMaxTolerance(uint16 _maxTolerance) external;
}
