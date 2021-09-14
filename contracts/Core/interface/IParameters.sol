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

    function getPenaltyNotRevealNum() external view returns (uint16);

    function getPenaltyNotRevealDenom() external view returns (uint16);

    function getMaxCommission() external view returns (uint8);

    function getWithdrawLockPeriod() external view returns (uint8);

    function getWithdrawReleasePeriod() external view returns (uint8);

    function getSlashPenaltyNum() external view returns (uint16);

    function getSlashPenaltyDenom() external view returns (uint16);

    function getEscapeHatchEnabled() external view returns (bool);

    function getGracePeriod() external view returns (uint16);

    function getMaxAge() external view returns (uint32);

    function getExposureDenominator() external view returns (uint16);

    function getResetLockPenalty() external view returns (uint8);
}
