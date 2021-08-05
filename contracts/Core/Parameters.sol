// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./ACL.sol";

contract Parameters is ACL {
    // constant type can be readjusted to some smaller type than uint256 for saving gas (storage variable packing).
    // penalty not reveal = 0.01% per epch

    uint16 public penaltyNotRevealNum = 1;
    uint16 public penaltyNotRevealDenom = 10000;
    uint16 public slashPenaltyNum = 10000;
    uint16 public slashPenaltyDenom = 10000;

    uint256 public minStake = 1000 * (10**18);
    uint256 public blockReward = 100 * (10**18);
    uint8 public withdrawLockPeriod = 1;
    uint8 public maxAltBlocks = 5;
    uint16 public epochLength = 300;
    uint8 public numStates = 4;
    uint16 public exposureDenominator = 1000;
    uint16 public gracePeriod = 8;
    uint8 public aggregationRange = 3;
    uint8 public withdrawReleasePeriod = 5;
    uint8 public resetLockPenalty = 1;
    uint32 public maxAge = 100 * 10000;

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

    //event to be emitted when any governance parameter value changes.
    event ParameterChanged(address admin, string parameterName, uint256 valueChangedFrom, uint256 valueChangedTo, uint256 timestamp);

    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "penaltyNotRevealNum", penaltyNotRevealNum, _penaltyNotRevealNumerator, block.timestamp);
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    function setPenaltyNotRevealDeom(uint16 _penaltyNotRevealDenom) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "penaltyNotRevealDenom", penaltyNotRevealDenom, _penaltyNotRevealDenom, block.timestamp);
        penaltyNotRevealDenom = _penaltyNotRevealDenom;
    }

    function setSlashPenaltyNum(uint16 _slashPenaltyNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "slashPenaltyNum", slashPenaltyNum, _slashPenaltyNumerator, block.timestamp);
        slashPenaltyNum = _slashPenaltyNumerator;
    }

    function setSlashPenaltyDenom(uint16 _slashPenaltyDenominator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "slashPenaltyDenom", slashPenaltyDenom, _slashPenaltyDenominator, block.timestamp);
        slashPenaltyDenom = _slashPenaltyDenominator;
    }

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawLockPeriod", withdrawLockPeriod, _withdrawLockPeriod, block.timestamp);
        withdrawLockPeriod = _withdrawLockPeriod;
    }

    function setWithdrawReleasePeriod(uint8 _withdrawReleasePeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawReleasePeriod", withdrawReleasePeriod, _withdrawReleasePeriod, block.timestamp);
        withdrawReleasePeriod = _withdrawReleasePeriod;
    }

    function setResetLockPenalty(uint8 _resetLockPenalty) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "resetLockPenalty", resetLockPenalty, _resetLockPenalty, block.timestamp);
        resetLockPenalty = _resetLockPenalty;
    }

    function setMaxAltBlocks(uint8 _maxAltBlocks) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "maxAltBlocks", maxAltBlocks, _maxAltBlocks, block.timestamp);
        maxAltBlocks = _maxAltBlocks;
    }

    function setEpochLength(uint16 _epochLength) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "epochLength", epochLength, _epochLength, block.timestamp);
        epochLength = _epochLength;
    }

    function setNumStates(uint8 _numStates) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "numStates", numStates, _numStates, block.timestamp);
        numStates = _numStates;
    }

    function setExposureDenominator(uint16 _exposureDenominator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "exposureDenominator", exposureDenominator, _exposureDenominator, block.timestamp);
        exposureDenominator = _exposureDenominator;
    }

    function setMinStake(uint256 _minStake) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "minStake", minStake, _minStake, block.timestamp);
        minStake = _minStake;
    }

    function setBlockReward(uint256 _blockReward) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blockReward = _blockReward;
    }

    function setGracePeriod(uint16 _gracePeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "gracePeriod", gracePeriod, _gracePeriod, block.timestamp);
        gracePeriod = _gracePeriod;
    }

    function setAggregationRange(uint8 _aggregationRange) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "aggregationRange", aggregationRange, _aggregationRange, block.timestamp);
        aggregationRange = _aggregationRange;
    }

    function setMaxAge(uint32 _maxAge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "maxAge", maxAge, _maxAge, block.timestamp);
        maxAge = _maxAge;
    }

    function disableEscapeHatch() external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "escapeHatchEnabled", 1, 0, block.timestamp);
        escapeHatchEnabled = false;
    }

    function getEpoch() external view returns (uint32) {
        return (uint32(block.number) / (epochLength));
    }

    function getState() external view returns (uint8) {
        uint8 state = uint8(((block.number) / (epochLength / numStates)));
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
