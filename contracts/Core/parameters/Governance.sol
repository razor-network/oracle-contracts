// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../Initializable.sol";
import "./interfaces/IBlockManagerParams.sol";
import "./interfaces/IRewardManagerParams.sol";
import "./interfaces/IStakeManagerParams.sol";
import "./interfaces/IVoteManagerParams.sol";
import "./interfaces/ICollectionManagerParams.sol";
import "../storage/Constants.sol";
import "./ACL.sol";

// slither-reason : Disabled as slither is suggesting to have params interfaces to be inherited here
// Though function signatures are same, meaning is diff
// also two interfaces are going to have some common functions in this case
// slither-disable-next-line missing-inheritance
contract Governance is Initializable, ACL, Constants {
    IBlockManagerParams public blockManagerParams;
    IRewardManagerParams public rewardManagerParams;
    IStakeManagerParams public stakeManagerParams;
    IVoteManagerParams public voteManagerParams;
    ICollectionManagerParams public collectionManagerParams;

    bytes32 public constant GOVERNER_ROLE = 0x704c992d358ec8f6051d88e5bd9f92457afedcbc3e2d110fcd019b5eda48e52e;

    //event to be emitted when any governance parameter value changes.
    event ParameterChanged(address admin, string parameterName, uint256 valueChangedTo, uint256 timestamp);

    function initialize(
        address blockManagerAddress,
        address rewardManagerAddress,
        address stakeManagerAddress,
        address voteManagerAddress,
        address collectionManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        blockManagerParams = IBlockManagerParams(blockManagerAddress);
        rewardManagerParams = IRewardManagerParams(rewardManagerAddress);
        stakeManagerParams = IStakeManagerParams(stakeManagerAddress);
        voteManagerParams = IVoteManagerParams(voteManagerAddress);
        collectionManagerParams = ICollectionManagerParams(collectionManagerAddress);
    }

    function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "penaltyNotRevealNum", _penaltyNotRevealNumerator, block.timestamp);
        rewardManagerParams.setPenaltyNotRevealNum(_penaltyNotRevealNumerator);
    }

    function setSlashParams(
        uint32 _bounty,
        uint32 _burn,
        uint32 _keep
    ) external initialized onlyRole(GOVERNER_ROLE) {
        require(_bounty + _burn + _keep <= BASE_DENOMINATOR, "Slash nums addtion exceeds 10mil");
        emit ParameterChanged(msg.sender, "bountySlashNum", _bounty, block.timestamp);
        emit ParameterChanged(msg.sender, "burnSlashNum", _burn, block.timestamp);
        emit ParameterChanged(msg.sender, "keepSlashNum", _keep, block.timestamp);
        stakeManagerParams.setSlashParams(_bounty, _burn, _keep);
    }

    function setUnstakeLockPeriod(uint8 _unstakeLockPeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "unstakeLockPeriod", _unstakeLockPeriod, block.timestamp);
        stakeManagerParams.setUnstakeLockPeriod(_unstakeLockPeriod);
    }

    function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawLockPeriod", _withdrawLockPeriod, block.timestamp);
        stakeManagerParams.setWithdrawLockPeriod(_withdrawLockPeriod);
    }

    function setWithdrawInitiationPeriod(uint8 _withdrawInitiationPeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawInitiationPeriod", _withdrawInitiationPeriod, block.timestamp);
        stakeManagerParams.setWithdrawInitiationPeriod(_withdrawInitiationPeriod);
    }

    function setExtendUnstakeLockPenalty(uint8 _extendLockPenalty) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "extendLockPenalty", _extendLockPenalty, block.timestamp);
        stakeManagerParams.setExtendUnstakeLockPenalty(_extendLockPenalty);
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

    function setMinSafeRazor(uint256 _minSafeRazor) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "minSafeRazor", _minSafeRazor, block.timestamp);
        stakeManagerParams.setMinSafeRazor(_minSafeRazor);
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

    function setDeltaCommission(uint8 _deltaCommission) external onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "deltaCommission", _deltaCommission, block.timestamp);
        stakeManagerParams.setDeltaCommission(_deltaCommission);
    }

    function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "epochLimitForUpdateCommission", _epochLimitForUpdateCommission, block.timestamp);
        stakeManagerParams.setEpochLimitForUpdateCommission(_epochLimitForUpdateCommission);
    }

    function setMaxTolerance(uint32 _maxTolerance) external onlyRole(GOVERNER_ROLE) {
        // slither-disable-next-line too-many-digits
        require(_maxTolerance <= BASE_DENOMINATOR, "maxTolerance exceeds 10000000");
        emit ParameterChanged(msg.sender, "maxTolerance", _maxTolerance, block.timestamp);
        collectionManagerParams.setMaxTolerance(_maxTolerance);
        rewardManagerParams.setMaxTolerance(_maxTolerance);
    }
}
