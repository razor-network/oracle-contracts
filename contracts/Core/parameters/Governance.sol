// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../Initializable.sol";
import "./interfaces/IBlockManagerParams.sol";
import "./interfaces/IRewardManagerParams.sol";
import "./interfaces/IStakeManagerParams.sol";
import "./interfaces/IVoteManagerParams.sol";
import "./interfaces/IAssetManagerParams.sol";
import "./interfaces/IDelegatorParams.sol";
import "./interfaces/IRandomNoManagerParams.sol";
import "../ACL.sol";

contract Governance is Initializable, ACL {
    IBlockManagerParams public blockManagerParams;
    IRewardManagerParams public rewardManagerParams;
    IStakeManagerParams public stakeManagerParams;
    IVoteManagerParams public voteManagerParams;
    IAssetManagerParams public assetManagerParams;
    IDelegatorParams public delegatorParams;
    IRandomNoManagerParams public randomNoManagerParams;

    bytes32 public constant GOVERNER_ROLE = 0x704c992d358ec8f6051d88e5bd9f92457afedcbc3e2d110fcd019b5eda48e52e;

    function initialize(
        address blockManagerAddress,
        address rewardManagerAddress,
        address stakeManagerAddress,
        address voteManagerAddress,
        address assetManagerAddress,
        address delegatorAddress,
        address randomNoManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        blockManagerParams = IBlockManagerParams(blockManagerAddress);
        rewardManagerParams = IRewardManagerParams(rewardManagerAddress);
        stakeManagerParams = IStakeManagerParams(stakeManagerAddress);
        voteManagerParams = IVoteManagerParams(voteManagerAddress);
        assetManagerParams = IAssetManagerParams(assetManagerAddress);
        delegatorParams = IDelegatorParams(delegatorAddress);
        randomNoManagerParams = IRandomNoManagerParams(randomNoManagerAddress);
    }

    //event to be emitted when any governance parameter value changes.
    event ParameterChanged(address admin, string parameterName, uint256 valueChangedTo, uint256 timestamp);

    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "penaltyNotRevealNum", _penaltyNotRevealNumerator, block.timestamp);
        rewardManagerParams.setPenaltyNotRevealNum(_penaltyNotRevealNumerator);
    }

    function setSlashParams(
        uint16 _bounty,
        uint16 _burn,
        uint16 _keep
    ) external initialized onlyRole(GOVERNER_ROLE) {
        require(_bounty + _burn + _keep <= stakeManagerParams.baseDenominator(), "Slash nums addtion exceeds 10000");
        emit ParameterChanged(msg.sender, "bountySlashNum", _bounty, block.timestamp);
        emit ParameterChanged(msg.sender, "burnSlashNum", _burn, block.timestamp);
        emit ParameterChanged(msg.sender, "keepSlashNum", _keep, block.timestamp);
        stakeManagerParams.setSlashParams(_bounty, _burn, _keep);
    }

    function setBaseDenominator(uint16 _baseDenominator) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "baseDenom", _baseDenominator, block.timestamp);
        rewardManagerParams.setBaseDenominator(_baseDenominator);
        stakeManagerParams.setBaseDenominator(_baseDenominator);
    }

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawLockPeriod", _withdrawLockPeriod, block.timestamp);
        stakeManagerParams.setWithdrawLockPeriod(_withdrawLockPeriod);
    }

    function setWithdrawReleasePeriod(uint8 _withdrawReleasePeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawReleasePeriod", _withdrawReleasePeriod, block.timestamp);
        stakeManagerParams.setWithdrawReleasePeriod(_withdrawReleasePeriod);
    }

    function setExtendLockPenalty(uint8 _extendLockPenalty) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "extendLockPenalty", _extendLockPenalty, block.timestamp);
        stakeManagerParams.setExtendLockPenalty(_extendLockPenalty);
    }

    function setMaxAltBlocks(uint8 _maxAltBlocks) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "maxAltBlocks", _maxAltBlocks, block.timestamp);
        blockManagerParams.setMaxAltBlocks(_maxAltBlocks);
    }

    function setMinStake(uint256 _minStake) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "minStake", _minStake, block.timestamp);
        stakeManagerParams.setMinStake(_minStake);
        voteManagerParams.setMinStake(_minStake);
        blockManagerParams.setMinStake(_minStake);
    }

    function setBlockReward(uint256 _blockReward) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "blockReward", _blockReward, block.timestamp);
        blockManagerParams.setBlockReward(_blockReward);
        rewardManagerParams.setBlockReward(_blockReward);
    }

    function setGracePeriod(uint16 _gracePeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "gracePeriod", _gracePeriod, block.timestamp);
        rewardManagerParams.setGracePeriod(_gracePeriod);
        stakeManagerParams.setGracePeriod(_gracePeriod);
    }

    function setMaxAge(uint32 _maxAge) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "maxAge", _maxAge, block.timestamp);
        rewardManagerParams.setMaxAge(_maxAge);
    }

    function setMaxCommission(uint8 _maxCommission) external initialized onlyRole(GOVERNER_ROLE) {
        require(_maxCommission <= 100, "Invalid Max Commission Update");
        emit ParameterChanged(msg.sender, "maxCommission", _maxCommission, block.timestamp);
        stakeManagerParams.setMaxCommission(_maxCommission);
    }

    function disableEscapeHatch() external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "escapeHatchEnabled", 0, block.timestamp);
        stakeManagerParams.disableEscapeHatch();
    }

    function setEpochLength(uint16 _epochLength) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "epochLength", _epochLength, block.timestamp);
        blockManagerParams.setEpochLength(_epochLength);
        rewardManagerParams.setEpochLength(_epochLength);
        stakeManagerParams.setEpochLength(_epochLength);
        voteManagerParams.setEpochLength(_epochLength);
        assetManagerParams.setEpochLength(_epochLength);
        delegatorParams.setEpochLength(_epochLength);
        randomNoManagerParams.setEpochLength(_epochLength);
    }
}
