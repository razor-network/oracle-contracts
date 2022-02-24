// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IStakeManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract StakeManagerParams is ACL, IStakeManagerParams, Constants {
    struct SlashNums {
        // percent bounty from staker's stake to be received by the bounty hunter
        uint32 bounty;
        // percent RAZOR burn from staker's stake
        uint32 burn;
        // percent from staker's stake to be kept by staker
        uint32 keep;
    }
    /// @notice a boolean, if true, the default admin role can remove all the funds incase of emergency
    bool public escapeHatchEnabled = true;
    /// @notice the number of epochs for which the sRZRs are locked for calling unstake()
    uint8 public unstakeLockPeriod = 1;
    /// @notice the number of epochs for which the RAZORs are locked after initiating withdraw
    uint8 public withdrawLockPeriod = 1;
    /// @notice the number of epochs where staker/delegator needs to initiate withdraw
    uint8 public withdrawInitiationPeriod = 5;
    /**
     * @notice percentage stake penalty from the locked amount for extending unstake lock
     * incase withdrawInitiationPeriod was missed
     */
    uint8 public extendUnstakeLockPenalty = 1;
    /// @notice maximum commission stakers can charge from delegators on their profits
    uint8 public maxCommission = 20;
    /// @notice maximum commission change a staker can do
    uint8 public deltaCommission = 3;
    /**
     * @notice the number of epochs for which the staker wont be given inactivity penalties.
     * Stakers inactive for more than grace period will be penalized
     */
    uint16 public gracePeriod = 8;
    /// @notice the number of epochs for which a staker cant change commission once set/change
    uint16 public epochLimitForUpdateCommission = 100;
    /// @notice slashing params being used if staker is slashed. Slash Penalty = bounty + burned + kept == 100%
    // slither-disable-next-line too-many-digits
    SlashNums public slashNums = SlashNums(500000, 9500000, 0);
    /// @notice minimum amount of stake required to participate
    uint256 public minStake = 20000 * (10**18);
    /// @notice minimum amount of stake required to become a staker
    uint256 public minSafeRazor = 10000 * (10**18);

    /// @inheritdoc IStakeManagerParams
    function setSlashParams(
        uint32 _bounty,
        uint32 _burn,
        uint32 _keep
    ) external override onlyRole(GOVERNANCE_ROLE) {
        require(_bounty + _burn + _keep <= BASE_DENOMINATOR, "params sum exceeds denominator");
        // slither-disable-next-line events-maths
        slashNums = SlashNums(_bounty, _burn, _keep);
    }

    /// @inheritdoc IStakeManagerParams
    function setDeltaCommission(uint8 _deltaCommission) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        deltaCommission = _deltaCommission;
    }

    /// @inheritdoc IStakeManagerParams
    function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        epochLimitForUpdateCommission = _epochLimitForUpdateCommission;
    }

    /// @inheritdoc IStakeManagerParams
    function setUnstakeLockPeriod(uint8 _unstakeLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        unstakeLockPeriod = _unstakeLockPeriod;
    }

    /// @inheritdoc IStakeManagerParams
    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    /// @inheritdoc IStakeManagerParams
    function setWithdrawInitiationPeriod(uint8 _withdrawInitiationPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawInitiationPeriod = _withdrawInitiationPeriod;
    }

    /// @inheritdoc IStakeManagerParams
    function setExtendUnstakeLockPenalty(uint8 _extendUnstakeLockPenalty) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        extendUnstakeLockPenalty = _extendUnstakeLockPenalty;
    }

    /// @inheritdoc IStakeManagerParams
    function setMinStake(uint256 _minStake) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        minStake = _minStake;
    }

    /// @inheritdoc IStakeManagerParams
    function setMinSafeRazor(uint256 _minSafeRazor) external override onlyRole(GOVERNANCE_ROLE) {
        require(_minSafeRazor <= minStake, "minSafeRazor beyond minStake");
        // slither-disable-next-line events-maths
        minSafeRazor = _minSafeRazor;
    }

    /// @inheritdoc IStakeManagerParams
    function setGracePeriod(uint16 _gracePeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        gracePeriod = _gracePeriod;
    }

    /// @inheritdoc IStakeManagerParams
    function setMaxCommission(uint8 _maxCommission) external override onlyRole(GOVERNANCE_ROLE) {
        require(_maxCommission <= 100, "Invalid Max Commission Update");
        // slither-disable-next-line events-maths
        maxCommission = _maxCommission;
    }

    /// @inheritdoc IStakeManagerParams
    function disableEscapeHatch() external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        escapeHatchEnabled = false;
    }
}
