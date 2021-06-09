// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./ACL.sol";

contract Parameters is IParameters, ACL {

    // TODO: Analyze what can be the maximum value (if needs to be reset) of these params.
    // constant type can be readjusted to some smaller type than uint256 for saving gas (storage variable packing).
    // penalty not reveal = 0.01% per epch
    uint256 public override penaltyNotRevealNum = 1;
    uint256 public override penaltyNotRevealDenom = 10000;

    uint256 public override minStake = 100 * (10 ** 18);
    uint256 public override withdrawLockPeriod = 1;
    uint256 public override maxAltBlocks = 5;
    uint256 public override epochLength = 300;
    uint256 public override numStates = 4;
    uint256 public override exposureDenominator = 1000;
    uint256 public override gracePeriod = 8;
    uint256 public override aggregationRange = 3;
    uint256 public override withdrawReleasePeriod = 5;
    uint256 public override resetLockPenalty = 1;

    uint32 constant private _COMMIT = 0;
    uint32 constant private _REVEAL = 1;
    uint32 constant private _PROPOSE = 2;
    uint32 constant private _DISPUTE = 3;

    // keccak256("BLOCK_CONFIRMER_ROLE")
    bytes32 constant private _BLOCK_CONFIRMER_HASH = 0x18797bc7973e1dadee1895be2f1003818e30eae3b0e7a01eb9b2e66f3ea2771f; 
    
    // keccak256("ASSET_CONFIRMER_ROLE")
    bytes32 constant private _ASSET_CONFIRMER_HASH = 0xed202a1bc048f9b31cb3937bc52e7c8fe76413f0674b9146ff4bcc15612ccbc2;
    
    // keccak256("STAKER_ACTIVITY_UPDATER_ROLE")
    bytes32 constant private _STAKER_ACTIVITY_UPDATER_HASH = 0x4cd3070aaa07d03ab33731cbabd0cb27eb9e074a9430ad006c96941d71b77ece;
    
    // keccak256("STAKE_MODIFIER_ROLE")
    bytes32 constant private _STAKE_MODIFIER_HASH = 0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804;

    // keccak256("_STAKE_REGULATOR_ROLE")
    bytes32 constant private _STAKE_REGULATOR_HASH = 0x0b461f6a1fd925fba31e2267b0b60398d8705f548554549b976b070d52b7c129;

    // keccak256("_REWARD_POOL_MODIFER_ROLE")
    bytes32 constant private _REWARD_POOL_MODIFER_HASH = 0x097c16f60a86e6bc183c508189b0dfddc876d460acd25d2d474a2d87d186cc17;

    function setPenaltyNotRevealNum(uint256 _penaltyNotRevealNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    function setPenaltyNotRevealDeom(uint256 _penaltyNotRevealDenom) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        penaltyNotRevealDenom = _penaltyNotRevealDenom;
    }

    function setWithdrawLockPeriod(uint256 _withdrawLockPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    function setWithdrawReleasePeriod(uint256 _withdrawReleasePeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
         withdrawReleasePeriod = _withdrawReleasePeriod;
    }

    function setResetLockPenalty(uint256 _resetLockPenalty) external onlyRole(DEFAULT_ADMIN_ROLE) {
        resetLockPenalty = _resetLockPenalty;
    }
    
    function setMaxAltBlocks(uint256 _maxAltBlocks) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        maxAltBlocks = _maxAltBlocks;
    }

    function setEpochLength(uint256 _epochLength) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        epochLength = _epochLength;
    }

    function setNumStates(uint256 _numStates) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        numStates = _numStates;
    }

    function setExposureDenominator(uint256 _exposureDenominator) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        exposureDenominator = _exposureDenominator;
    }

    function setMinStake(uint256 _minStake) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        minStake = _minStake;
    }

    function setGracePeriod(uint256 _gracePeriod) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        gracePeriod = _gracePeriod;
    }

    function setAggregationRange(uint256 _aggregationRange) external onlyRole(DEFAULT_ADMIN_ROLE) {
        aggregationRange = _aggregationRange;
    }

    function getEpoch() external view override returns (uint256) {
        return(block.number/(epochLength));
    }

    function getState() external view override returns (uint256) {
        uint256 _numStates = numStates;
        uint256 state = (block.number/(epochLength/_numStates));
        return (state%(_numStates));
    }

    function commit() external pure override returns (uint32) {
        return _COMMIT;
    }

    function reveal() external pure override returns (uint32) {
        return _REVEAL;
    }

    function propose() external pure override returns (uint32) {
        return _PROPOSE;
    }

    function dispute() external pure override returns (uint32) {
        return _DISPUTE;
    }

    function getBlockConfirmerHash() external pure override returns (bytes32) {
        return _BLOCK_CONFIRMER_HASH;
    }

    function getDefaultAdminHash() external pure override returns (bytes32) {
        return DEFAULT_ADMIN_ROLE;
    }

    function getAssetConfirmerHash() external pure override returns (bytes32) {
        return _ASSET_CONFIRMER_HASH;
    }

    function getStakerActivityUpdaterHash() external pure override returns (bytes32) {
        return _STAKER_ACTIVITY_UPDATER_HASH;
    }

    function getStakeModifierHash() external pure override returns (bytes32) {
        return _STAKE_MODIFIER_HASH;
    }

    function getStakeRegulatorHash() external pure override returns (bytes32) {
        return _STAKE_REGULATOR_HASH;
    }

    function getRewardPoolModifierHash() external pure override returns (bytes32) {
        return _REWARD_POOL_MODIFER_HASH;
    }
}