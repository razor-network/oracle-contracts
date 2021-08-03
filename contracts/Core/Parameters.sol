// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./ACL.sol";

contract Parameters is ACL {
    // constant type can be readjusted to some smaller type than uint256 for saving gas (storage variable packing).
    // penalty not reveal = 0.01% per epch
    uint256 public penaltyNotRevealNum = 1;
    uint256 public penaltyNotRevealDenom = 10000;
    uint256 public slashPenaltyNum = 10000;
    uint256 public slashPenaltyDenom = 10000;

    uint256 public minStake = 100 * (10**18);
    uint256 public withdrawLockPeriod = 1;
    uint8 public maxAltBlocks = 5;
    uint32 public epochLength = 300;
    uint32 public numStates = 4;
    uint256 public exposureDenominator = 1000;
    uint256 public gracePeriod = 8;
    uint256 public aggregationRange = 3;
    uint256 public withdrawReleasePeriod = 5;
    uint256 public resetLockPenalty = 1;
    uint256 public maxAge = 100 * 10000;
    // Note : maxAssetsPerStaker should be less than total no of jobs
    uint256 public maxAssetsPerStaker = 2;
    bool public escapeHatchEnabled = true;

    uint8 private constant _COMMIT = 0;
    uint8 private constant _REVEAL = 1;
    uint8 private constant _PROPOSE = 2;
    uint8 private constant _DISPUTE = 3;

    address public burnAddress = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    // keccak256("BLOCK_CONFIRMER_ROLE")
    bytes32 private constant _BLOCK_CONFIRMER_HASH = 0x18797bc7973e1dadee1895be2f1003818e30eae3b0e7a01eb9b2e66f3ea2771f;

    // keccak256("ASSET_CONFIRMER_ROLE")
    bytes32 private constant _ASSET_CONFIRMER_HASH = 0xed202a1bc048f9b31cb3937bc52e7c8fe76413f0674b9146ff4bcc15612ccbc2;

    // keccak256("STAKER_ACTIVITY_UPDATER_ROLE")
    bytes32 private constant _STAKER_ACTIVITY_UPDATER_HASH = 0x4cd3070aaa07d03ab33731cbabd0cb27eb9e074a9430ad006c96941d71b77ece;

    // keccak256("STAKE_MODIFIER_ROLE")
    bytes32 private constant _STAKE_MODIFIER_HASH = 0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804;

    // keccak256("REWARD_MODIFIER_ROLE")
    bytes32 private constant _REWARD_MODIFIER_HASH = 0xcabcaf259dd9a27f23bd8a92bacd65983c2ebf027c853f89f941715905271a8d;

    // keccak256("ASSET_MODIFIER_ROLE")
    bytes32 private constant _ASSET_MODIFIER_HASH = 0xca0fffcc0404933256f3ec63d47233fbb05be25fc0eacc2cfb1a2853993fbbe4;

    // keccak256("VOTE_MODIFIER_ROLE")
    bytes32 private constant _VOTE_MODIFIER_HASH = 0xca0fffcc0404933256f3ec63d47233fbb05be25fc0eacc2cfb1a2853993fbbe5;

    function setPenaltyNotRevealNum(uint256 _penaltyNotRevealNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    function setPenaltyNotRevealDeom(uint256 _penaltyNotRevealDenom) external onlyRole(DEFAULT_ADMIN_ROLE) {
        penaltyNotRevealDenom = _penaltyNotRevealDenom;
    }

    function setSlashPenaltyNum(uint256 _slashPenaltyNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slashPenaltyNum = _slashPenaltyNumerator;
    }

    function setSlashPenaltyDenom(uint256 _slashPenaltyDenominator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slashPenaltyDenom = _slashPenaltyDenominator;
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

    function setMaxAltBlocks(uint8 _maxAltBlocks) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxAltBlocks = _maxAltBlocks;
    }

    function setEpochLength(uint8 _epochLength) external onlyRole(DEFAULT_ADMIN_ROLE) {
        epochLength = _epochLength;
    }

    function setNumStates(uint32 _numStates) external onlyRole(DEFAULT_ADMIN_ROLE) {
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

    function setmaxAssetsPerStaker(uint256 _maxAssetsPerStaker) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxAssetsPerStaker = _maxAssetsPerStaker;
    }

    function setMaxAge(uint256 _maxAge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxAge = _maxAge;
    }

    function disableEscapeHatch() external onlyRole(DEFAULT_ADMIN_ROLE) {
        escapeHatchEnabled = false;
    }

    function getEpoch() external view returns (uint32) {
        return (uint32(block.number)/ (epochLength));
    }

    function getState() external view returns (uint32) {
        uint32 state = (uint32(block.number) / (epochLength / numStates));
        return (state % (numStates));
    }

    function commit() external pure returns (uint8) {
        return _COMMIT;
    }

    function reveal() external pure returns (uint8) {
        return _REVEAL;
    }

    function propose() external pure returns (uint8) {
        return _PROPOSE;
    }

    function dispute() external pure returns (uint8) {
        return _DISPUTE;
    }

    function getBlockConfirmerHash() external pure returns (bytes32) {
        return _BLOCK_CONFIRMER_HASH;
    }

    function getDefaultAdminHash() external pure returns (bytes32) {
        return DEFAULT_ADMIN_ROLE;
    }

    function getAssetConfirmerHash() external pure returns (bytes32) {
        return _ASSET_CONFIRMER_HASH;
    }

    function getStakerActivityUpdaterHash() external pure returns (bytes32) {
        return _STAKER_ACTIVITY_UPDATER_HASH;
    }

    function getStakeModifierHash() external pure returns (bytes32) {
        return _STAKE_MODIFIER_HASH;
    }

    function getRewardModifierHash() external pure returns (bytes32) {
        return _REWARD_MODIFIER_HASH;
    }

    function getAssetModifierHash() external pure returns (bytes32) {
        return _ASSET_MODIFIER_HASH;
    }
    
    function getVoteModifierHash() external pure returns (bytes32) {
        return _VOTE_MODIFIER_HASH;
    }
}
