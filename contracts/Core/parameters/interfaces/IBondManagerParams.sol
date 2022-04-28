// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IBondManagerParams {
    /**
     * @notice changing the maximum percentage deviation allowed from medians for all collections
     * @dev can be called only by the the address that has the governance role
     * @param _depositPerJob updated value for maxTolerance
     */
    function setDepositPerJob(uint32 _depositPerJob) external;

    /**
     * @notice changing buffer length between the states
     * @dev can be called only by the the address that has the governance role
     * @param _bufferLength updated value to be set for buffer
     */
    function setBufferLength(uint8 _bufferLength) external;

    function setMinBond(uint256 _minBond) external;

    function setEpochLimitForUpdateBond(uint16 _epochLimitForUpdateBond) external;

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external;
}
