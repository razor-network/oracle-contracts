// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRandomNoProvider {
    /**
     * @notice Called by BlockManager in ClaimBlockReward or ConfirmBlockLastEpoch
     * @param epoch current epoch
     * @param _secret hash of encoded rando secret from stakers
     */
    function provideSecret(uint32 epoch, bytes32 _secret) external;
}
