// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./ACL.sol";
import "./storage/Constants.sol";

contract Parameters is ACL, Constants, IParameters {
    uint8 public override withdrawLockPeriod = 1;
    uint8 public override maxAltBlocks = 5;
    uint8 public override aggregationRange = 3;
    uint8 public override withdrawReleasePeriod = 5;
    uint8 public override resetLockPenalty = 1;
    uint8 public override maxCommission = 20;
    uint16 public override penaltyNotRevealNum = 1;
    uint16 public override bountyNum = 500; // by 20, 5 %
    uint16 public override burnSlashNum = 9500; // 100 %
    uint16 public override baseDenominator = 10000;
    uint16 public override epochLength = 300;
    uint16 public override exposureDenominator = 1000;
    uint16 public override gracePeriod = 8;
    uint32 public override maxAge = 100 * 10000;
    uint256 public override minStake = 1000 * (10**18);
    uint256 public override blockReward = 100 * (10**18);

    bool public override escapeHatchEnabled = true;

    //event to be emitted when any governance parameter value changes.
    event ParameterChanged(address admin, string parameterName, uint256 valueChangedFrom, uint256 valueChangedTo, uint256 timestamp);

    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "penaltyNotRevealNum", penaltyNotRevealNum, _penaltyNotRevealNumerator, block.timestamp);
        penaltyNotRevealNum = _penaltyNotRevealNumerator;
    }

    function setBurnSlashNum(uint16 _burnSlashNum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "burnSlashNum", burnSlashNum, _burnSlashNum, block.timestamp);
        burnSlashNum = _burnSlashNum;
    }

    function setBountyNum(uint16 _bountyNum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "bountyNum", bountyNum, _bountyNum, block.timestamp);
        bountyNum = _bountyNum;
    }

    function setBaseDenominator(uint16 _baseDenominator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "baseDenom", baseDenominator, _baseDenominator, block.timestamp);
        baseDenominator = _baseDenominator;
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

    function setMaxCommission(uint8 _maxCommission) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_maxCommission <= 100, "Invalid Max Commission Update");
        emit ParameterChanged(msg.sender, "maxCommission", maxCommission, _maxCommission, block.timestamp);
        maxCommission = _maxCommission;
    }

    function disableEscapeHatch() external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ParameterChanged(msg.sender, "escapeHatchEnabled", 1, 0, block.timestamp);
        escapeHatchEnabled = false;
    }

    function getEpoch() external view override returns (uint32) {
        return (uint32(block.number) / (epochLength));
    }

    function getState() external view override returns (uint8) {
        uint8 state = uint8(((block.number) / (epochLength / NUM_STATES)) % (NUM_STATES));
        return (state);
    }
}
