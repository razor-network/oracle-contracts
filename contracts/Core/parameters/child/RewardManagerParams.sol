// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRewardManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract RewardManagerParams is ACL, IRewardManagerParams, Constants {
    uint32 public penaltyNotRevealNum = 1000;
    uint16 public gracePeriod = 8;
    uint32 public maxAge = 100 * 10000;
    uint256 public blockReward = 100 * (10**18);
    // slither-disable-next-line too-many-digits
    uint32 public maxTolerance = 1000000;

    function setPenaltyNotRevealNum(uint32 _penaltyNotRevealNumerator) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    function setBlockReward(uint256 _blockReward) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        blockReward = _blockReward;
    }

    function setGracePeriod(uint16 _gracePeriod) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        gracePeriod = _gracePeriod;
    }

    function setMaxAge(uint32 _maxAge) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        maxAge = _maxAge;
    }

    function setMaxTolerance(uint32 _maxTolerance) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        maxTolerance = _maxTolerance;
    }
}
