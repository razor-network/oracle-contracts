// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./StakedToken.sol";

contract StakedTokenFactory {
    function createStakedToken(address stakeManagerAddress, uint32 stakerID) external returns (address) {
        StakedToken sToken = new StakedToken(stakeManagerAddress, stakerID);
        return address(sToken);
    }
}
