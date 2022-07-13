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

    uint8 public buffer = 5;
    /// @notice the number of epochs for which the sRZRs are locked for calling unstake()
    uint16 public unstakeLockPeriod = 1;
    /// @notice the number of epochs for which the RAZORs are locked after initiating withdraw
    uint16 public withdrawLockPeriod = 1;
    /// @notice the number of epochs where staker/delegator needs to initiate withdraw
    uint16 public withdrawInitiationPeriod = 5;
    /**
     * @notice percentage stake penalty from the locked amount for extending unstake lock
     * incase withdrawInitiationPeriod was missed
     */
    uint32 public resetUnstakeLockPenalty = 100_000;
    /// @notice maximum commission stakers can charge from delegators on their profits
    uint8 public maxCommission = 20;
    /// @notice maximum commission change a staker can do
    uint8 public deltaCommission = 3;
    /// @notice the number of epochs for which a staker cant change commission once set/change
    uint16 public epochLimitForUpdateCommission = 100;
    /// @notice slashing params being used if staker is slashed. Slash Penalty = bounty + burned + kept == 100%
    SlashNums public slashNums = SlashNums(500_000, 9_500_000, 0);
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
    function setUnstakeLockPeriod(uint16 _unstakeLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        unstakeLockPeriod = _unstakeLockPeriod;
    }

    /// @inheritdoc IStakeManagerParams
    function setWithdrawLockPeriod(uint16 _withdrawLockPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    /// @inheritdoc IStakeManagerParams
    function setWithdrawInitiationPeriod(uint16 _withdrawInitiationPeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        withdrawInitiationPeriod = _withdrawInitiationPeriod;
    }

    /// @inheritdoc IStakeManagerParams
    function setResetUnstakeLockPenalty(uint32 _resetUnstakeLockPenalty) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        resetUnstakeLockPenalty = _resetUnstakeLockPenalty;
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
    function setMaxCommission(uint8 _maxCommission) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        maxCommission = _maxCommission;
    }

    /// @inheritdoc IStakeManagerParams
    function disableEscapeHatch() external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        escapeHatchEnabled = false;
    }

    function setBufferLength(uint8 _bufferLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        buffer = _bufferLength;
    }
}
