// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./StakedToken.sol";
import "./IStakedTokenFactory.sol";

contract StakedTokenFactory {
    function createStakedToken(address stakeManagerAddress) external returns (address) {
        StakedToken sToken = new StakedToken(stakeManagerAddress);
        return address(sToken);
    }
}
