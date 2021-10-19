// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IBlockManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract BlockManagerParams is GovernanceACL, IBlockManagerParams {
    uint8 public maxAltBlocks = 5;
    uint16 public epochLength = 300;
    uint256 public blockReward = 100 * (10**18);
    uint256 public minStake = 1000 * (10**18);

    // slither-disable-next-line missing-events-arithmetic
    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        epochLength = _epochLength;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setMaxAltBlocks(uint8 _maxAltBlocks) external override onlyGovernance {
        maxAltBlocks = _maxAltBlocks;
    }

    // slither-disable-next-line missing-events-arithmetic
    function setBlockReward(uint256 _blockReward) external override onlyGovernance {
        blockReward = _blockReward;
    }
    
    // slither-disable-next-line missing-events-arithmetic
    function setMinStake(uint256 _minStake) external override onlyGovernance {
        minStake = _minStake;
    }
}
