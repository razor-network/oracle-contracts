// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStakedTokenFactory {
    /**
     * @dev a factory contract where the sRZR for a new staker is being deployed
     * @param stakeManagerAddress address of the stake Manager contract
     * @param stakedID id of the staker whom the sRZR is being deployed
     */
    function createStakedToken(address stakeManagerAddress, uint32 stakedID) external returns (address);
}
