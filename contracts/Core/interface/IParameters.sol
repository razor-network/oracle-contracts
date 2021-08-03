// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IParameters {
    function commit() external view returns (uint8);

    function reveal() external view returns (uint8);

    function propose() external view returns (uint8);

    function dispute() external view returns (uint8);

    function burnAddress() external view returns (address);

    function penaltyNotRevealNum() external view returns (uint256);

    function penaltyNotRevealDenom() external view returns (uint256);

    function resetLockPenalty() external view returns (uint256);

    function minStake() external view returns (uint256);

    function withdrawLockPeriod() external view returns (uint256);

    function withdrawReleasePeriod() external view returns (uint256);

    function maxAltBlocks() external view returns (uint8);

    function epochLength() external view returns (uint32);

    function numStates() external view returns (uint256);

    function gracePeriod() external view returns (uint256);

    function aggregationRange() external view returns (uint256);

    function exposureDenominator() external view returns (uint256);

    function slashPenaltyNum() external view returns (uint256);

    function slashPenaltyDenom() external view returns (uint256);

    function maxAssetsPerStaker() external view returns (uint256);

    function getEpoch() external view returns (uint32);

    function getState() external view returns (uint8);

    function maxAge() external view returns (uint256);

    function escapeHatchEnabled() external view returns (bool);

    function getAssetConfirmerHash() external view returns (bytes32);

    function getBlockConfirmerHash() external view returns (bytes32);

    function getStakeModifierHash() external view returns (bytes32);

    function getStakerActivityUpdaterHash() external view returns (bytes32);

    function getRewardModifierHash() external view returns (bytes32);

    function getAssetModifierHash() external view returns (bytes32);
    
    function getVoteModifierHash() external view returns (bytes32);

    function getDefaultAdminHash() external view returns (bytes32);
}
