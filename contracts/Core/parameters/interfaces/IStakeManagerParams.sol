// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStakeManagerParams {
    function setEpochLength(uint16 _epochLength) external;

    function setSlashParams(
        uint16 _bounty,
        uint16 _burn,
        uint16 _keep
    ) external;

    function setBaseDenominator(uint16 _baseDenominator) external;

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external;

    function setWithdrawReleasePeriod(uint8 _withdrawReleasePeriod) external;

    function setExtendLockPenalty(uint8 _extendLockPenalty) external;

    function setMinStake(uint256 _minStake) external;

    function setGracePeriod(uint16 _gracePeriod) external;

    function setMaxCommission(uint8 _maxCommission) external;

    function setDeltaCommission(uint8 _deltaCommission) external;

    function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external;

    function disableEscapeHatch() external;

    function baseDenominator() external view returns (uint16);
}
