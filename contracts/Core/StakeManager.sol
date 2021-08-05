// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./interface/IRewardManager.sol";
import "./interface/IVoteManager.sol";
import "./storage/StakeStorage.sol";
import "../Initializable.sol";
import "../RAZOR.sol";
import "./ACL.sol";
import "../Pause.sol";
import "../StakedToken.sol";

/// @title StakeManager
/// @notice StakeManager handles stake, unstake, withdraw, reward, functions
/// for stakers

contract StakeManager is Initializable, ACL, StakeStorage, Pause {
    IParameters public parameters;
    IRewardManager public rewardManager;
    RAZOR public razor;
    IVoteManager public voteManager;
    //[math.floor(math.sqrt(i*10000)/2) for i in range(1,100)]
    uint16[] public maturities = [
        50,
        70,
        86,
        100,
        111,
        122,
        132,
        141,
        150,
        158,
        165,
        173,
        180,
        187,
        193,
        200,
        206,
        212,
        217,
        223,
        229,
        234,
        239,
        244,
        250,
        254,
        259,
        264,
        269,
        273,
        278,
        282,
        287,
        291,
        295,
        300,
        304,
        308,
        312,
        316,
        320,
        324,
        327,
        331,
        335,
        339,
        342,
        346,
        350,
        353,
        357,
        360,
        364,
        367,
        370,
        374,
        377,
        380,
        384,
        387,
        390,
        393,
        396,
        400,
        403,
        406,
        409,
        412,
        415,
        418,
        421,
        424,
        427,
        430,
        433,
        435,
        438,
        441,
        444,
        447,
        450,
        452,
        455,
        458,
        460,
        463,
        466,
        469,
        471,
        474,
        476,
        479,
        482,
        484,
        487,
        489,
        492,
        494,
        497
    ];
    event StakeChange(uint32 indexed stakerId, uint256 previousStake, uint256 newStake, string reason, uint32 epoch, uint256 timestamp);

    event AgeChange(uint32 indexed stakerId, uint256 previousAge, uint256 newAge, uint32 epoch, uint256 timestamp);

    event Staked(uint32 epoch, uint32 indexed stakerId, uint256 previousStake, uint256 newStake, uint256 timestamp);

    event Unstaked(uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp, address unstaker);

    event Withdrew(uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp, address withdrawer);

    event Delegated(uint32 epoch, uint32 indexed stakerId, address delegator, uint256 previousStake, uint256 newStake, uint256 timestamp);

    event DelegationAcceptanceChanged(uint32 indexed stakerId, address staker, bool delegationEnabled);

    modifier checkEpoch(uint32 epoch) {
        require(epoch == parameters.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState(uint8 state) {
        require(state == parameters.getState(), "incorrect state");
        _;
    }

    /// @param razorAddress The address of the Razor token ERC20 contract
    /// @param rewardManagerAddress The address of the RewardManager contract
    /// @param voteManagersAddress The address of the VoteManager contract
    /// @param parametersAddress The address of the StateManager contract
    function initialize(
        address razorAddress,
        address rewardManagerAddress,
        address voteManagersAddress,
        address parametersAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        razor = RAZOR(razorAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        voteManager = IVoteManager(voteManagersAddress);
        parameters = IParameters(parametersAddress);
    }

    /// @notice stake during commit state only
    /// we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    /// @param epoch The Epoch value for which staker is requesting to stake
    /// @param amount The amount in RZR
    function stake(uint32 epoch, uint256 amount) external initialized checkEpoch(epoch) checkState(parameters.commit()) whenNotPaused {
        require(amount >= parameters.minStake(), "staked amount is less than minimum stake required");
        require(razor.transferFrom(msg.sender, address(this), amount), "sch transfer failed");
        uint32 stakerId = stakerIds[msg.sender];
        uint256 previousStake = stakers[stakerId].stake;
        if (stakerId == 0) {
            numStakers = numStakers + (1);
            StakedToken sToken = new StakedToken();
            stakers[numStakers] = Structs.Staker(numStakers, msg.sender, amount, 10000, epoch, false, 0, address(sToken));
            // Minting
            sToken.mint(msg.sender, amount); // as 1RZR = 1 sRZR
            stakerId = numStakers;
            stakerIds[msg.sender] = stakerId;
        } else {
            StakedToken sToken = StakedToken(stakers[stakerId].tokenAddress);
            uint256 totalSupply = sToken.totalSupply();
            uint256 toMint = _convertRZRtoSRZR(amount, stakers[stakerId].stake, totalSupply); // RZRs to sRZRs

            // WARNING: ALLOWING STAKE TO BE ADDED AFTER WITHDRAW/SLASH, consequences need an analysis
            // For more info, See issue -: https://github.com/razor-network/contracts/issues/112
            stakers[stakerId].stake = stakers[stakerId].stake + (amount);
            // Mint sToken as Amount * (totalSupplyOfToken/previousStake)
            sToken.mint(msg.sender, toMint);
        }

        emit Staked(epoch, stakerId, previousStake, stakers[stakerId].stake, block.timestamp);
    }

    /// @notice Delegation
    /// @param epoch The Epoch value for which staker is requesting to stake
    /// @param amount The amount in RZR
    /// @param stakerId The Id of staker whom you want to delegate
    function delegate(
        uint32 epoch,
        uint256 amount,
        uint32 stakerId
    ) external initialized checkEpoch(epoch) checkState(parameters.commit()) whenNotPaused {
        require(stakers[stakerId].acceptDelegation, "Delegetion not accpected");
        require(stakers[stakerId].tokenAddress != address(0x0000000000000000000000000000000000000000), "Staker has not staked yet");
        // Step 1:  Razor Token Transfer : Amount
        require(razor.transferFrom(msg.sender, address(this), amount), "RZR token transfer failed");

        // Step 2 : Calculate Mintable amount
        StakedToken sToken = StakedToken(stakers[stakerId].tokenAddress);
        uint256 totalSupply = sToken.totalSupply();
        uint256 toMint = _convertRZRtoSRZR(amount, stakers[stakerId].stake, totalSupply);

        // Step 3: Increase given stakers stake by : Amount
        uint256 previousStake = stakers[stakerId].stake;
        stakers[stakerId].stake = stakers[stakerId].stake + (amount);

        // Step 4:  Mint sToken as Amount * (totalSupplyOfToken/previousStake)
        sToken.mint(msg.sender, toMint);

        emit Delegated(epoch, stakerId, msg.sender, previousStake, stakers[stakerId].stake, block.timestamp);
    }

    /// @notice staker/delegator must call unstake() to lock their sRZRs
    // and should wait for params.withdraw_after period
    // after which she can call withdraw() in withdrawReleasePeriod.
    // If this period pass, lock expires and she will have to resetLock() to able to withdraw again
    /// @param epoch The Epoch value for which staker is requesting to unstake
    /// @param stakerId The Id of staker associated with sRZR which user want to unstake
    /// @param sAmount The Amount in sRZR
    function unstake(
        uint32 epoch,
        uint32 stakerId,
        uint256 sAmount
    ) external initialized checkEpoch(epoch) checkState(parameters.commit()) whenNotPaused {
        Structs.Staker storage staker = stakers[stakerId];
        require(staker.id != 0, "staker.id = 0");
        require(staker.stake > 0, "Nonpositive stake");
        require(locks[msg.sender][staker.tokenAddress].amount == 0, "Existing Lock");
        require(sAmount > 0, "Non-Positive Amount");
        StakedToken sToken = StakedToken(staker.tokenAddress);
        require(sToken.balanceOf(msg.sender) >= sAmount, "Invalid Amount");
        locks[msg.sender][staker.tokenAddress] = Structs.Lock(sAmount, epoch + (parameters.withdrawLockPeriod()));
        emit Unstaked(epoch, stakerId, sAmount, staker.stake, block.timestamp, msg.sender);
        //emit event here
    }

    /// @notice staker/delegator can withdraw their funds after calling unstake and withdrawAfter period.
    // To be eligible for withdraw it must be called with in withDrawReleasePeriod(),
    //this is added to avoid front-run unstake/withdraw.
    // For Staker, To be eligible for withdraw she must not participate in lock duration,
    //this is added to avoid hit and run dispute attack.
    // For Delegator, there is no such restriction
    // Both Staker and Delegator should have their locked funds(sRZR) present in
    //their wallet at time of if not withdraw reverts
    // And they have to use resetLock()
    /// @param epoch The Epoch value for which staker is requesting to unstake
    /// @param stakerId The Id of staker associated with sRZR which user want to withdraw
    function withdraw(uint32 epoch, uint32 stakerId) external initialized checkEpoch(epoch) checkState(parameters.commit()) whenNotPaused {
        Structs.Staker storage staker = stakers[stakerId];
        Structs.Lock storage lock = locks[msg.sender][staker.tokenAddress];

        require(staker.id != 0, "staker doesnt exist");
        require(lock.withdrawAfter != 0, "Did not unstake");
        require(lock.withdrawAfter <= epoch, "Withdraw epoch not reached");
        require(lock.withdrawAfter + parameters.withdrawReleasePeriod() >= epoch, "Release Period Passed"); // Can Use ResetLock
        require(staker.stake > 0, "Nonpositive Stake");
        if (stakerIds[msg.sender] == stakerId) {
            // Staker Must not particiapte in withdraw lock period, To counter Hit and Run Attacks
            require(
                (lock.withdrawAfter - parameters.withdrawLockPeriod()) >= voteManager.getEpochLastCommitted(stakerId),
                "Participated in Lock Period"
            );
            // require((voteManager.getCommitment(stakerId)).epoch != epoch, "Already commited");
        }

        StakedToken sToken = StakedToken(staker.tokenAddress);
        require(sToken.balanceOf(msg.sender) >= lock.amount, "locked amount lost"); // Can Use ResetLock

        uint256 rAmount = _convertSRZRToRZR(lock.amount, staker.stake, sToken.totalSupply());
        require(sToken.burn(msg.sender, lock.amount), "Token burn Failed");
        staker.stake = staker.stake - rAmount;

        // Function to Reset the lock
        _resetLock(stakerId);

        // Transfer commission in case of delegators
        // Check commission rate >0
        if (stakerIds[msg.sender] != stakerId && staker.commission > 0) {
            uint256 commission = (rAmount * staker.commission) / 100;
            require(razor.transfer(staker._address, commission), "couldnt transfer");
            rAmount = rAmount - commission;
        }

        //Transfer stake
        require(razor.transfer(msg.sender, rAmount), "couldnt transfer");

        emit Withdrew(epoch, stakerId, rAmount, staker.stake, block.timestamp, msg.sender);
    }

    /// @notice remove all funds in case of emergency
    function escape(address _address) external initialized onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        if (parameters.escapeHatchEnabled()) {
            razor.transfer(_address, razor.balanceOf(address(this)));
        } else {
            revert("escape hatch is disabled");
        }
    }

    /// @notice Used by staker to set delegation acceptance, its set as False by default
    function setDelegationAcceptance(bool status) external {
        uint32 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        stakers[stakerId].acceptDelegation = status;
        emit DelegationAcceptanceChanged(stakerId, msg.sender, status);
    }

    /// @notice Used by staker to set commision for delegation
    function setCommission(uint256 commission) external {
        uint32 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        require(stakers[stakerId].acceptDelegation, "Delegetion not accpected");
        require(stakers[stakerId].commission == 0, "Commission already intilised");
        stakers[stakerId].commission = commission;
    }

    /// @notice As of now we only allow decresing commision, as with increase staker would have unfair adv
    function decreaseCommission(uint256 commission) external {
        uint32 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        require(commission != 0, "Invalid Commission Update");
        require(stakers[stakerId].commission > commission, "Invalid Commission Update");
        stakers[stakerId].commission = commission;
    }

    /// @notice Used by anyone whose lock expired or who lost funds, and want to request withdraw
    // Here we have added penalty to avoid repeating front-run unstake/witndraw attack
    function resetLock(uint32 stakerId) external initialized whenNotPaused {
        // Lock should be expired if you want to reset
        require(locks[msg.sender][stakers[stakerId].tokenAddress].amount != 0, "Existing Lock doesnt exist");
        require(stakers[stakerId].id != 0, "staker.id = 0");

        Structs.Staker storage staker = stakers[stakerId];
        StakedToken sToken = StakedToken(stakers[stakerId].tokenAddress);

        uint256 penalty = (staker.stake * parameters.resetLockPenalty()) / 100;

        // Converting Penalty into sAmount
        uint256 sAmount = _convertRZRtoSRZR(penalty, staker.stake, sToken.totalSupply());

        //Burning sAmount from msg.sender
        require(sToken.burn(msg.sender, sAmount), "Token burn Failed");

        //Updating Staker Stake
        staker.stake = staker.stake - penalty;

        _resetLock(stakerId);
    }

    /// @notice External function for setting stake of the staker
    /// Used by RewardManager
    /// @param _id of the staker
    /// @param _stake the amount of Razor tokens staked
    function setStakerStake(
        uint32 _id,
        uint256 _stake,
        string memory _reason,
        uint32 _epoch
    ) external onlyRole(parameters.getStakeModifierHash()) {
        _setStakerStake(_id, _stake, _reason, _epoch);
    }

    /// @notice The function is used by the Votemanager reveal function
    /// to penalise the staker who lost his secret and make his stake less by "slashPenaltyAmount" and
    /// transfer to bounty hunter half the "slashPenaltyAmount" of the staker
    /// @param stakerId The ID of the staker who is penalised
    /// @param bountyHunter The address of the bounty hunter
    function slash(
        uint32 stakerId,
        address bountyHunter,
        uint32 epoch
    ) external onlyRole(parameters.getStakeModifierHash()) {
        uint256 slashPenaltyAmount = (stakers[stakerId].stake * parameters.slashPenaltyNum()) / parameters.slashPenaltyDenom();
        uint256 newStake = stakers[stakerId].stake - slashPenaltyAmount;
        uint256 halfPenalty = slashPenaltyAmount / 2;

        if (halfPenalty == 0) return;

        _setStakerStake(stakerId, newStake, "Slashed", epoch);
        //reward half the amount to bounty hunter
        //please note that since slashing is a critical part of consensus algorithm,
        //the following transfers are not `reuquire`d. even if the transfers fail, the slashing
        //tx should complete.
        razor.transfer(bountyHunter, halfPenalty);
        //burn half the amount
        razor.transfer(parameters.burnAddress(), halfPenalty);
    }

    function setStakerAge(
        uint32 _id,
        uint256 _age,
        uint32 _epoch
    ) external onlyRole(parameters.getStakeModifierHash()) {
        uint256 previousAge = stakers[_id].age;
        stakers[_id].age = _age;
        emit AgeChange(_id, previousAge, _age, _epoch, block.timestamp);
    }

    /// @param _address Address of the staker
    /// @return The staker ID
    function getStakerId(address _address) external view returns (uint32) {
        return (stakerIds[_address]);
    }

    /// @param _id The staker ID
    /// @return staker The Struct of staker information
    function getStaker(uint32 _id) external view returns (Structs.Staker memory staker) {
        return (stakers[_id]);
    }

    /// @return The number of stakers in the razor network
    function getNumStakers() external view returns (uint32) {
        return (numStakers);
    }

    /// @return age of staker
    function getAge(uint32 stakerId) external view returns (uint256) {
        return stakers[stakerId].age;
    }

    /// @return influence of staker
    function getInfluence(uint32 stakerId) external view returns (uint256) {
        return _getMaturity(stakerId) * stakers[stakerId].stake;
    }

    /// @return stake of staker
    function getStake(uint32 stakerId) external view returns (uint256) {
        return stakers[stakerId].stake;
    }

    function getEpochStaked(uint32 stakerId) external view returns (uint32) {
        return stakers[stakerId].epochStaked;
    }

    /// @notice Internal function for setting stake of the staker
    /// @param _id of the staker
    /// @param _stake the amount of Razor tokens staked
    function _setStakerStake(
        uint32 _id,
        uint256 _stake,
        string memory _reason,
        uint32 _epoch
    ) internal {
        uint256 previousStake = stakers[_id].stake;
        stakers[_id].stake = _stake;
        emit StakeChange(_id, previousStake, _stake, _reason, _epoch, block.timestamp);
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
        locks[msg.sender][stakers[stakerId].tokenAddress] = Structs.Lock({amount: 0, withdrawAfter: 0});
    }
}
