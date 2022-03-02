// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./StakedToken.sol";
import "./IStakedTokenFactory.sol";

contract StakedTokenFactory is IStakedTokenFactory {
    /// @inheritdoc IStakedTokenFactory
    function createStakedToken(address stakeManagerAddress, uint32 stakerID) external override returns (address) {
        require(stakeManagerAddress != address(0x0), "zero address check");
        StakedToken sToken = new StakedToken(stakeManagerAddress, stakerID);
        return address(sToken);
    }
}
