// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IParameters {
    function commit() external view returns (uint8);

    function reveal() external view returns (uint8);

    function propose() external view returns (uint8);

    function dispute() external view returns (uint8);

    function burnAddress() external view returns (address);

    function penaltyNotRevealNum() external view returns (uint16);

    function penaltyNotRevealDenom() external view returns (uint16);

    function resetLockPenalty() external view returns (uint16);

    function minStake() external view returns (uint256);

    function blockReward() external view returns (uint256);

    function withdrawLockPeriod() external view returns (uint256);

    function withdrawReleasePeriod() external view returns (uint256);

    function maxAltBlocks() external view returns (uint8);

    function epochLength() external view returns (uint32);

    function gracePeriod() external view returns (uint256);

    function aggregationRange() external view returns (uint8);

    function exposureDenominator() external view returns (uint16);

    function slashPenaltyNum() external view returns (uint16);

    function slashPenaltyDenom() external view returns (uint16);

    function getEpoch() external view returns (uint32);

    function getState() external view returns (uint8);

    function maxAge() external view returns (uint32);

    function escapeHatchEnabled() external view returns (bool);
}
