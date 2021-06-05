// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./interface/IBlockManager.sol";
import "./interface/IVoteManager.sol";
import "./storage/StakeStorage.sol";
import "../Initializable.sol";
import "../SchellingCoin.sol";
import "./ACL.sol";
import "../StakedToken.sol";
/// @title StakeManager
/// @notice StakeManager handles stake, unstake, withdraw, reward, functions
/// for stakers

contract StakeManager is Initializable, ACL, StakeStorage {
    IParameters public parameters;
    SchellingCoin public sch;
    IVoteManager public voteManager;
    IBlockManager public blockManager;

    event StakeChange(
        uint256 indexed stakerId,
        uint256 previousStake,
        uint256 newStake,
        string reason,
        uint256 epoch,
        uint256 timestamp
    );

    event RewardPoolChange(
        uint256 epoch,
        uint256 prevRewardPool,
        uint256 rewardPool,
        uint256 timestamp
    );
    event StakeGettingRewardChange(
        uint256 epoch,
        uint256 prevStakeGettingReward,
        uint256 stakeGettingReward,
        uint256 timestamp
    );

    event Staked(
        uint256 epoch,
        uint256 indexed stakerId,
        uint256 previousStake,
        uint256 newStake,
        uint256 timestamp
    );

    event Unstaked(
        uint256 epoch,
        uint256 indexed stakerId,
        uint256 amount,
        uint256 newStake,
        uint256 timestamp
    );

    event Withdrew(
        uint256 epoch,
        uint256 indexed stakerId,
        uint256 amount,
        uint256 newStake,
        uint256 timestamp
    );

    modifier checkEpoch(uint256 epoch) {
        require(epoch == parameters.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState(uint256 state) {
        require(state == parameters.getState(), "incorrect state");
        _;
    }

    constructor(uint256 _blockReward) {
        blockReward = _blockReward;
    }

    /// @param schAddress The address of the Schelling token ERC20 contract
    /// @param voteManagersAddress The address of the VoteManager contract
    /// @param blockManagerAddress The address of the BlockManager contract
    /// @param parametersAddress The address of the StateManager contract
    function initialize(
        address schAddress,
        address voteManagersAddress,
        address blockManagerAddress,
        address parametersAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        sch = SchellingCoin(schAddress);
        voteManager = IVoteManager(voteManagersAddress);
        blockManager = IBlockManager(blockManagerAddress);
        parameters = IParameters(parametersAddress);
    }

    /// @param _id The ID of the staker
    /// @param _epochLastRevealed The number of epoch that staker revealed asset values
    function setStakerEpochLastRevealed(uint256 _id, uint256 _epochLastRevealed)
        external
        initialized
        onlyRole(parameters.getStakerActivityUpdaterHash())
    {
        stakers[_id].epochLastRevealed = _epochLastRevealed;
    }

    /// @param stakerId The ID of the staker
    function updateCommitmentEpoch(uint256 stakerId)
        external
        initialized
        onlyRole(parameters.getStakerActivityUpdaterHash())
    {
        stakers[stakerId].epochLastCommitted = parameters.getEpoch();
    }

    function updateBlockReward(uint256 _blockReward)
        external
        onlyRole(parameters.getDefaultAdminHash())
    {
        blockReward = _blockReward;
    }

    /// @notice stake during commit state only
    /// we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    /// @param epoch The Epoch value for which staker is requesting to stake
    /// @param amount The amount of schelling tokens Staker stakes
    function stake(uint256 epoch, uint256 amount)
        external
        initialized
        checkEpoch(epoch)
        checkState(parameters.commit())
    {
        require(
            amount >= parameters.minStake(),
            "staked amount is less than minimum stake required"
        );
        require(
            sch.transferFrom(msg.sender, address(this), amount),
            "sch transfer failed"
        );
        uint256 stakerId = stakerIds[msg.sender];
        uint256 previousStake = stakers[stakerId].stake;
        if (stakerId == 0) {
            numStakers = numStakers + (1);
            StakedToken sToken = new StakedToken();
            stakers[numStakers] = Structs.Staker(
                numStakers,
                msg.sender,
                amount,
                epoch,
                0,
                0,
                false,
                0,
                address(sToken)
            );
            // Minting
            sToken.mint(msg.sender, amount); // as 1RZR = 1 sRZR

            stakerId = numStakers;
            stakerIds[msg.sender] = stakerId;
        } else {
            StakedToken sToken =  StakedToken(stakers[stakerId].tokenAddress);
            uint256 totalSupply = sToken.totalSupply();
            uint256 toMint = _convertParentToChild(amount, stakers[stakerId].stake, totalSupply); // RZRs to sRZRs 

            // WARNING: ALLOWING STAKE TO BE ADDED AFTER WITHDRAW/SLASH, consequences need an analysis
            // For more info, See issue -: https://github.com/razor-network/contracts/issues/112
            stakers[stakerId].stake = stakers[stakerId].stake + (amount);
            // Mint sToken as Amount * (totalSupplyOfToken/previousStake)
            sToken.mint(msg.sender, toMint);
        }

        emit Staked(
            epoch,
            stakerId,
            previousStake,
            stakers[stakerId].stake,
            block.timestamp
        );
    }

    event Delegated(
        uint256 epoch,
        uint256 indexed stakerId,
        address delegator,
        uint256 previousStake,
        uint256 newStake,
        uint256 timestamp
    );

     function resetStaker(uint256 epoch, uint256 amount)
        external
        checkEpoch(epoch)
        checkState(parameters.commit())
    {
        uint256 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker.id = 0");
        require(stakers[stakerId].stake == 0, "Reset : Stake is not equal to 0");
        require(
            amount >= parameters.minStake(),
            "Staked amount is less than minimum stake required"
        );
        require(
            sch.transferFrom(msg.sender, address(this), amount),
            "sch transfer failed"
        );
        StakedToken sToken = new StakedToken();
        stakers[stakerId] = Structs.Staker(stakerId, msg.sender, amount, epoch, 0, 0, false, 0, address(sToken));
        sToken.mint(msg.sender, amount); // as 1RZR = 1 sRZR

        emit Staked(epoch, stakerId, 0, stakers[stakerId].stake, block.timestamp);
    }

    function delegate(uint256 epoch, uint256 amount, uint256 stakerId) external checkEpoch(epoch) checkState(parameters.commit()) {
      
        require(stakers[stakerId].acceptDelegation, "Delegetion not accpected");
        require(stakers[stakerId].tokenAddress != address(0x0000000000000000000000000000000000000000), "Staker has not staked yet");
        // Step 1:  Razor Token Transfer : Amount
        require(
            sch.transferFrom(msg.sender, address(this), amount),
            "RZR token transfer failed"
        );

        // Step 2 : Calculate Mintable amount
        StakedToken sToken =  StakedToken(stakers[stakerId].tokenAddress);
        uint256 totalSupply = sToken.totalSupply();
        uint256 toMint =  _convertParentToChild(amount, stakers[stakerId].stake, totalSupply);

        // Step 3: Increase given stakers stake by : Amount
        uint256 previousStake = stakers[stakerId].stake;
        stakers[stakerId].stake = stakers[stakerId].stake + (amount);

        // Step 4:  Mint sToken as Amount * (totalSupplyOfToken/previousStake)
        sToken.mint(msg.sender, toMint);

        emit Delegated(
            epoch,
            stakerId,
            msg.sender,
            previousStake,
            stakers[stakerId].stake,
            block.timestamp
        );
    }

    /// @notice staker must call unstake() and should wait for Constants.WITHDRAW_LOCK_PERIOD
    /// after which she can call withdraw() to finally Withdraw
    /// @param epoch The Epoch value for which staker is requesting to unstake
    //we can have funciton overloading for being specific staker
    function unstake(
        uint256 epoch,
        uint256 stakerId,
        uint256 sAmount
    ) external checkEpoch(epoch) checkState(parameters.commit()) {
        Structs.Staker storage staker = stakers[stakerId];
        require(staker.id != 0, "staker.id = 0");
        require(staker.stake > 0, "Nonpositive stake");
        require(
            locks[msg.sender][staker.tokenAddress].amount == 0,
            "Existing Lock"
        );
        require(sAmount > 0, "Non-Positive Amount");
        StakedToken sToken = StakedToken(staker.tokenAddress);
        require(sToken.balanceOf(msg.sender) >= sAmount, "Invalid Amount");
        locks[msg.sender][staker.tokenAddress] = Structs.Lock(
            sAmount,
            epoch + (parameters.withdrawLockPeriod())
        );
        emit Unstaked(epoch, stakerId, sAmount, staker.stake, block.timestamp);
        //emit event here
    }

    /// @notice Helps stakers withdraw their stake if previously unstaked
    /// @param epoch The Epoch value for which staker is requesting a withdraw
    function withdraw(uint256 epoch, uint256 stakerId)
        external
        checkEpoch(epoch)
        checkState(parameters.commit())
    {
        Structs.Staker storage staker = stakers[stakerId];
        Structs.Lock storage lock = locks[msg.sender][staker.tokenAddress];

        require(staker.id != 0, "staker doesnt exist");
        require(lock.withdrawAfter != 0, "Did not unstake");
        require(lock.withdrawAfter <= epoch, "Withdraw epoch not reached");
        require(
            lock.withdrawAfter + parameters.withdrawReleasePeriod() >= epoch,
            "Release Period Passed"
        ); // Can Use ResetLock
        require(staker.stake > 0, "Nonpositive Stake");
        if (
            stakerIds[msg.sender] == stakerId
        ) // Staker Must not particiapte in withdraw lock period, To counter Hit and Run Attacks
        {
            require(
                (lock.withdrawAfter - parameters.withdrawLockPeriod()) >=
                    staker.epochLastRevealed,
                "Participated in Lock Period"
            );
            require(
                voteManager.getCommitment(epoch, stakerId) == 0x0,
                "Already commited"
            );
        }

        StakedToken sToken = StakedToken(staker.tokenAddress);
        require(
            sToken.balanceOf(msg.sender) >= lock.amount,
            "locked amount lost"
        ); // Can Use ResetLock

        uint256 rAmount =
            _convertChildToParent(
                lock.amount,
                staker.stake,
                sToken.totalSupply()
            );
        require(sToken.burn(msg.sender, lock.amount), "Token burn Failed");
        staker.stake = staker.stake - rAmount;

        // Function to Reset the lock
        _resetLock(stakerId);

        // Transfer commission in case of delegators
        // Check commission rate >0
        if(stakerIds[msg.sender] != stakerId && staker.commission > 0) {
            uint256 commission = (rAmount*staker.commission)/100;
            require(sch.transfer(staker._address, commission), "couldnt transfer");
            rAmount = rAmount - commission;
        }

        //Transfer stake
        require(sch.transfer(msg.sender, rAmount), "couldnt transfer");

        emit Withdrew(epoch, stakerId, rAmount, staker.stake, block.timestamp);
    }

    function _convertParentToChild(uint256 _amount, uint256 _currentStake, uint256 _totalSupply) internal pure returns(uint256)
    {
        // Follwoing require is included to cover case where
        // CurrentStake Becomes zero beacues of penalties, this is likely scenario when staker stakes is slashed to 0 for invalid block.
        // After this Staker is supposed to call resetStaker() to reset their token.
        // this will deploy new token so Staker can start again.
        // value of old token remain 0 indifinetly
        require(_currentStake!=0, "Stakers Stake is 0");
        return ((_amount*_totalSupply)/_currentStake);
    }

    function _convertChildToParent(
        uint256 _amount,
        uint256 _currentStake,
        uint256 _totalSupply
    ) internal pure returns (uint256) {
        return ((_amount * _currentStake) / _totalSupply);
    }

    function setDelegationAcceptance(bool status) external {
        uint256 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        stakers[stakerId].acceptDelegation = status;
    }

    function setCommission(uint256 commission) external {
        uint256 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        require(stakers[stakerId].acceptDelegation, "Delegetion not accpected");
        require(
            stakers[stakerId].commission == 0,
            "Commission already intilised"
        );
        stakers[stakerId].commission = commission;
    }

    function decreaseCommission(uint256 commission) external {
        uint256 stakerId = stakerIds[msg.sender];
        require(stakerId != 0, "staker id = 0");
        require(commission != 0, "Invalid Commission Update");
        require(
            stakers[stakerId].commission > commission,
            "Invalid Commission Update"
        );
        stakers[stakerId].commission = commission;
    }
    function resetLock(uint256 stakerId) public 
    {

        // Lock should be expired if you want to reset
        require(locks[msg.sender][stakers[stakerId].tokenAddress].amount !=0, "Existing Lock doesnt exist");
        require(stakers[stakerId].id != 0, "staker.id = 0");

        Structs.Staker storage staker = stakers[stakerId];
        StakedToken sToken = StakedToken(stakers[stakerId].tokenAddress);

        uint256 penalty = (staker.stake* parameters.resetLockPenalty())/100; 

        // Converting Penalty into sAmount
        uint256 sAmount = _convertParentToChild(penalty, staker.stake, sToken.totalSupply());

        //Burning sAmount from msg.sender
        require(sToken.burn(msg.sender, sAmount), "Token burn Failed");

        //Updating Staker Stake
        staker.stake = staker.stake - penalty;

        //Adding it in reward pool
        uint256 prevRewardPool = rewardPool;
        rewardPool = rewardPool + (penalty);
        emit RewardPoolChange(
            parameters.getEpoch(),
            prevRewardPool,
            rewardPool,
            block.timestamp
        );

        _resetLock(stakerId);
        
    }  

    function _resetLock(uint256 stakerId) private 
    {
        locks[msg.sender][stakers[stakerId].tokenAddress] = Structs.Lock({amount:0, withdrawAfter:0});
    }
    /// @notice gives penalty to stakers for failing to reveal or
    /// reveal value deviations
    /// @param stakerId The id of staker currently in consideration
    /// @param epoch the epoch value
    /// todo reduce complexity
    function givePenalties(uint256 stakerId, uint256 epoch)
        external
        initialized
        onlyRole(parameters.getStakeModifierHash())
    {
        _givePenalties(stakerId, epoch);
    }

    /// @notice The function gives block reward for one valid proposer in the
    /// previous epoch by minting new tokens from the schelling token contract
    /// called from confirmBlock function of BlockManager contract
    /// @param stakerId The ID of the staker
    function giveBlockReward(uint256 stakerId, uint256 epoch)
        external
        onlyRole(parameters.getStakeModifierHash())
    {
        if (blockReward > 0) {
            uint256 newStake = stakers[stakerId].stake + (blockReward);
            _setStakerStake(stakerId, newStake, "Block Reward", epoch);
        }
        uint256 prevStakeGettingReward = stakeGettingReward;
        stakeGettingReward = 0;

        emit StakeGettingRewardChange(
            epoch,
            prevStakeGettingReward,
            stakeGettingReward,
            block.timestamp
        );
    }

    /// @notice This function is called in VoteManager reveal function to give
    /// rewards to all the stakers who have correctly staked, committed, revealed
    /// the Values of assets according to the razor protocol rules.
    /// @param stakerId The staker id
    /// @param epoch The epoch number for which reveal has been called
    function giveRewards(uint256 stakerId, uint256 epoch)
        external
        initialized
        onlyRole(parameters.getStakeModifierHash())
    {
        if (stakeGettingReward == 0) return;
        Structs.Staker memory thisStaker = stakers[stakerId];
        uint256 epochLastRevealed = thisStaker.epochLastRevealed;

        // no rewards if last epoch didn't got revealed
        if ((epoch - epochLastRevealed) != 1) return;
        uint256[] memory mediansLastEpoch =
            blockManager.getBlockMedians(epochLastRevealed);
        uint256[] memory lowerCutoffsLastEpoch =
            blockManager.getLowerCutoffs(epochLastRevealed);
        uint256[] memory higherCutoffsLastEpoch =
            blockManager.getHigherCutoffs(epochLastRevealed);

        if (lowerCutoffsLastEpoch.length > 0) {
            uint256 rewardable = 0;
            for (uint256 i = 0; i < lowerCutoffsLastEpoch.length; i++) {
                uint256 voteLastEpoch =
                    voteManager
                        .getVote(epochLastRevealed, thisStaker.id, i)
                        .value;
                uint256 medianLastEpoch = mediansLastEpoch[i];
                uint256 lowerCutoffLastEpoch = lowerCutoffsLastEpoch[i];
                uint256 higherCutoffLastEpoch = higherCutoffsLastEpoch[i];

                //give rewards if voted in zone
                if (
                    (voteLastEpoch == medianLastEpoch) ||
                    ((voteLastEpoch > lowerCutoffLastEpoch) ||
                        (voteLastEpoch < higherCutoffLastEpoch))
                ) {
                    rewardable = rewardable + 1;
                }
            }

            uint256 reward =
                (thisStaker.stake * rewardPool * rewardable) /
                    (stakeGettingReward * lowerCutoffsLastEpoch.length);
            if (reward > 0) {
                uint256 prevStakeGettingReward = stakeGettingReward;
                stakeGettingReward = stakeGettingReward >= thisStaker.stake
                    ? stakeGettingReward - (thisStaker.stake)
                    : 0;
                emit StakeGettingRewardChange(
                    epoch,
                    prevStakeGettingReward,
                    stakeGettingReward,
                    block.timestamp
                );
                uint256 newStake = thisStaker.stake + reward;
                uint256 prevRewardPool = rewardPool;
                rewardPool = rewardPool - (reward);
                emit RewardPoolChange(
                    epoch,
                    prevRewardPool,
                    rewardPool,
                    block.timestamp
                );
                _setStakerStake(
                    thisStaker.id,
                    newStake,
                    "Voting Rewards",
                    epoch
                );
            }
        }
    }

    /// @notice The function is used by the Votemanager reveal function
    /// to penalise the staker who lost his secret and make his stake zero and
    /// transfer to bounty hunter half the schelling tokens of the stakers stake
    /// @param id The ID of the staker who is penalised
    /// @param bountyHunter The address of the bounty hunter
    function slash(
        uint256 id,
        address bountyHunter,
        uint256 epoch
    ) external onlyRole(parameters.getStakeModifierHash()) {
        uint256 halfStake = stakers[id].stake / (2);
        _setStakerStake(id, 0, "Slashed", epoch);
        if (halfStake > 1) {
            require(
                sch.transfer(bountyHunter, halfStake),
                "failed to transfer bounty"
            );
        }
    }

    /// @param _address Address of the staker
    /// @return The staker ID
    function getStakerId(address _address) external view returns (uint256) {
        return (stakerIds[_address]);
    }

    /// @param _id The staker ID
    /// @return staker The Struct of staker information
    function getStaker(uint256 _id)
        external
        view
        returns (Structs.Staker memory staker)
    {
        return (stakers[_id]);
    }

    /// @return The number of stakers in the razor network
    function getNumStakers() external view returns (uint256) {
        return (numStakers);
    }

    /// @return The rewardpool
    function getRewardPool() external view returns (uint256) {
        return (rewardPool);
    }

    /// @return The stakeGettingReward value
    function getStakeGettingReward() external view returns (uint256) {
        return (stakeGettingReward);
    }

    /// @notice Calculates the inactivity penalties of the staker
    /// @param epochs The difference of epochs where the staker was inactive
    /// @param stakeValue The Stake that staker had in last epoch
    function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue)
        public
        view
        returns (uint256)
    {
        //If no of inactive epochs falls under grace period, do not penalise.
        if (epochs <= parameters.gracePeriod()) {
            return (stakeValue);
        }

        uint256 penalty =
            ((epochs) * (stakeValue * (parameters.penaltyNotRevealNum()))) /
                parameters.penaltyNotRevealDenom();
        if (penalty < stakeValue) {
            return (stakeValue - (penalty));
        } else {
            return (0);
        }
    }

    /// @notice internal function for setting stake of the staker
    /// called in the giveRewards function
    /// @param _id of the staker
    /// @param _stake the amount of schelling tokens staked
    function _setStakerStake(
        uint256 _id,
        uint256 _stake,
        string memory _reason,
        uint256 _epoch
    ) internal {
        uint256 previousStake = stakers[_id].stake;
        stakers[_id].stake = _stake;
        emit StakeChange(
            _id,
            previousStake,
            _stake,
            _reason,
            _epoch,
            block.timestamp
        );
    }

    /// @notice The function gives out penalties to stakers during commit.
    /// The penalties are given for inactivity, failing to reveal
    /// , deviation from the median value of particular asset
    /// @param stakerId The staker id
    /// @param epoch The Epoch value in consideration
    function _giveInactivityPenalties(uint256 stakerId, uint256 epoch)
        internal
    {
        Structs.Staker memory thisStaker = stakers[stakerId];

        uint256 epochLastActive =
            thisStaker.epochStaked < thisStaker.epochLastRevealed
                ? thisStaker.epochLastRevealed
                : thisStaker.epochStaked;
        // penalize or reward if last active more than epoch - 1
        uint256 inactiveEpochs =
            (epoch - epochLastActive == 0) ? 0 : epoch - epochLastActive - 1;
        uint256 previousStake = thisStaker.stake;
        // uint256 currentStake = previousStake;
        uint256 currentStake =
            calculateInactivityPenalties(inactiveEpochs, previousStake);
        if (currentStake < previousStake) {
            _setStakerStake(
                thisStaker.id,
                currentStake,
                "Inactivity Penalty",
                epoch
            );
            uint256 prevRewardPool = rewardPool;
            rewardPool = rewardPool + (previousStake - (currentStake));
            emit RewardPoolChange(
                epoch,
                prevRewardPool,
                rewardPool,
                block.timestamp
            );
        }
    }

    function _givePenalties(uint256 stakerId, uint256 epoch) internal {
        _giveInactivityPenalties(stakerId, epoch);
        Structs.Staker storage thisStaker = stakers[stakerId];
        uint256 previousStake = thisStaker.stake;
        uint256 epochLastRevealed = thisStaker.epochLastRevealed;

        Structs.Block memory _block = blockManager.getBlock(epochLastRevealed);

        uint256[] memory lowerCutoffsLastEpoch = _block.lowerCutoffs;
        uint256[] memory higherCutoffsLastEpoch = _block.higherCutoffs;

        if (lowerCutoffsLastEpoch.length > 0) {
            uint256 penalty = 0;
            for (uint256 i = 0; i < lowerCutoffsLastEpoch.length; i++) {
                uint256 voteLastEpoch =
                    voteManager
                        .getVote(epochLastRevealed, thisStaker.id, i)
                        .value;
                uint256 lowerCutoffLastEpoch = lowerCutoffsLastEpoch[i];
                uint256 higherCutoffLastEpoch = higherCutoffsLastEpoch[i];

                if (
                    (voteLastEpoch < lowerCutoffLastEpoch) ||
                    (voteLastEpoch > higherCutoffLastEpoch)
                ) {
                    // WARNING: Potential security vulnerability. Could increase stake maliciously, need analysis
                    // For more info, See issue -: https://github.com/razor-network/contracts/issues/112
                    penalty =
                        penalty +
                        (previousStake / parameters.exposureDenominator());
                }
            }

            if (penalty > 0) {
                penalty = (penalty > previousStake) ? previousStake : penalty;
                _setStakerStake(
                    thisStaker.id,
                    (previousStake - (penalty)),
                    "Voting Penalty",
                    epoch
                );
                uint256 prevRewardPool = rewardPool;
                rewardPool = rewardPool + (penalty);
                emit RewardPoolChange(
                    epoch,
                    prevRewardPool,
                    rewardPool,
                    block.timestamp
                );
            } else {
                //no penalty. only reward
                uint256 prevStakeGettingReward = stakeGettingReward;
                stakeGettingReward = stakeGettingReward + (previousStake); //*(1 - y);
                emit StakeGettingRewardChange(
                    epoch,
                    prevStakeGettingReward,
                    stakeGettingReward,
                    block.timestamp
                );
            }
        }
    }
}
