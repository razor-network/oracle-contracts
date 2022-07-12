// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRewardManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract RewardManagerParams is ACL, IRewardManagerParams, Constants {
    /// @notice percentage stake penalty to be given out for inactivity
    uint32 public penaltyNotRevealNum = 1000;
    /// @notice percentage age penalty to be given out for inactivity
    uint32 public penaltyAgeNotRevealNum = 100_000;
    /// @notice maximum age a staker can have
    uint32 public maxAge = 100 * 10000;
    /// @notice reward given to staker whose block is confirmed
    uint256 public blockReward = 100 * (10**18);
    /// @notice maximum percentage deviation allowed from medians for all collections
    uint32 public maxTolerance = 1_000_000;
    /// @notice maximum commission stakers can charge from delegators on their profits
    uint8 public maxCommission = 20;

    /// @inheritdoc IRewardManagerParams
    function setPenaltyNotRevealNum(uint32 _penaltyNotRevealNumerator) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    /// @inheritdoc IRewardManagerParams
    function setPenaltyAgeNotRevealNum(uint32 _penaltyAgeNotRevealNumerator) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        penaltyAgeNotRevealNum = _penaltyAgeNotRevealNumerator;
    }

    /// @inheritdoc IRewardManagerParams
    function setBlockReward(uint256 _blockReward) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        blockReward = _blockReward;
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

    /// @inheritdoc IRewardManagerParams
    function setMaxCommission(uint8 _maxCommission) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        maxCommission = _maxCommission;
    }
}
