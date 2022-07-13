// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStakeManagerParams {
    /**
     * @notice changing slashing parameters
     * @dev can be called only by the the address that has the governance role
     * @param _bounty updated percent value to be set for bounty
     * @param _burn updated percent value to be set for burn
     * @param _keep updated percent value to be set for keep
     */
    function setSlashParams(
        uint32 _bounty,
        uint32 _burn,
        uint32 _keep
    ) external;

    /**
     * @notice changing the number of epochs for which the RAZORs are locked after initiating withdraw
     * @dev can be called only by the the address that has the governance role
     * @param _withdrawLockPeriod updated value to be set for withdrawLockPeriod
     */
    function setWithdrawLockPeriod(uint16 _withdrawLockPeriod) external;

    /**
     * @notice changing the number of epochs for which the sRZRs are locked for calling unstake()
     * @dev can be called only by the the address that has the governance role
     * @param _unstakeLockPeriod updated value to be set for unstakeLockPeriod
     */
    function setUnstakeLockPeriod(uint16 _unstakeLockPeriod) external;

    /**
     * @notice changing the number of epochs where staker/delegator needs to initiate withdraw
     * @dev can be called only by the the address that has the governance role
     * @param _withdrawInitiationPeriod updated value to be set for withdrawInitiationPeriod
     */
    function setWithdrawInitiationPeriod(uint16 _withdrawInitiationPeriod) external;

    /**
     * @notice changing percentage stake penalty from the locked amount for extending unstake lock
     * incase withdrawInitiationPeriod was missed
     * @dev can be called only by the the address that has the governance role
     * @param _resetUnstakePenalty updated value to be set for resetUnstakePenalty
     */
    function setResetUnstakeLockPenalty(uint32 _resetUnstakePenalty) external;

    /**
     * @notice changing minimum amount that to be staked for participation
     * @dev can be called only by the the address that has the governance role
     * @param _minStake updated value to be set for minStake
     */
    function setMinStake(uint256 _minStake) external;

    /**
     * @notice changing minimum amount that to be staked to become a staker
     * @dev can be called only by the the address that has the governance role
     * @param _minSafeRazor updated value to be set for minSafeRazor
     */
    function setMinSafeRazor(uint256 _minSafeRazor) external;

    /**
     * @notice changing maximum commission stakers can charge from delegators on their profits
     * @dev can be called only by the the address that has the governance role
     * @param _maxCommission updated value to be set for maxCommission
     */
    function setMaxCommission(uint8 _maxCommission) external;

    /**
     * @notice changing maximum commission change a staker can do
     * @dev can be called only by the the address that has the governance role
     * @param _deltaCommission updated value to be set for deltaCommission
     */
    function setDeltaCommission(uint8 _deltaCommission) external;

    /**
     * @notice changing the number of epochs for which a staker cant change commission once set/change
     * @dev can be called only by the the address that has the governance role
     * @param _epochLimitForUpdateCommission updated value to be set for epochLimitForUpdateCommission
     */
    function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external;

    /**
     * @notice sets escape hatch to false permanently
     * @dev can be called only by the the address that has the governance role
     */
    function disableEscapeHatch() external;

    /**
     * @notice changing buffer length between the states
     * @dev can be called only by the the address that has the governance role
     * @param _bufferLength updated value to be set for buffer
     */
    function setBufferLength(uint8 _bufferLength) external;
}
