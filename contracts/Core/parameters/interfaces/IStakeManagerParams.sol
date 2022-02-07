// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStakeManagerParams {
    function setSlashParams(
        uint32 _bounty,
        uint32 _burn,
        uint32 _keep
    ) external;

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external;

    function setUnstakeLockPeriod(uint8 _unstakeLockPeriod) external;

    function setWithdrawInitiationPeriod(uint8 _withdrawInitiationPeriod) external;

    function setExtendUnstakeLockPenalty(uint8 _extendLockPenalty) external;

    function setMinStake(uint256 _minStake) external;

    function setMinSafeRazor(uint256 _minSafeRazor) external;

    function setGracePeriod(uint16 _gracePeriod) external;

    function setMaxCommission(uint8 _maxCommission) external;

    function setDeltaCommission(uint8 _deltaCommission) external;

    function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external;

    function disableEscapeHatch() external;
}
