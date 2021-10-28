// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRewardManagerParams.sol";
import "../ACL.sol";

abstract contract RewardManagerParams is ACL, IRewardManagerParams {
    uint16 public penaltyNotRevealNum = 1;
    uint16 public baseDenominator = 10000;
    uint16 public gracePeriod = 8;
    uint16 public epochLength = 300;
    uint32 public maxAge = 100 * 10000;
    uint256 public blockReward = 100 * (10**18);
    bytes32 public constant GOVERNANCE_ROLE = 0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1;

    function setEpochLength(uint16 _epochLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        epochLength = _epochLength;
    }

    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    function setBaseDenominator(uint16 _baseDenominator) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        baseDenominator = _baseDenominator;
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
}
