// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IStakeManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract StakeManagerParams is ACL, IStakeManagerParams, Constants {
    struct SlashNums {
        uint32 bounty;
        uint32 burn;
        uint32 keep;
    }
    bool public escapeHatchEnabled = true;
    uint8 public unstakeLockPeriod = 1;
    uint8 public withdrawLockPeriod = 1;
    uint8 public withdrawInitiationPeriod = 5;
    uint8 public extendUnstakeLockPenalty = 1;
    uint8 public maxCommission = 20;
    // change the commission by 3% points
    uint8 public deltaCommission = 3;
    uint16 public gracePeriod = 8;
    uint16 public epochLimitForUpdateCommission = 100;
    // slither-disable-next-line too-many-digits
    SlashNums public slashNums = SlashNums(500000, 9500000, 0);
    // Slash Penalty = bounty + burned + kept
    uint256 public minStake = 20000 * (10**18);
    uint256 public minSafeRazor = 10000 * (10**18);

    function setSlashParams(
        uint32 _bounty,
        uint32 _burn,
        uint32 _keep
    ) external override onlyRole(GOVERNANCE_ROLE) {
        require(_bounty + _burn + _keep <= BASE_DENOMINATOR, "Slash nums addtion exceeds 10000");
        // slither-disable-next-line events-maths
        slashNums = SlashNums(_bounty, _burn, _keep);
    }

    function setDeltaCommission(uint8 _deltaCommission) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        deltaCommission = _deltaCommission;
    }

    function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        epochLimitForUpdateCommission = _epochLimitForUpdateCommission;
    }

    function setUnstakeLockPeriod(uint8 _unstakeLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        unstakeLockPeriod = _unstakeLockPeriod;
    }

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    function setWithdrawInitiationPeriod(uint8 _withdrawInitiationPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawInitiationPeriod = _withdrawInitiationPeriod;
    }

    function setExtendUnstakeLockPenalty(uint8 _extendUnstakeLockPenalty) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        extendUnstakeLockPenalty = _extendUnstakeLockPenalty;
    }

    function setMinStake(uint256 _minStake) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        minStake = _minStake;
    }

    function setMinSafeRazor(uint256 _minSafeRazor) external override onlyRole(GOVERNANCE_ROLE) {
        require(_minSafeRazor <= minStake, "minSafeRazor beyond minStake");
        // slither-disable-next-line events-maths
        minSafeRazor = _minSafeRazor;
    }

    function setGracePeriod(uint16 _gracePeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        gracePeriod = _gracePeriod;
    }

    function setMaxCommission(uint8 _maxCommission) external override onlyRole(GOVERNANCE_ROLE) {
        require(_maxCommission <= 100, "Invalid Max Commission Update");
        // slither-disable-next-line events-maths
        maxCommission = _maxCommission;
    }

    function disableEscapeHatch() external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        escapeHatchEnabled = false;
    }
}
