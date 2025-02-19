// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../../Initializable.sol";
import "./interfaces/IBlockManagerParams.sol";
import "./interfaces/IBondManagerParams.sol";
import "./interfaces/IRewardManagerParams.sol";
import "./interfaces/IRandomNoManagerParams.sol";
import "./interfaces/IStakeManagerParams.sol";
import "./interfaces/IVoteManagerParams.sol";
import "./interfaces/ICollectionManagerParams.sol";
import "./../interface/IStakeManager.sol";
import "./../interface/IBondManager.sol";
import "../storage/Constants.sol";
import "./ACL.sol";

// slither-reason : Disabled as slither is suggesting to have params interfaces to be inherited here
// Though function signatures are same, meaning is diff
// also two interfaces are going to have some common functions in this case
// slither-disable-next-line missing-inheritance
contract Governance is Initializable, ACL, Constants {
    IBlockManagerParams public blockManagerParams;
    IBondManagerParams public bondManagerParams;
    IRewardManagerParams public rewardManagerParams;
    IStakeManagerParams public stakeManagerParams;
    IVoteManagerParams public voteManagerParams;
    ICollectionManagerParams public collectionManagerParams;
    IStakeManager public stakeManager;
    IBondManager public bondManager;
    IRandomNoManagerParams public randomNoManagerParams;

    bytes32 public constant GOVERNER_ROLE = 0x704c992d358ec8f6051d88e5bd9f92457afedcbc3e2d110fcd019b5eda48e52e;

    /**
     * @notice emitted when any governance parameter value changes.
     * @param admin address of the admin
     * @param parameterName the parameter that is changing
     * @param valueChangedTo new value of the parameter
     * @param timestamp the exact time the parameter change took place
     */
    event ParameterChanged(address indexed admin, string parameterName, uint256 valueChangedTo, uint256 timestamp);

    /**
     * @param blockManagerAddress The address of the BlockManager contract
     * @param rewardManagerAddress The address of the RewardManager contract
     * @param stakeManagerAddress The address of the StakeManager contract
     * @param voteManagerAddress The address of the VoteManager contract
     * @param collectionManagerAddress The address of the CollectionManager contract
     */
    function initialize(
        address blockManagerAddress,
        address bondManagerAddress,
        address rewardManagerAddress,
        address stakeManagerAddress,
        address voteManagerAddress,
        address collectionManagerAddress,
        address randomNoManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        blockManagerParams = IBlockManagerParams(blockManagerAddress);
        bondManagerParams = IBondManagerParams(bondManagerAddress);
        rewardManagerParams = IRewardManagerParams(rewardManagerAddress);
        stakeManagerParams = IStakeManagerParams(stakeManagerAddress);
        voteManagerParams = IVoteManagerParams(voteManagerAddress);
        collectionManagerParams = ICollectionManagerParams(collectionManagerAddress);
        stakeManager = IStakeManager(stakeManagerAddress);
        bondManager = IBondManager(bondManagerAddress);
        randomNoManagerParams = IRandomNoManagerParams(randomNoManagerAddress);
    }

    /**
     * @notice changing the percentage stake penalty to be given out for inactivity
     * @dev can be called only by the the address that has the governer role
     * @param _penaltyNotRevealNumerator updated value to be set for penaltyNotRevealNumerator
     */
    function setPenaltyNotRevealNum(uint32 _penaltyNotRevealNumerator) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "penaltyNotRevealNum", _penaltyNotRevealNumerator, block.timestamp);
        rewardManagerParams.setPenaltyNotRevealNum(_penaltyNotRevealNumerator);
    }

    /**
     * @notice changing the percentage age penalty to be given out for inactivity
     * @dev can be called only by the the address that has the governer role
     * @param _penaltyAgeNotRevealNumerator updated value to be set for penaltyAgeNotRevealNumerator
     */
    function setPenaltyAgeNotRevealNum(uint32 _penaltyAgeNotRevealNumerator) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "penaltyAgeNotRevealNum", _penaltyAgeNotRevealNumerator, block.timestamp);
        rewardManagerParams.setPenaltyAgeNotRevealNum(_penaltyAgeNotRevealNumerator);
    }

    /**
     * @notice changing slashing parameters
     * @dev can be called only by the the address that has the governer role
     * @param _bounty updated percent value to be set for bounty
     * @param _burn updated percent value to be set for burn
     * @param _keep updated percent value to be set for keep
     */
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

    /**
     * @notice changing the number of epochs for which the sRZRs are locked for calling unstake()
     * @dev can be called only by the the address that has the governer role
     * @param _unstakeLockPeriod updated value to be set for unstakeLockPeriod
     */
    function setUnstakeLockPeriod(uint16 _unstakeLockPeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "unstakeLockPeriod", _unstakeLockPeriod, block.timestamp);
        stakeManagerParams.setUnstakeLockPeriod(_unstakeLockPeriod);
    }

    /**
     * @notice changing the number of epochs for which the RAZORs are locked after initiating withdraw
     * @dev can be called only by the the address that has the governer role
     * @param _withdrawLockPeriod updated value to be set for withdrawLockPeriod
     */
    function setWithdrawLockPeriod(uint16 _withdrawLockPeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawLockPeriod", _withdrawLockPeriod, block.timestamp);
        stakeManagerParams.setWithdrawLockPeriod(_withdrawLockPeriod);
        bondManagerParams.setWithdrawLockPeriod(_withdrawLockPeriod);
    }

    /**
     * @notice changing the number of epochs where staker/delegator needs to initiate withdraw
     * @dev can be called only by the the address that has the governer role
     * @param _withdrawInitiationPeriod updated value to be set for withdrawInitiationPeriod
     */
    function setWithdrawInitiationPeriod(uint16 _withdrawInitiationPeriod) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "withdrawInitiationPeriod", _withdrawInitiationPeriod, block.timestamp);
        stakeManagerParams.setWithdrawInitiationPeriod(_withdrawInitiationPeriod);
    }

    /**
     * @notice changing percentage stake penalty from the locked amount for extending unstake lock
     * incase withdrawInitiationPeriod was missed
     * @dev can be called only by the the address that has the governer role
     * @param _extendLockPenalty updated value to be set for extendLockPenalty
     */
    function setResetUnstakeLockPenalty(uint32 _extendLockPenalty) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "extendLockPenalty", _extendLockPenalty, block.timestamp);
        stakeManagerParams.setResetUnstakeLockPenalty(_extendLockPenalty);
    }

    /**
     * @notice changing the maximum number of best proposed blocks to be considered for dispute
     * @dev can be called only by the the address that has the governer role
     * @param _maxAltBlocks updated value to be set for maxAltBlocks
     */
    function setMaxAltBlocks(uint8 _maxAltBlocks) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "maxAltBlocks", _maxAltBlocks, block.timestamp);
        blockManagerParams.setMaxAltBlocks(_maxAltBlocks);
    }

    /**
     * @notice changing minimum amount that to be staked for participation
     * @dev can be called only by the the address that has the governer role
     * @param _minStake updated value to be set for minStake
     */
    function setMinStake(uint256 _minStake) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "minStake", _minStake, block.timestamp);
        stakeManagerParams.setMinStake(_minStake);
        voteManagerParams.setMinStake(_minStake);
        blockManagerParams.setMinStake(_minStake);
    }

    /**
     * @notice changing minimum amount that to be staked to become a staker
     * @dev can be called only by the the address that has the governer role
     * @param _minSafeRazor updated value to be set for minSafeRazor
     */
    function setMinSafeRazor(uint256 _minSafeRazor) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "minSafeRazor", _minSafeRazor, block.timestamp);
        stakeManagerParams.setMinSafeRazor(_minSafeRazor);
    }

    /**
     * @notice changing the block reward given out to stakers
     * @dev can be called only by the the address that has the governer role
     * @param _blockReward updated value to be set for blockReward
     */
    function setBlockReward(uint256 _blockReward) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "blockReward", _blockReward, block.timestamp);
        blockManagerParams.setBlockReward(_blockReward);
        rewardManagerParams.setBlockReward(_blockReward);
    }

    /**
     * @notice changing the maximum age a staker can have
     * @dev can be called only by the the address that has the governer role
     * @param _maxAge updated value to be set for maxAge
     */
    function setMaxAge(uint32 _maxAge) external initialized onlyRole(GOVERNER_ROLE) {
        require(_maxAge <= stakeManager.maturitiesLength() * 10000, "Invalid Max Age Update");
        emit ParameterChanged(msg.sender, "maxAge", _maxAge, block.timestamp);
        rewardManagerParams.setMaxAge(_maxAge);
    }

    /**
     * @notice changing maximum commission stakers can charge from delegators on their profits
     * @dev can be called only by the the address that has the governance role
     * @param _maxCommission updated value to be set for maxCommission
     */
    function setMaxCommission(uint8 _maxCommission) external initialized onlyRole(GOVERNER_ROLE) {
        require(_maxCommission <= 100, "Invalid Max Commission Update");
        emit ParameterChanged(msg.sender, "maxCommission", _maxCommission, block.timestamp);
        stakeManagerParams.setMaxCommission(_maxCommission);
        rewardManagerParams.setMaxCommission(_maxCommission);
    }

    /**
     * @notice sets escape hatch to false permanently
     * @dev can be called only by the the address that has the governer role
     */
    function disableEscapeHatch() external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "escapeHatchEnabled", 0, block.timestamp);
        stakeManagerParams.disableEscapeHatch();
    }

    /**
     * @notice changing maximum commission change a staker can do
     * @dev can be called only by the the address that has the governance role
     * @param _deltaCommission updated value to be set for deltaCommission
     */
    function setDeltaCommission(uint8 _deltaCommission) external initialized onlyRole(GOVERNER_ROLE) {
        require(_deltaCommission <= 100, "deltaCommission exceeds 100");
        emit ParameterChanged(msg.sender, "deltaCommission", _deltaCommission, block.timestamp);
        stakeManagerParams.setDeltaCommission(_deltaCommission);
    }

    /**
     * @notice changing the number of epochs for which a staker cant change commission once set/change
     * @dev can be called only by the the address that has the governance role
     * @param _epochLimitForUpdateCommission updated value to be set for epochLimitForUpdateCommission
     */
    function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "epochLimitForUpdateCommission", _epochLimitForUpdateCommission, block.timestamp);
        stakeManagerParams.setEpochLimitForUpdateCommission(_epochLimitForUpdateCommission);
    }

    /**
     * @notice changing the maximum percentage deviation allowed from medians for all collections
     * @dev can be called only by the the address that has the governance role
     * @param _maxTolerance updated value for maxTolerance
     */
    function setMaxTolerance(uint32 _maxTolerance) external initialized onlyRole(GOVERNER_ROLE) {
        require(_maxTolerance <= BASE_DENOMINATOR, "maxTolerance exceeds baseDenom");
        emit ParameterChanged(msg.sender, "maxTolerance", _maxTolerance, block.timestamp);
        collectionManagerParams.setMaxTolerance(_maxTolerance);
        rewardManagerParams.setMaxTolerance(_maxTolerance);
    }

    /**
     * @notice changing maximum number of collections that can be assigned to the staker
     * @dev can be called only by the the address that has the governance role
     * @param _toAssign updated value to be set for toAssign
     */
    function setToAssign(uint16 _toAssign) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "toAssign", _toAssign, block.timestamp);
        voteManagerParams.setToAssign(_toAssign);
    }

    /**
     * @notice chnaging the buffer length of all the contracts
     * @dev can be called only by the the address that has the governance role
     * @param _bufferLength updated value to be set for buffer
     */
    function setBufferLength(uint8 _bufferLength) external initialized onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "_bufferLength", _bufferLength, block.timestamp);
        blockManagerParams.setBufferLength(_bufferLength);
        voteManagerParams.setBufferLength(_bufferLength);
        collectionManagerParams.setBufferLength(_bufferLength);
        randomNoManagerParams.setBufferLength(_bufferLength);
        bondManagerParams.setBufferLength(_bufferLength);
    }

    function setDepositPerJob(uint256 _depositPerJob) external onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "_depositPerJob", _depositPerJob, block.timestamp);
        bondManagerParams.setDepositPerJob(_depositPerJob);
        bondManager.occurrenceRecalculation();
    }

    function setMinBond(uint256 _minBond) external onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "_minBond", _minBond, block.timestamp);
        bondManagerParams.setMinBond(_minBond);
        bondManager.databondCollectionsReset();
    }

    function setMinJobs(uint8 _minJobs) external onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "_minJobs", _minJobs, block.timestamp);
        bondManagerParams.setMinJobs(_minJobs);
        bondManager.databondCollectionsReset();
    }

    function setMaxJobs(uint8 _maxJobs) external onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "_maxJobs", _maxJobs, block.timestamp);
        bondManagerParams.setMaxJobs(_maxJobs);
        bondManager.databondCollectionsReset();
    }

    function setEpochLimitForUpdateBond(uint16 _epochLimitForUpdateBond) external onlyRole(GOVERNER_ROLE) {
        emit ParameterChanged(msg.sender, "_epochLimitForUpdateBond", _epochLimitForUpdateBond, block.timestamp);
        bondManagerParams.setEpochLimitForUpdateBond(_epochLimitForUpdateBond);
    }
}
