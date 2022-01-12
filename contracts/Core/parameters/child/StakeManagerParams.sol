// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IStakeManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract StakeManagerParams is ACL, IStakeManagerParams, Constants {
    struct SlashNums {
        uint16 bounty;
        uint16 burn;
        uint16 keep;
    }
    bool public escapeHatchEnabled = true;
    uint8 public withdrawLockPeriod = 1;
    uint8 public withdrawReleasePeriod = 5;
    uint8 public extendLockPenalty = 1;
    uint8 public maxCommission = 20;
    // change the commission by 3% points
    uint8 public deltaCommission = 3;
    uint16 public gracePeriod = 8;
    uint16 public epochLength= 300;
    uint16 public epochLimitForUpdateCommission = 100;
    SlashNums public slashNums = SlashNums(500, 9500, 0);
    // Slash Penalty = bounty + burned + kept
    uint256 public minStake = 20000 * (10**18);
    uint256 public minSafeRazor = 10000 * (10**18);

    function setEpochLength(uint16 _epochLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        epochLength = _epochLength;
    }

    function setSlashParams(
        uint16 _bounty,
        uint16 _burn,
        uint16 _keep
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

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    function setWithdrawReleasePeriod(uint8 _withdrawReleasePeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawReleasePeriod = _withdrawReleasePeriod;
    }

    function setExtendLockPenalty(uint8 _extendLockPenalty) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        extendLockPenalty = _extendLockPenalty;
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
