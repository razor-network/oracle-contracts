// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IBondManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract BondManagerParams is ACL, IBondManagerParams, Constants {
    uint8 public buffer = 5;
    /// @notice deposit need to be sent per job
    uint256 public depositPerJob = 500_000 * (10**18);
    /// @notice minimum bond to be paid
    uint256 public minBond = 100_000 * (10**18);
    /// @notice the number of epochs for which a staker cant update job/collection they have created
    uint16 public epochLimitForUpdateBond = 5;
    // slither-disable-next-line constable-states
    uint8 public maxJobs = 6;
    // slither-disable-next-line constable-states
    uint8 public minJobs = 2;
    /// @notice the number of epochs for which the RAZORs are locked after initiating withdraw
    uint16 public withdrawLockPeriod = 1;

    /// @inheritdoc IBondManagerParams
    function setDepositPerJob(uint256 _depositPerJob) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        depositPerJob = _depositPerJob;
    }

    function setMinBond(uint256 _minBond) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        minBond = _minBond;
    }

    function setMinJobs(uint8 _minJobs) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        minJobs = _minJobs;
    }

    function setMaxJobs(uint8 _maxJobs) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        maxJobs = _maxJobs;
    }

    function setEpochLimitForUpdateBond(uint16 _epochLimitForUpdateBond) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        epochLimitForUpdateBond = _epochLimitForUpdateBond;
    }

    function setBufferLength(uint8 _bufferLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        buffer = _bufferLength;
    }

    function setWithdrawLockPeriod(uint16 _withdrawLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawLockPeriod = _withdrawLockPeriod;
    }
}
