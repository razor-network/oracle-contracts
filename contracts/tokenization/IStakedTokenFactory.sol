// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStakedTokenFactory {
    function createStakedToken(address stakeManagerAddress, uint32 stakedID) external returns (address);
}
