// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IBlockManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract BlockManagerParams is GovernanceACL, IBlockManagerParams {
    uint8 public maxAltBlocks = 5;
    uint16 public epochLength = 300;
    uint256 public blockReward = 100 * (10**18);
    uint256 public minStake = 1000 * (10**18);

    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        // slither-disable-next-line missing-events-arithmetic
        epochLength = _epochLength;
    }

    function setMaxAltBlocks(uint8 _maxAltBlocks) external override onlyGovernance {
        // slither-disable-next-line missing-events-arithmetic
        maxAltBlocks = _maxAltBlocks;
    }

    function setBlockReward(uint256 _blockReward) external override onlyGovernance {
        // slither-disable-next-line missing-events-arithmetic
        blockReward = _blockReward;
    }

    function setMinStake(uint256 _minStake) external override onlyGovernance {
        // slither-disable-next-line missing-events-arithmetic
        minStake = _minStake;
    }
}
