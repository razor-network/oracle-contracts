// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IStakeManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract StakeManagerParams is GovernanceACL, IStakeManagerParams {
    struct SlashNums {
        uint16 bounty;
        uint16 burn;
        uint16 keep;
    }
    uint8 public withdrawLockPeriod = 1;
    uint8 public withdrawReleasePeriod = 5;
    uint8 public extendLockPenalty = 1;
    uint8 public maxCommission = 20;
    SlashNums public slashNums = SlashNums(500, 9500, 0);
    // Slash Penalty = bounty + burned + kept
    uint16 public override baseDenominator = 10000;
    uint16 public gracePeriod = 8;
    uint16 public epochLength = 300;
    bool public escapeHatchEnabled = true;
    uint256 public minStake = 1000 * (10**18);

    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        epochLength = _epochLength;
    }

    function setSlashParams(
        uint16 _bounty,
        uint16 _burn,
        uint16 _keep
    ) external override onlyGovernance {
        require(_bounty + _burn + _keep <= baseDenominator, "Slash nums addtion exceeds 10000");
        // slither-disable-next-line events-access
        slashNums = SlashNums(_bounty, _burn, _keep);
    }

    function setBaseDenominator(uint16 _baseDenominator) external override onlyGovernance {
        // slither-disable-next-line events-access
        baseDenominator = _baseDenominator;
    }

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external override onlyGovernance {
        // slither-disable-next-line events-access
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    function setWithdrawReleasePeriod(uint8 _withdrawReleasePeriod) external override onlyGovernance {
        // slither-disable-next-line events-access
        withdrawReleasePeriod = _withdrawReleasePeriod;
    }

    function setExtendLockPenalty(uint8 _extendLockPenalty) external override onlyGovernance {
        // slither-disable-next-line events-access
        extendLockPenalty = _extendLockPenalty;
    }

    function setMinStake(uint256 _minStake) external override onlyGovernance {
        // slither-disable-next-line events-access
        minStake = _minStake;
    }

    function setGracePeriod(uint16 _gracePeriod) external override onlyGovernance {
        // slither-disable-next-line events-access
        gracePeriod = _gracePeriod;
    }

    function setMaxCommission(uint8 _maxCommission) external override onlyGovernance {
        // slither-disable-next-line events-access
        require(_maxCommission <= 100, "Invalid Max Commission Update");
        maxCommission = _maxCommission;
    }

    function disableEscapeHatch() external override onlyGovernance {
        // slither-disable-next-line events-access
        escapeHatchEnabled = false;
    }
}
