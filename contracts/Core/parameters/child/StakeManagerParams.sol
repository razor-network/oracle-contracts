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

    // slither-disable-next-line missing-events-arithmetic
    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        epochLength = _epochLength;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setSlashParams(
        uint16 _bounty,
        uint16 _burn,
        uint16 _keep
    ) external override onlyGovernance {
        require(_bounty + _burn + _keep <= baseDenominator, "Slash nums addtion exceeds 10000");
        slashNums = SlashNums(_bounty, _burn, _keep);
    }

    // slither-disable-next-line missing-events-arithmetic
    function setBaseDenominator(uint16 _baseDenominator) external override onlyGovernance {
        baseDenominator = _baseDenominator;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external override onlyGovernance {
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setWithdrawReleasePeriod(uint8 _withdrawReleasePeriod) external override onlyGovernance {
        withdrawReleasePeriod = _withdrawReleasePeriod;
    }
    
    // slither-disable-next-line missing-events-arithmetic
    function setExtendLockPenalty(uint8 _extendLockPenalty) external override onlyGovernance {
        extendLockPenalty = _extendLockPenalty;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setMinStake(uint256 _minStake) external override onlyGovernance {
        minStake = _minStake;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setGracePeriod(uint16 _gracePeriod) external override onlyGovernance {
        gracePeriod = _gracePeriod;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setMaxCommission(uint8 _maxCommission) external override onlyGovernance {
        require(_maxCommission <= 100, "Invalid Max Commission Update");
        maxCommission = _maxCommission;
    }
    
    // slither-disable-next-line missing-events-arithmetic
    function disableEscapeHatch() external override onlyGovernance {
        escapeHatchEnabled = false;
    }
}
