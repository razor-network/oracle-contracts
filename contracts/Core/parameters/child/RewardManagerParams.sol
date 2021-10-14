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

    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        // slither-disable-next-line events-access
        epochLength = _epochLength;
    }

    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external override onlyGovernance {
        // slither-disable-next-line events-accesss
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    function setBaseDenominator(uint16 _baseDenominator) external override onlyGovernance {
        // slither-disable-next-line events-access
        baseDenominator = _baseDenominator;
    }

    function setBlockReward(uint256 _blockReward) external override onlyGovernance {
        // slither-disable-next-line events-access
        blockReward = _blockReward;
    }

    function setGracePeriod(uint16 _gracePeriod) external override onlyGovernance {
        // slither-disable-next-line events-access
        gracePeriod = _gracePeriod;
    }

    function setMaxAge(uint32 _maxAge) external override onlyGovernance {
        // slither-disable-next-line events-access
        maxAge = _maxAge;
    }
}
