// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRewardManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract RewardManagerParams is ACL, IRewardManagerParams, Constants {
    /// @notice percentage stake penalty to be given out for inactivity
    uint32 public penaltyNotRevealNum = 1000;
    /**
     * @notice the number of epochs for which the staker wont be given inactivity penalties.
     * Stakers inactive for more than grace period will be penalized
     */
    uint16 public gracePeriod = 8;
    /// @notice maximum age a staker can have
    uint32 public maxAge = 100 * 10000;
    /// @notice reward given to staker whose block is confirmed
    uint256 public blockReward = 100 * (10**18);
    /// @notice maximum percentage deviation allowed from medians for all collections
    // slither-disable-next-line too-many-digits
    uint32 public maxTolerance = 1000000;

    /// @inheritdoc IRewardManagerParams
    function setPenaltyNotRevealNum(uint32 _penaltyNotRevealNumerator) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    /// @inheritdoc IRewardManagerParams
    function setBlockReward(uint256 _blockReward) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        blockReward = _blockReward;
    }

    /// @inheritdoc IRewardManagerParams
    function setGracePeriod(uint16 _gracePeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        gracePeriod = _gracePeriod;
    }

    /// @inheritdoc IRewardManagerParams
    function setMaxAge(uint32 _maxAge) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        maxAge = _maxAge;
    }

    /// @inheritdoc IRewardManagerParams
    function setMaxTolerance(uint32 _maxTolerance) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        maxTolerance = _maxTolerance;
    }
}
