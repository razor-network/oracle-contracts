// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IVoteManager.sol";
import "../tokenization/IStakedTokenFactory.sol";
import "../tokenization/IStakedToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./storage/StakeStorage.sol";
import "./parameters/child/StakeManagerParams.sol";
import "../Initializable.sol";
import "./StateManager.sol";
import "../Pause.sol";

/** @title StakeManager
 * @notice StakeManager handles stake, unstake, withdraw, reward, functions
 * for stakers
 */

contract StakeManager is Initializable, StakeStorage, StateManager, Pause, StakeManagerParams, IStakeManager {
    IRewardManager public rewardManager;
    IVoteManager public voteManager;
    IERC20 public razor;
    IStakedTokenFactory public stakedTokenFactory;

    /**
     * @dev Emitted when sRZR are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     * @param amount amount of sRZR transferred
     * @param stakerId the id of the staker whose sRZR is involved in the transfer
     */
    event SrzrTransfer(address from, address to, uint256 amount, uint32 stakerId);

    /**
     * @dev Emitted when there has been change in the stake of the staker.
     * @param epoch in which change of stake took place
     * @param stakerId id of the staker whose stake was changed
     * @param reason reason why the the change in stake took place
     * @param prevStake stake before the change took place
     * @param newStake updated stake
     * @param timestamp time at which the change took place
     */
    event StakeChange(
        uint32 epoch,
        uint32 indexed stakerId,
        Constants.StakeChanged reason,
        uint256 prevStake,
        uint256 newStake,
        uint256 timestamp
    );

    /**
     * @dev Emitted when there has been change in the age of the staker.
     * @param epoch in which change of age took place
     * @param stakerId id of the staker whose age was changed
     * @param newAge updated age
     * @param reason reason why the the change in age took place
     * @param timestamp time at which the change took place
     */
    event AgeChange(uint32 epoch, uint32 indexed stakerId, uint32 newAge, Constants.AgeChanged reason, uint256 timestamp);

    /**
     * @dev Emitted when staker stakes for the first time or adds stake.
     * @param staker address of the staker
     * @param sToken address of the staker's sRZR
     * @param epoch in which stake was added
     * @param stakerId id of the staker who staked
     * @param amount stake amount added
     * @param newStake current stake after staking
     * @param totalSupply total amount of staker's sRZRs minted
     * @param timestamp time at which the staker staked
     */
    event Staked(
        address staker,
        address sToken,
        uint32 epoch,
        uint32 indexed stakerId,
        uint256 amount,
        uint256 newStake,
        uint256 totalSupply,
        uint256 timestamp
    );

    /**
     * @dev Emitted when staker/delegator unstakes.
     * @param staker address of the staker/delegator
     * @param epoch in which staker unstaked
     * @param stakerId id of the staker whose corresponding sRZR is being unstaked
     * @param amount amount of sRZR being unstaked
     * @param newStake current stake after unstaking
     * @param timestamp time at which the staker/delegator unstaked
     */
    event Unstaked(address staker, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp);

    /**
     * @dev Emitted when staker/delegator initiates withdraw.
     * @param staker address of the staker/delegator
     * @param epoch in which staker withdraw was initiated
     * @param stakerId id of the staker whose corresponding sRZR is being unstaked
     * @param amount amount of RZR being unstaked
     * @param newStake current stake after withdraw was initiated
     * @param timestamp time at which the staker/delegator initiated withdraw
     */
    event WithdrawInitiated(
        address staker,
        uint32 epoch,
        uint32 indexed stakerId,
        uint256 amount,
        uint256 newStake,
        uint256 totalSupply,
        uint256 timestamp
    );

    /**
     * @dev Emitted when staker/delegator completes withdraw.
     * @param staker address of the staker/delegator
     * @param epoch in which staker withdrew
     * @param stakerId id of the staker whose corresponding sRZR is being withdrawn
     * @param amount amount of RZR being withdrawn
     * @param newStake current stake after withdraw process is completed
     * @param timestamp time at which the staker/delegator withdrew
     */
    event Withdrew(address staker, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp);

    /**
     * @dev Emitted when delegator delegates his RAZOR to a particular staker.
     * @param delegator address of the delegator
     * @param epoch in which delegator delegated
     * @param stakerId id of the staker whose corresponding sRZR is being delegated to
     * @param amount amount of RZR being delegated
     * @param newStake current stake after delegation by delegator
     * @param timestamp time at which the delegator delegated
     */
    event Delegated(
        address delegator,
        uint32 epoch,
        uint32 indexed stakerId,
        uint256 amount,
        uint256 newStake,
        uint256 totalSupply,
        uint256 timestamp
    );

    /**
     * @dev Emitted when the staker updates delegation status
     * @param delegationEnabled updated delegation status
     * @param staker address of the staker/delegator
     * @param stakerId the stakerId for which extension took place
     */
    event DelegationAcceptanceChanged(bool delegationEnabled, address staker, uint32 indexed stakerId);

    /**
     * @dev Emitted when the staker/delegator lock resets after successfully withdrawing
     * @param stakerId the stakerId for which the reset took place
     * @param staker address of the staker/delegator
     * @param epoch in which the reset took place
     */
    event ResetLock(uint32 indexed stakerId, address staker, uint32 epoch);

    /**
     * @dev Emitted when the staker/delegator extends unstake lock
     * @param stakerId the stakerId for which extension took place
     * @param staker address of the staker/delegator
     * @param epoch in which the extension took place
     */
    event ExtendUnstakeLock(uint32 indexed stakerId, address staker, uint32 epoch);

    /**
     * @dev Emitted when the staker changes commission
     * @param stakerId the staker that changes commission
     * @param commission updated commission
     */
    event CommissionChanged(uint32 indexed stakerId, uint8 commission);

    /**
     * @dev Emitted when the staker is slashed
     * @param bountyId unique id for each bounty to be claimed by bounty hunter
     * @param bountyHunter address who will claim the bounty caused by slash
     */
    event Slashed(uint32 bountyId, address bountyHunter);

    /** @param razorAddress The address of the Razor token ERC20 contract
     * @param rewardManagerAddress The address of the RewardManager contract
     * @param voteManagersAddress The address of the VoteManager contract
     */
    function initialize(
        address razorAddress,
        address rewardManagerAddress,
        address voteManagersAddress,
        address stakedTokenFactoryAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        razor = IERC20(razorAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        voteManager = IVoteManager(voteManagersAddress);
        stakedTokenFactory = IStakedTokenFactory(stakedTokenFactoryAddress);
    }

    /**
     * @notice stake during commit state only
     * we check epoch during every transaction to avoid withholding and rebroadcasting attacks
     * @dev An ERC20 token corresponding to each new staker is created called sRZRs.
     * For a new staker, amount of sRZR minted is equal to amount of RAZOR staked.
     * For adding stake, amount of sRZR minted depends on sRZR:(RAZOR staked) valuation.
     * @param epoch The Epoch value for which staker is requesting to stake
     * @param amount The amount in RZR
     */
    function stake(uint32 epoch, uint256 amount) external initialized checkEpoch(epoch) whenNotPaused {
        uint32 stakerId = stakerIds[msg.sender];
        uint256 totalSupply = 0;

        if (stakerId == 0) {
            require(amount >= minSafeRazor, "less than minimum safe Razor");
            numStakers = numStakers + (1);
            stakerId = numStakers;
            stakerIds[msg.sender] = stakerId;
            // slither-disable-next-line reentrancy-benign
            IStakedToken sToken = IStakedToken(stakedTokenFactory.createStakedToken(address(this), numStakers));
            stakers[numStakers] = Structs.Staker(false, false, 0, numStakers, 10000, msg.sender, address(sToken), epoch, 0, amount);
            _setupRole(STOKEN_ROLE, address(sToken));
            // Minting
            // Ignoring below line for testing as this is standard erc20 function
            require(sToken.mint(msg.sender, amount, amount), "tokens not minted"); // as 1RZR = 1 sRZR
            totalSupply = amount;
        } else {
            require(!stakers[stakerId].isSlashed, "staker is slashed");
            IStakedToken sToken = IStakedToken(stakers[stakerId].tokenAddress);
            totalSupply = sToken.totalSupply();
            uint256 toMint = _convertRZRtoSRZR(amount, stakers[stakerId].stake, totalSupply); // RZRs to sRZRs
            // WARNING: ALLOWING STAKE TO BE ADDED AFTER WITHDRAW/SLASH, consequences need an analysis
            // For more info, See issue -: https://github.com/razor-network/contracts/issues/112
            stakers[stakerId].stake = stakers[stakerId].stake + (amount);

            // Mint sToken as Amount * (totalSupplyOfToken/previousStake)
            // Ignoring below line for testing as this is standard erc20 function
            require(sToken.mint(msg.sender, toMint, amount), "tokens not minted");
            totalSupply = totalSupply + toMint;
        }
        // slither-disable-next-line reentrancy-events
        emit Staked(
            msg.sender,
            stakers[stakerId].tokenAddress,
            epoch,
            stakerId,
            amount,
            stakers[stakerId].stake,
            totalSupply,
            block.timestamp
        );
        // Ignoring below line for testing as this is standard erc20 function
        require(razor.transferFrom(msg.sender, address(this), amount), "razor transfer failed");
    }

    /**
     * @notice delegators can delegate their funds to staker if they do not have the adequate resources to start a node
     * @dev the delegator receives the sRZR for the stakerID to which he/she delegates.
     * The amount of sRZR minted depends on depends on sRZR:(RAZOR staked) valuation at the time of delegation
     * @param amount The amount in RZR
     * @param stakerId The Id of staker whom you want to delegate
     */
    function delegate(uint32 stakerId, uint256 amount) external initialized whenNotPaused {
        uint32 epoch = _getEpoch();
        require(stakers[stakerId].acceptDelegation, "Delegetion not accpected");
        require(_isStakerActive(stakerId, epoch), "Staker is inactive");
        require(!stakers[stakerId].isSlashed, "Staker is slashed");
        // Step 1 : Calculate Mintable amount
        IStakedToken sToken = IStakedToken(stakers[stakerId].tokenAddress);
        uint256 totalSupply = sToken.totalSupply();
        uint256 toMint = _convertRZRtoSRZR(amount, stakers[stakerId].stake, totalSupply);

        // Step 2: Increase given stakers stake by : Amount
        stakers[stakerId].stake = stakers[stakerId].stake + (amount);

        // Step 3:  Mint sToken as Amount * (totalSupplyOfToken/previousStake)
        // Ignoring below line for testing as this is standard erc20 function
        require(sToken.mint(msg.sender, toMint, amount), "tokens not minted");
        totalSupply = totalSupply + toMint;

        // slither-disable-next-line reentrancy-events
        emit Delegated(msg.sender, epoch, stakerId, amount, stakers[stakerId].stake, totalSupply, block.timestamp);

        // Step 4:  Razor Token Transfer : Amount
        // Ignoring below line for testing as this is standard erc20 function
        require(razor.transferFrom(msg.sender, address(this), amount), "RZR token transfer failed");
    }

    /** @notice staker/delegator must call unstake() to lock their sRZRs
     * and should wait for params.withdraw_after period
     * after which he/she can call initiateWithdraw() in withdrawInitiationPeriod.
     * If this period pass, lock expires and she will have to extendUnstakeLock() to able to initiateWithdraw again
     * @param stakerId The Id of staker associated with sRZR which user want to unstake
     * @param sAmount The Amount in sRZR
     */
    function unstake(uint32 stakerId, uint256 sAmount) external initialized whenNotPaused {
        require(sAmount > 0, "Non-Positive Amount");
        require(stakerId != 0, "staker.id = 0");
        require(stakers[stakerId].stake > 0, "Nonpositive stake");
        require(locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Unstake].amount == 0, "Existing Unstake Lock");

        uint32 epoch = _getEpoch();
        Structs.Staker storage staker = stakers[stakerId];
        IStakedToken sToken = IStakedToken(staker.tokenAddress);

        require(sToken.balanceOf(msg.sender) >= sAmount, "Invalid Amount");

        locks[msg.sender][staker.tokenAddress][LockType.Unstake] = Structs.Lock(
            sAmount,
            epoch + unstakeLockPeriod,
            sToken.getRZRDeposited(msg.sender, sAmount)
        );
        emit Unstaked(msg.sender, epoch, stakerId, sAmount, staker.stake, block.timestamp);
        // Ignoring below line for testing as this is standard erc20 function
        require(sToken.transferFrom(msg.sender, address(this), sAmount), "sToken transfer failed");
    }

    /** @notice staker/delegator call initiateWithdraw() to burn their locked sRZRs and lock their RAZORS
     * RAZORS is separated from the staker's stake but can be claimed only after withdrawLockPeriod passes
     * after which he/she can call unlockWithdraw() to claim the locked RAZORS.
     * @param stakerId The Id of staker associated with sRZR which user want to initiateWithdraw
     */
    function initiateWithdraw(uint32 stakerId) external initialized whenNotPaused {
        State currentState = _getState();
        require(currentState != State.Propose, "Unstake: NA Propose");
        require(currentState != State.Dispute, "Unstake: NA Dispute");

        require(stakerId != 0, "staker doesnt exist");
        uint32 epoch = _getEpoch();
        Structs.Staker storage staker = stakers[stakerId];
        Structs.Lock storage lock = locks[msg.sender][staker.tokenAddress][LockType.Unstake];
        require(lock.unlockAfter != 0, "Did not unstake");
        require(lock.unlockAfter <= epoch, "Withdraw epoch not reached");
        require(lock.unlockAfter + withdrawInitiationPeriod >= epoch, "Initiation Period Passed"); // Can Use ExtendLock

        IStakedToken sToken = IStakedToken(staker.tokenAddress);

        // slither-disable-next-line reentrancy-events,reentrancy-no-eth
        rewardManager.giveInactivityPenalties(epoch, stakerId);

        uint256 rAmount = _convertSRZRToRZR(lock.amount, staker.stake, sToken.totalSupply());
        staker.stake = staker.stake - rAmount;

        locks[msg.sender][staker.tokenAddress][LockType.Withdraw] = Structs.Lock(rAmount, epoch + withdrawLockPeriod, lock.initial);
        // Ignoring below line for testing as this is standard erc20 function
        require(sToken.burn(address(this), lock.amount), "Token burn Failed");
        //emit event here
        emit WithdrawInitiated(msg.sender, epoch, stakerId, rAmount, staker.stake, sToken.totalSupply(), block.timestamp);
    }

    /** @notice staker/delegator can claim their locked RAZORS.
     * if a staker is calling then no commission is calculated and can claim their funds
     * if a delegator is calling then commission is calculated on the RAZOR amount being withdrawn
     * and deducted from withdraw balance. the new balance is sent to the delegator and staker
     * receives the commission
     * @param stakerId The Id of staker associated with sRZR which user want to unlockWithdraw
     */
    function unlockWithdraw(uint32 stakerId) external initialized whenNotPaused {
        uint32 epoch = _getEpoch();
        require(stakerId != 0, "staker doesnt exist");

        Structs.Staker storage staker = stakers[stakerId];
        Structs.Lock storage lock = locks[msg.sender][staker.tokenAddress][LockType.Withdraw];
        require(lock.unlockAfter != 0, "Did not unstake");
        require(lock.unlockAfter <= epoch, "Withdraw epoch not reached");

        // Transfer commission in case of delegators
        // Check commission rate >0
        uint256 commission = 0;
        if (stakerIds[msg.sender] != stakerId && staker.commission > 0) {
            // Calculate Gain
            uint256 initial = lock.initial;
            if (lock.amount > initial) {
                uint256 gain = lock.amount - initial;
                uint8 commissionApplicable = staker.commission < maxCommission ? staker.commission : maxCommission;
                commission = (gain * commissionApplicable) / 100;
            }
        }

        uint256 withdrawAmount = lock.amount - commission;
        // Reset lock
        _resetLock(stakerId);

        emit Withdrew(msg.sender, epoch, stakerId, withdrawAmount, staker.stake, block.timestamp);
        // Ignoring below line for testing as this is standard erc20 function
        require(razor.transfer(staker._address, commission), "couldnt transfer");
        //Transfer Razor Back
        // Ignoring below line for testing as this is standard erc20 function
        require(razor.transfer(msg.sender, withdrawAmount), "couldnt transfer");
    }

    /// @inheritdoc IStakeManager
    function escape(address _address) external override initialized onlyRole(ESCAPE_HATCH_ROLE) whenPaused {
        if (escapeHatchEnabled) {
            // Ignoring below line for testing as this is standard erc20 function
            require(razor.transfer(_address, razor.balanceOf(address(this))), "razor transfer failed");
        } else {
            revert("escape hatch is disabled");
        }
    }

    /// @inheritdoc IStakeManager
    function srzrTransfer(
        address from,
        address to,
        uint256 amount,
        uint32 stakerId
    ) external override onlyRole(STOKEN_ROLE) {
        emit SrzrTransfer(from, to, amount, stakerId);
    }

    /**
     * @notice Used by staker to set delegation acceptance, its set as False by default
     */
    function setDelegationAcceptance(bool status) external {
        uint32 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        require(stakers[stakerId].commission != 0, "comission not set");
        stakers[stakerId].acceptDelegation = status;
        emit DelegationAcceptanceChanged(status, msg.sender, stakerId);
    }

    /**
     * @notice Used by staker to update commision for delegation
     */
    function updateCommission(uint8 commission) external {
        require(commission <= maxCommission, "Commission exceeds maxlimit");
        uint32 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        uint32 epoch = _getEpoch();
        if (stakers[stakerId].epochCommissionLastUpdated != 0) {
            require((stakers[stakerId].epochCommissionLastUpdated + epochLimitForUpdateCommission) <= epoch, "Invalid Epoch For Updation");
            require(commission <= (stakers[stakerId].commission + deltaCommission), "Invalid Commission Update");
        }
        stakers[stakerId].epochCommissionLastUpdated = epoch;
        stakers[stakerId].commission = commission;
        emit CommissionChanged(stakerId, commission);
    }

    /** @notice Used by anyone whose lock expired or who lost funds, and want to request initiateWithdraw
     * Here we have added penalty to avoid repeating front-run unstake/witndraw attack
     */
    function extendUnstakeLock(uint32 stakerId) external initialized whenNotPaused {
        // Lock should be expired if you want to extend
        uint32 epoch = _getEpoch();
        require(locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Unstake].amount != 0, "Unstake Lock doesnt exist");
        require(
            locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Unstake].unlockAfter + withdrawInitiationPeriod < epoch,
            "Initiation Period Not yet passed"
        );

        Structs.Staker storage staker = stakers[stakerId];
        Structs.Lock storage lock = locks[msg.sender][staker.tokenAddress][LockType.Unstake];
        IStakedToken sToken = IStakedToken(staker.tokenAddress);

        //Giving out the extendLock penalty
        uint256 penalty = (lock.amount * extendUnstakeLockPenalty) / 100;
        uint256 rPenalty = _convertSRZRToRZR(penalty, staker.stake, sToken.totalSupply());

        lock.amount = lock.amount - penalty;
        staker.stake = staker.stake - rPenalty;
        lock.unlockAfter = epoch;
        emit ExtendUnstakeLock(stakerId, msg.sender, _getEpoch());
        // Ignoring below line for testing as this is standard erc20 function
        require(sToken.burn(address(this), penalty), "Token burn Failed");
    }

    /// @inheritdoc IStakeManager
    function setStakerStake(
        uint32 _epoch,
        uint32 _id,
        Constants.StakeChanged reason,
        uint256 prevStake,
        uint256 _stake
    ) external override onlyRole(STAKE_MODIFIER_ROLE) {
        _setStakerStake(_epoch, _id, reason, prevStake, _stake);
    }

    /// @inheritdoc IStakeManager
    function slash(
        uint32 epoch,
        uint32 stakerId,
        address bountyHunter
    ) external override onlyRole(STAKE_MODIFIER_ROLE) {
        uint256 _stake = stakers[stakerId].stake;

        uint256 bounty;
        uint256 amountToBeBurned;
        uint256 amountToBeKept;

        // Block Scoping
        // Done for stack too deep issue
        // https://soliditydeveloper.com/stacktoodeep
        {
            (uint32 bountyNum, uint32 burnSlashNum, uint32 keepSlashNum) = (slashNums.bounty, slashNums.burn, slashNums.keep);
            bounty = (_stake * bountyNum) / BASE_DENOMINATOR;
            amountToBeBurned = (_stake * burnSlashNum) / BASE_DENOMINATOR;
            amountToBeKept = (_stake * keepSlashNum) / BASE_DENOMINATOR;
        }

        uint256 slashPenaltyAmount = bounty + amountToBeBurned + amountToBeKept;
        _stake = _stake - slashPenaltyAmount;
        stakers[stakerId].isSlashed = true;
        _setStakerStake(epoch, stakerId, StakeChanged.Slashed, _stake + slashPenaltyAmount, _stake);

        if (bounty == 0) return;
        bountyCounter = bountyCounter + 1;
        bountyLocks[bountyCounter] = Structs.BountyLock(epoch + withdrawLockPeriod, bountyHunter, bounty);

        emit Slashed(bountyCounter, bountyHunter);
        //please note that since slashing is a critical part of consensus algorithm,
        //the following transfers are not `reuquire`d. even if the transfers fail, the slashing
        //tx should complete.
        // Ignoring below line for testing as this is standard erc20 function
        // slither-disable-next-line unchecked-transfer
        razor.transfer(BURN_ADDRESS, amountToBeBurned);
    }

    /** @notice Allows bountyHunter to redeem their bounty once its locking period is over
     * @param bountyId The ID of the bounty
     */
    function redeemBounty(uint32 bountyId) external {
        uint32 epoch = _getEpoch();
        uint256 bounty = bountyLocks[bountyId].amount;

        require(msg.sender == bountyLocks[bountyId].bountyHunter, "Incorrect Caller");
        require(bountyLocks[bountyId].redeemAfter <= epoch, "Redeem epoch not reached");
        delete bountyLocks[bountyId];
        // Ignoring below line for testing as this is standard erc20 function
        require(razor.transfer(msg.sender, bounty), "couldnt transfer");
    }

    /// @inheritdoc IStakeManager
    function setStakerEpochFirstStakedOrLastPenalized(uint32 _epoch, uint32 _id) external override onlyRole(STAKE_MODIFIER_ROLE) {
        stakers[_id].epochFirstStakedOrLastPenalized = _epoch;
    }

    /// @inheritdoc IStakeManager
    function setStakerAge(
        uint32 _epoch,
        uint32 _id,
        uint32 _age,
        Constants.AgeChanged reason
    ) external override onlyRole(STAKE_MODIFIER_ROLE) {
        stakers[_id].age = _age;
        emit AgeChange(_epoch, _id, _age, reason, block.timestamp);
    }

    /// @inheritdoc IStakeManager
    function getStakerId(address _address) external view override returns (uint32) {
        return (stakerIds[_address]);
    }

    /// @inheritdoc IStakeManager
    function getStaker(uint32 _id) external view override returns (Structs.Staker memory staker) {
        return (stakers[_id]);
    }

    /// @inheritdoc IStakeManager
    function getNumStakers() external view override returns (uint32) {
        return (numStakers);
    }

    /**
     * @return age of staker
     */
    function getAge(uint32 stakerId) external view returns (uint32) {
        return stakers[stakerId].age;
    }

    /// @inheritdoc IStakeManager
    function getInfluence(uint32 stakerId) external view override returns (uint256) {
        return _getMaturity(stakerId) * stakers[stakerId].stake;
    }

    /// @inheritdoc IStakeManager
    function getStake(uint32 stakerId) external view override returns (uint256) {
        return stakers[stakerId].stake;
    }

    /// @inheritdoc IStakeManager
    function getEpochFirstStakedOrLastPenalized(uint32 stakerId) external view override returns (uint32) {
        return stakers[stakerId].epochFirstStakedOrLastPenalized;
    }

    /// @inheritdoc IStakeManager
    function maturitiesLength() external view override returns (uint32) {
        return uint32(maturities.length);
    }

    /**
     * @notice Internal function for setting stake of the staker
     * @param _id of the staker
     * @param _stake the amount of Razor tokens staked
     */
    function _setStakerStake(
        uint32 _epoch,
        uint32 _id,
        Constants.StakeChanged reason,
        uint256 _prevStake,
        uint256 _stake
    ) internal {
        stakers[_id].stake = _stake;
        emit StakeChange(_epoch, _id, reason, _prevStake, _stake, block.timestamp);
    }

    /**
     * @return isStakerActive : Activity < Grace
     */
    function _isStakerActive(uint32 stakerId, uint32 epoch) internal view returns (bool) {
        uint32 epochLastRevealed = voteManager.getEpochLastRevealed(stakerId);
        return ((epoch - epochLastRevealed) <= gracePeriod);
    }

    /**
     * @return maturity of staker
     */
    function _getMaturity(uint32 stakerId) internal view returns (uint256) {
        uint256 index = stakers[stakerId].age / 10000;

        return maturities[index];
    }

    /** @notice 1 sRZR = ? RZR
     * Used to calcualte sRZR into RZR value
     * @param _sAmount The Amount in sRZR
     * @param _currentStake The cuurent stake of associated staker
     */
    function _convertSRZRToRZR(
        uint256 _sAmount,
        uint256 _currentStake,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        return ((_sAmount * _currentStake) / _totalSupply);
    }

    /** @notice 1 RZR = ? sRZR
     * Used to calcualte RZR into sRZR value
     * @param _amount The Amount in RZR
     * @param _currentStake The cuurent stake of associated staker
     * @param _totalSupply The totalSupply of sRZR
     */
    function _convertRZRtoSRZR(
        uint256 _amount,
        uint256 _currentStake,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        // Follwoing require is included to cover case where
        // CurrentStake Becomes zero beacues of penalties,
        //this is likely scenario when staker stakes is slashed to 0 for invalid block.
        require(_currentStake != 0, "Stakers Stake is 0");
        return ((_amount * _totalSupply) / _currentStake);
    }

    /** @notice a private function being called when the staker
     * successfully withdraws his funds from the network. This is
     * being done so that the staker can unstake and withdraw his remaining funds
     * incase of partial unstake
     * @param stakerId of the staker
     */
    function _resetLock(uint32 stakerId) private {
        locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Unstake] = Structs.Lock({amount: 0, unlockAfter: 0, initial: 0});
        locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Withdraw] = Structs.Lock({amount: 0, unlockAfter: 0, initial: 0});
        emit ResetLock(stakerId, msg.sender, _getEpoch());
    }
}
