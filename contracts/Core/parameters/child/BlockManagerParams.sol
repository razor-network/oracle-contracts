// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IBlockManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract BlockManagerParams is ACL, IBlockManagerParams, Constants {
    uint8 public maxAltBlocks = 5;
    uint256 public blockReward = 100 * (10**18);
    uint256 public minStake = 20000 * (10**18);

    function setMaxAltBlocks(uint8 _maxAltBlocks) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        maxAltBlocks = _maxAltBlocks;
    }

    function setBlockReward(uint256 _blockReward) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        blockReward = _blockReward;
    }

    function setMinStake(uint256 _minStake) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        minStake = _minStake;
    }
}
