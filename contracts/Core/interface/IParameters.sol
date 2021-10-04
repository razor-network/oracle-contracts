// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IParameters {
    function getEpoch() external view returns (uint32);

    function getState() external view returns (uint8);

    function getAllSlashParams()
        external
        view
        returns (
            uint16,
            uint16,
            uint16,
            uint16
        );

    function epochLength() external view returns (uint16);

    function minStake() external view returns (uint256);

    function aggregationRange() external view returns (uint8);

    function maxAltBlocks() external view returns (uint8);

    function blockReward() external view returns (uint256);

    function penaltyNotRevealNum() external view returns (uint16);
    
    function commissionChangeNum() external view returns (uint16);

    function baseDenominator() external view returns (uint16);

    function maxCommission() external view returns (uint8);
    
    function epochLimitForUpdateCommission() external view returns (uint32);

    function withdrawLockPeriod() external view returns (uint8);

    function withdrawReleasePeriod() external view returns (uint8);

    function escapeHatchEnabled() external view returns (bool);

    function gracePeriod() external view returns (uint16);

    function maxAge() external view returns (uint32);

    function exposureDenominator() external view returns (uint16);

    function extendLockPenalty() external view returns (uint8);
}
