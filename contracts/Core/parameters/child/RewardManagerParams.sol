// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRewardManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract RewardManagerParams is GovernanceACL, IRewardManagerParams {
    uint16 public penaltyNotRevealNum = 1;
    uint16 public baseDenominator = 10000;
    uint16 public gracePeriod = 8;
    uint16 public epochLength = 300;
    uint32 public maxAge = 100 * 10000;
    uint256 public blockReward = 100 * (10**18);

    // slither-disable-next-line missing-events-arithmetic
    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        epochLength = _epochLength;
    }
    
    // slither-disable-next-line missing-events-arithmetic
    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external override onlyGovernance {
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setBaseDenominator(uint16 _baseDenominator) external override onlyGovernance {
        baseDenominator = _baseDenominator;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setBlockReward(uint256 _blockReward) external override onlyGovernance {
        blockReward = _blockReward;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setGracePeriod(uint16 _gracePeriod) external override onlyGovernance {
        gracePeriod = _gracePeriod;
    }   

    // slither-disable-next-line missing-events-arithmetic
    function setMaxAge(uint32 _maxAge) external override onlyGovernance {
        maxAge = _maxAge;
    }
}
