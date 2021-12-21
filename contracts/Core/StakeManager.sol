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


/// @title StakeManager
/// @notice StakeManager handles stake, unstake, withdraw, reward, functions
/// for stakers

contract StakeManager is Initializable, StakeStorage, StateManager, Pause, StakeManagerParams, IStakeManager {
    IRewardManager public rewardManager;
    IVoteManager public voteManager;
    IERC20 public razor;
    IStakedTokenFactory public stakedTokenFactory;

    event SrzrTransfer(address from, address to, uint256 amount, uint32 stakerId);

    event StakeChange(
        uint32 epoch,
        uint32 indexed stakerId,
        Constants.StakeChanged reason,
        uint256 prevStake,
        uint256 newStake,
        uint256 timestamp
    );

    event AgeChange(uint32 epoch, uint32 indexed stakerId, uint32 newAge, Constants.AgeChanged reason, uint256 timestamp);

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

    event Unstaked(address staker, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp);

    event WithdrawInitiated(
        address staker,
        uint32 epoch,
        uint32 indexed stakerId,
        uint256 amount,
        uint256 newStake,
        uint256 totalSupply,
        uint256 timestamp
    );

    event Withdrew(address staker, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp);

    event Delegated(
        address delegator,
        uint32 epoch,
        uint32 indexed stakerId,
        uint256 amount,
        uint256 newStake,
        uint256 totalSupply,
        uint256 timestamp
    );

    event DelegationAcceptanceChanged(bool delegationEnabled, address staker, uint32 indexed stakerId);

    event ResetLock(uint32 indexed stakerId, address staker, uint32 epoch);

    event ExtendUnstakeLock(uint32 indexed stakerId, address staker, uint32 epoch);

    event CommissionChanged(uint32 indexed stakerId, uint8 commision);

    /// @param razorAddress The address of the Razor token ERC20 contract
    /// @param rewardManagerAddress The address of the RewardManager contract
    /// @param voteManagersAddress The address of the VoteManager contract
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

    /// @notice stake during commit state only
    /// we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    /// @param epoch The Epoch value for which staker is requesting to stake
    /// @param amount The amount in RZR
    function stake(uint32 epoch, uint256 amount) external initialized checkEpoch(epoch, epochLength) whenNotPaused {
        uint32 stakerId = stakerIds[msg.sender];
        uint256 totalSupply = 0;

        if (stakerId == 0) {
            require(amount >= minStake, "Amount below Minstake");
            numStakers = numStakers + (1);
            stakerId = numStakers;
            stakerIds[msg.sender] = stakerId;
            // slither-disable-next-line reentrancy-benign
            IStakedToken sToken = IStakedToken(stakedTokenFactory.createStakedToken(address(this), numStakers));
            stakers[numStakers] = Structs.Staker(false, false, 0, numStakers, 10000, msg.sender, address(sToken), epoch, 0, amount);
            _setupRole(STOKEN_ROLE, address(sToken));
            // Minting
            require(sToken.mint(msg.sender, amount, amount), "tokens not minted"); // as 1RZR = 1 sRZR
            totalSupply = amount;
        } else {
            require(amount + stakers[stakerId].stake >= minStake, "amount + stake below min Stake");
            require(!stakers[stakerId].isSlashed, "staker is slashed");
            IStakedToken sToken = IStakedToken(stakers[stakerId].tokenAddress);
            totalSupply = sToken.totalSupply();
            uint256 toMint = _convertRZRtoSRZR(amount, stakers[stakerId].stake, totalSupply); // RZRs to sRZRs
            // WARNING: ALLOWING STAKE TO BE ADDED AFTER WITHDRAW/SLASH, consequences need an analysis
            // For more info, See issue -: https://github.com/razor-network/contracts/issues/112
            stakers[stakerId].stake = stakers[stakerId].stake + (amount);

            // Mint sToken as Amount * (totalSupplyOfToken/previousStake)
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
        require(razor.transferFrom(msg.sender, address(this), amount), "razor transfer failed");
    }

    /// @notice Delegation
    /// @param amount The amount in RZR
    /// @param stakerId The Id of staker whom you want to delegate
    function delegate(uint32 stakerId, uint256 amount) external initialized whenNotPaused {
        uint32 epoch = _getEpoch(epochLength);
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
        require(sToken.mint(msg.sender, toMint, amount), "tokens not minted");
        totalSupply = totalSupply + toMint;

        // slither-disable-next-line reentrancy-events
        emit Delegated(msg.sender, epoch, stakerId, amount, stakers[stakerId].stake, totalSupply, block.timestamp);

        // Step 4:  Razor Token Transfer : Amount
        require(razor.transferFrom(msg.sender, address(this), amount), "RZR token transfer failed");
    }

    /// @notice staker/delegator must call unstake() to lock their sRZRs
    // and should wait for params.withdraw_after period
    // after which she can call withdraw() in withdrawReleasePeriod.
    // If this period pass, lock expires and she will have to extendLock() to able to withdraw again
    /// @param stakerId The Id of staker associated with sRZR which user want to unstake
    /// @param sAmount The Amount in sRZR
    function unstake(uint32 stakerId, uint256 sAmount) external initialized whenNotPaused {
        require(sAmount > 0, "Non-Positive Amount");
        require(stakerId != 0, "staker.id = 0");
        require(stakers[stakerId].stake > 0, "Nonpositive stake");
        require(locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Unstake].amount == 0, "Existing Unstake Lock");

        uint32 epoch = _getEpoch(epochLength);
        Structs.Staker storage staker = stakers[stakerId];
        IStakedToken sToken = IStakedToken(staker.tokenAddress);

        require(sToken.balanceOf(msg.sender) >= sAmount, "Invalid Amount");

        locks[msg.sender][staker.tokenAddress][LockType.Unstake] = Structs.Lock(sAmount, 0, epoch + unstakeLockPeriod, sToken.getRZRDeposited(msg.sender, sAmount));
        emit Unstaked(msg.sender, epoch, stakerId, sAmount, staker.stake, block.timestamp);
        require(sToken.transferFrom(msg.sender, address(this), sAmount), "sToken transfer failed");
    }

    function initiateWithdraw(uint32 stakerId) external initialized whenNotPaused {
        State currentState = _getState(epochLength);
        require(currentState != State.Propose, "Unstake: NA Propose");
        require(currentState != State.Dispute, "Unstake: NA Dispute");

        require(stakerId != 0, "staker doesnt exist");
        uint32 epoch = _getEpoch(epochLength);
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

        // Transfer commission in case of delegators
        // Check commission rate >0
        uint256 commission = 0;
        if (stakerIds[msg.sender] != stakerId && staker.commission > 0) {
            // Calculate Gain
            uint256 initial = lock.initial;
            if (rAmount > initial) {
                uint256 gain = rAmount - initial;
                uint8 commissionApplicable = staker.commission < maxCommission ? staker.commission : maxCommission;
                commission = (gain * commissionApplicable) / 100;
            }
        }

        locks[msg.sender][staker.tokenAddress][LockType.Withdraw] = Structs.Lock(rAmount, commission, epoch + withdrawLockPeriod, 0);
        require(sToken.burn(address(this), lock.amount), "Token burn Failed");
        //emit event here
        emit WithdrawInitiated(msg.sender, epoch, stakerId, rAmount, staker.stake, sToken.totalSupply(), block.timestamp);
    }

    /// @notice staker/delegator can withdraw their funds after calling unstake and withdrawAfter period.
    // To be eligible for withdraw it must be called with in withDrawReleasePeriod(),
    //this is added to avoid front-run unstake/withdraw.
    // For Staker, To be eligible for withdraw she must not participate in lock duration,
    //this is added to avoid hit and run dispute attack.
    // For Delegator, there is no such restriction
    // Both Staker and Delegator should have their locked funds(sRZR) present in
    //their wallet at time of if not withdraw reverts
    // And they have to use extendLock()
    /// @param stakerId The Id of staker associated with sRZR which user want to withdraw
    function unlockWithdraw(uint32 stakerId) external initialized whenNotPaused {
        uint32 epoch = _getEpoch(epochLength);
        require(stakerId != 0, "staker doesnt exist");

        Structs.Staker storage staker = stakers[stakerId];
        Structs.Lock storage lock = locks[msg.sender][staker.tokenAddress][LockType.Withdraw];
        require(lock.unlockAfter != 0, "Did not unstake");
        require(lock.unlockAfter <= epoch, "Withdraw epoch not reached");

        uint256 commission = lock.commission;
        uint256 withdrawAmount = lock.amount - commission;
        // Reset lock
        _resetLock(stakerId);

        emit Withdrew(msg.sender, epoch, stakerId, withdrawAmount, staker.stake, block.timestamp);
        require(razor.transfer(staker._address, commission), "couldnt transfer");
        //Transfer Razor Back
        require(razor.transfer(msg.sender, withdrawAmount), "couldnt transfer");
    }

    /// @notice remove all funds in case of emergency
    function escape(address _address) external override initialized onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        if (escapeHatchEnabled) {
            require(razor.transfer(_address, razor.balanceOf(address(this))), "razor transfer failed");
        } else {
            revert("escape hatch is disabled");
        }
    }

    function srzrTransfer(
        address from,
        address to,
        uint256 amount,
        uint32 stakerId
    ) external override onlyRole(STOKEN_ROLE) {
        emit SrzrTransfer(from, to, amount, stakerId);
    }

    /// @notice Used by staker to set delegation acceptance, its set as False by default
    function setDelegationAcceptance(bool status) external {
        uint32 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        require(stakers[stakerId].commission != 0, "comission not set");
        stakers[stakerId].acceptDelegation = status;
        emit DelegationAcceptanceChanged(status, msg.sender, stakerId);
    }

    /// @notice Used by staker to update commision for delegation
    function updateCommission(uint8 commission) external {
        require(commission <= maxCommission, "Commission exceeds maxlimit");
        uint32 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        uint32 epoch = _getEpoch(epochLength);
        if (stakers[stakerId].epochCommissionLastUpdated != 0) {
            require((stakers[stakerId].epochCommissionLastUpdated + epochLimitForUpdateCommission) <= epoch, "Invalid Epoch For Updation");
            require(commission <= (stakers[stakerId].commission + deltaCommission), "Invalid Commission Update");
        }
        stakers[stakerId].epochCommissionLastUpdated = epoch;
        stakers[stakerId].commission = commission;
        emit CommissionChanged(stakerId, commission);
    }

    /// @notice Used by anyone whose lock expired or who lost funds, and want to request withdraw
    // Here we have added penalty to avoid repeating front-run unstake/witndraw attack
    function extendUnstakeLock(uint32 stakerId) external initialized whenNotPaused {
        // Lock should be expired if you want to extend
        uint32 epoch = _getEpoch(epochLength);
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
        emit ExtendUnstakeLock(stakerId, msg.sender, _getEpoch(epochLength));
        require(sToken.burn(address(this), penalty), "Token burn Failed");
    }

    /// @notice External function for setting stake of the staker
    /// Used by RewardManager
    /// @param _id of the staker
    /// @param _stake the amount of Razor tokens staked
    function setStakerStake(
        uint32 _epoch,
        uint32 _id,
        Constants.StakeChanged reason,
        uint256 prevStake,
        uint256 _stake
    ) external override onlyRole(STAKE_MODIFIER_ROLE) {
        _setStakerStake(_epoch, _id, reason, prevStake, _stake);
    }

    /// @notice The function is used by the Votemanager reveal function and BlockManager FinalizeDispute
    /// to penalise the staker who lost his secret and make his stake less by "slashPenaltyAmount" and
    /// transfer to bounty hunter half the "slashPenaltyAmount" of the staker
    /// @param stakerId The ID of the staker who is penalised
    /// @param bountyHunter The address of the bounty hunter
    function slash(
        uint32 epoch,
        uint32 stakerId,
        address bountyHunter
    ) external override onlyRole(STAKE_MODIFIER_ROLE) returns (uint32) {
        uint256 _stake = stakers[stakerId].stake;

        uint256 bounty;
        uint256 amountToBeBurned;
        uint256 amountToBeKept;

        // Block Scoping
        // Done for stack too deep issue
        // https://soliditydeveloper.com/stacktoodeep
        {
            (uint16 bountyNum, uint16 burnSlashNum, uint16 keepSlashNum) = (slashNums.bounty, slashNums.burn, slashNums.keep);
            bounty = (_stake * bountyNum) / BASE_DENOMINATOR;
            amountToBeBurned = (_stake * burnSlashNum) / BASE_DENOMINATOR;
            amountToBeKept = (_stake * keepSlashNum) / BASE_DENOMINATOR;
        }

        uint256 slashPenaltyAmount = bounty + amountToBeBurned + amountToBeKept;
        _stake = _stake - slashPenaltyAmount;
        stakers[stakerId].isSlashed = true;
        _setStakerStake(epoch, stakerId, StakeChanged.Slashed, _stake + slashPenaltyAmount, _stake);

        if (bounty == 0) return 0;
        bountyCounter = bountyCounter + 1;
        bountyLocks[bountyCounter] = Structs.BountyLock(epoch + withdrawLockPeriod, bountyHunter, bounty);

        //please note that since slashing is a critical part of consensus algorithm,
        //the following transfers are not `reuquire`d. even if the transfers fail, the slashing
        //tx should complete.
        // slither-disable-next-line unchecked-transfer
        razor.transfer(BURN_ADDRESS, amountToBeBurned);

        return bountyCounter;
    }

    /// @notice Allows bountyHunter to redeem their bounty once its locking period is over
    /// @param bountyId The ID of the bounty
    function redeemBounty(uint32 bountyId) external {
        uint32 epoch = _getEpoch(epochLength);
        uint256 bounty = bountyLocks[bountyId].amount;

        require(msg.sender == bountyLocks[bountyId].bountyHunter, "Incorrect Caller");
        require(bountyLocks[bountyId].redeemAfter <= epoch, "Redeem epoch not reached");
        delete bountyLocks[bountyId];
        require(razor.transfer(msg.sender, bounty), "couldnt transfer");
    }

    /// @notice External function for setting epochLastPenalized of the staker
    /// Used by RewardManager
    /// @param _id of the staker
    function setStakerEpochFirstStakedOrLastPenalized(uint32 _epoch, uint32 _id) external override onlyRole(STAKE_MODIFIER_ROLE) {
        stakers[_id].epochFirstStakedOrLastPenalized = _epoch;
    }

    function setStakerAge(
        uint32 _epoch,
        uint32 _id,
        uint32 _age,
        Constants.AgeChanged reason
    ) external override onlyRole(STAKE_MODIFIER_ROLE) {
        stakers[_id].age = _age;
        emit AgeChange(_epoch, _id, _age, reason, block.timestamp);
    }

    /// @param _address Address of the staker
    /// @return The staker ID
    function getStakerId(address _address) external view override returns (uint32) {
        return (stakerIds[_address]);
    }

    /// @param _id The staker ID
    /// @return staker The Struct of staker information
    function getStaker(uint32 _id) external view override returns (Structs.Staker memory staker) {
        return (stakers[_id]);
    }

    /// @return The number of stakers in the razor network
    function getNumStakers() external view override returns (uint32) {
        return (numStakers);
    }

    /// @return age of staker
    function getAge(uint32 stakerId) external view returns (uint32) {
        return stakers[stakerId].age;
    }

    /// @return influence of staker
    function getInfluence(uint32 stakerId) external view override returns (uint256) {
        return _getMaturity(stakerId) * stakers[stakerId].stake;
    }

    /// @return stake of staker
    function getStake(uint32 stakerId) external view override returns (uint256) {
        return stakers[stakerId].stake;
    }

    function getEpochFirstStakedOrLastPenalized(uint32 stakerId) external view override returns (uint32) {
        return stakers[stakerId].epochFirstStakedOrLastPenalized;
    }

    /// @notice Internal function for setting stake of the staker
    /// @param _id of the staker
    /// @param _stake the amount of Razor tokens staked
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

    /// @return isStakerActive : Activity < Grace
    function _isStakerActive(uint32 stakerId, uint32 epoch) internal view returns (bool) {
        uint32 epochLastRevealed = voteManager.getEpochLastRevealed(stakerId);
        return ((epoch - epochLastRevealed) <= gracePeriod);
    }

    /// @return maturity of staker
    function _getMaturity(uint32 stakerId) internal view returns (uint256) {
        uint256 index = stakers[stakerId].age / 10000;

        return maturities[index];
    }

    /// @notice 1 sRZR = ? RZR
    // Used to calcualte sRZR into RZR value
    /// @param _sAmount The Amount in sRZR
    /// @param _currentStake The cuurent stake of associated staker
    function _convertSRZRToRZR(
        uint256 _sAmount,
        uint256 _currentStake,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        return ((_sAmount * _currentStake) / _totalSupply);
    }

    /// @notice 1 RZR = ? sRZR
    // Used to calcualte RZR into sRZR value
    /// @param _amount The Amount in RZR
    /// @param _currentStake The cuurent stake of associated staker
    /// @param _totalSupply The totalSupply of sRZR
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

    function _resetLock(uint32 stakerId) private {
        locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Unstake] = Structs.Lock({amount: 0, commission: 0, unlockAfter: 0, initial: 0});
        locks[msg.sender][stakers[stakerId].tokenAddress][LockType.Withdraw] = Structs.Lock({amount: 0, commission: 0, unlockAfter: 0, initial: 0});
        emit ResetLock(stakerId, msg.sender, _getEpoch(epochLength));
    }
}
