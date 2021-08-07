// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./ACL.sol";
import "./storage/Constants.sol";

contract Parameters is ACL, Constants {
    uint16 public penaltyNotRevealNum = 1;
    uint16 public penaltyNotRevealDenom = 10000;
    uint16 public slashPenaltyNum = 10000;
    uint16 public slashPenaltyDenom = 10000;

    uint256 public minStake = 1000 * (10**18);
    uint256 public blockReward = 100 * (10**18);
    uint8 public withdrawLockPeriod = 1;
    uint8 public maxAltBlocks = 5;
    uint16 public epochLength = 300;
    uint16 public exposureDenominator = 1000;
    uint16 public gracePeriod = 8;
    uint8 public aggregationRange = 3;
    uint8 public withdrawReleasePeriod = 5;
    uint8 public resetLockPenalty = 1;
    uint32 public maxAge = 100 * 10000;

    bool public escapeHatchEnabled = true;

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
        uint8 state = uint8(((block.number) / (epochLength / NUM_STATES)));
        return (state % (NUM_STATES));
    }
}
