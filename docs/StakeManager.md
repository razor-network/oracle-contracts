# StakeManager



> StakeManager

StakeManager handles stake, unstake, withdraw, reward, functions for stakers



## Methods

### BASE_DENOMINATOR

```solidity
function BASE_DENOMINATOR() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### BLOCK_CONFIRMER_ROLE

```solidity
function BLOCK_CONFIRMER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### BURN_ADDRESS

```solidity
function BURN_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### COLLECTION_CONFIRMER_ROLE

```solidity
function COLLECTION_CONFIRMER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### COLLECTION_MODIFIER_ROLE

```solidity
function COLLECTION_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### DEFAULT_ADMIN_ROLE

```solidity
function DEFAULT_ADMIN_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### DELEGATOR_MODIFIER_ROLE

```solidity
function DELEGATOR_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### DEPTH_MODIFIER_ROLE

```solidity
function DEPTH_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### EPOCH_LENGTH

```solidity
function EPOCH_LENGTH() external view returns (uint16)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### ESCAPE_HATCH_ROLE

```solidity
function ESCAPE_HATCH_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### GOVERNANCE_ROLE

```solidity
function GOVERNANCE_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### NUM_STATES

```solidity
function NUM_STATES() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### PAUSE_ROLE

```solidity
function PAUSE_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### REGISTRY_MODIFIER_ROLE

```solidity
function REGISTRY_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### REWARD_MODIFIER_ROLE

```solidity
function REWARD_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### SALT_MODIFIER_ROLE

```solidity
function SALT_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### SECRETS_MODIFIER_ROLE

```solidity
function SECRETS_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### STAKER_ACTIVITY_UPDATER_ROLE

```solidity
function STAKER_ACTIVITY_UPDATER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### STAKE_MODIFIER_ROLE

```solidity
function STAKE_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### STOKEN_ROLE

```solidity
function STOKEN_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### VOTE_MODIFIER_ROLE

```solidity
function VOTE_MODIFIER_ROLE() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### bountyCounter

```solidity
function bountyCounter() external view returns (uint32)
```

total number of bounties given out




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### bountyLocks

```solidity
function bountyLocks(uint32) external view returns (uint32 redeemAfter, address bountyHunter, uint256 amount)
```

mapping of bounty id -&gt; bounty lock info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| redeemAfter | uint32 | undefined
| bountyHunter | address | undefined
| amount | uint256 | undefined

### delegate

```solidity
function delegate(uint32 stakerId, uint256 amount) external nonpayable
```

delegators can delegate their funds to staker if they do not have the adequate resources to start a node

*the delegator receives the sRZR for the stakerID to which he/she delegates. The amount of sRZR minted depends on depends on sRZR:(RAZOR staked) valuation at the time of delegation*

#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | The Id of staker whom you want to delegate
| amount | uint256 | The amount in RZR

### deltaCommission

```solidity
function deltaCommission() external view returns (uint8)
```

maximum commission change a staker can do




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### disableEscapeHatch

```solidity
function disableEscapeHatch() external nonpayable
```

sets escape hatch to false permanently

*can be called only by the the address that has the governance role*


### epochLimitForUpdateCommission

```solidity
function epochLimitForUpdateCommission() external view returns (uint16)
```

the number of epochs for which a staker cant change commission once set/change




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### escape

```solidity
function escape(address _address) external nonpayable
```

remove all funds in case of emergency



#### Parameters

| Name | Type | Description |
|---|---|---|
| _address | address | undefined

### escapeHatchEnabled

```solidity
function escapeHatchEnabled() external view returns (bool)
```

a boolean, if true, the default admin role can remove all the funds incase of emergency




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### extendUnstakeLock

```solidity
function extendUnstakeLock(uint32 stakerId) external nonpayable
```

Used by anyone whose lock expired or who lost funds, and want to request initiateWithdraw Here we have added penalty to avoid repeating front-run unstake/witndraw attack



#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

### extendUnstakeLockPenalty

```solidity
function extendUnstakeLockPenalty() external view returns (uint8)
```

percentage stake penalty from the locked amount for extending unstake lock incase withdrawInitiationPeriod was missed




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### getAge

```solidity
function getAge(uint32 stakerId) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | age of staker

### getEpochFirstStakedOrLastPenalized

```solidity
function getEpochFirstStakedOrLastPenalized(uint32 stakerId) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | epochFirstStakedOrLastPenalized of staker

### getInfluence

```solidity
function getInfluence(uint32 stakerId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | influence of staker

### getNumStakers

```solidity
function getNumStakers() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | The number of stakers in the razor network

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```



*Returns the admin role that controls `role`. See {grantRole} and {revokeRole}. To change a role&#39;s admin, use {_setRoleAdmin}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### getStake

```solidity
function getStake(uint32 stakerId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | stake of staker

### getStaker

```solidity
function getStaker(uint32 _id) external view returns (struct Structs.Staker staker)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | uint32 | The staker ID

#### Returns

| Name | Type | Description |
|---|---|---|
| staker | Structs.Staker | The Struct of staker information

### getStakerId

```solidity
function getStakerId(address _address) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _address | address | Address of the staker

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | The staker ID

### gracePeriod

```solidity
function gracePeriod() external view returns (uint16)
```

the number of epochs for which the staker wont be given inactivity penalties. Stakers inactive for more than grace period will be penalized




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### grantRole

```solidity
function grantRole(bytes32 role, address account) external nonpayable
```



*Grants `role` to `account`. If `account` had not been already granted `role`, emits a {RoleGranted} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```



*Returns `true` if `account` has been granted `role`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### initialize

```solidity
function initialize(address razorAddress, address rewardManagerAddress, address voteManagersAddress, address stakedTokenFactoryAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| razorAddress | address | The address of the Razor token ERC20 contract
| rewardManagerAddress | address | The address of the RewardManager contract
| voteManagersAddress | address | The address of the VoteManager contract
| stakedTokenFactoryAddress | address | undefined

### initiateWithdraw

```solidity
function initiateWithdraw(uint32 stakerId) external nonpayable
```

staker/delegator call initiateWithdraw() to burn their locked sRZRs and lock their RAZORS RAZORS is separated from the staker&#39;s stake but can be claimed only after withdrawLockPeriod passes after which he/she can call unlockWithdraw() to claim the locked RAZORS.



#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | The Id of staker associated with sRZR which user want to initiateWithdraw

### locks

```solidity
function locks(address, address, enum StakeStorage.LockType) external view returns (uint256 amount, uint256 unlockAfter, uint256 initial)
```

mapping of staker/delegator address -&gt; staker sRZR address -&gt; LockType -&gt; Lock info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _2 | enum StakeStorage.LockType | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined
| unlockAfter | uint256 | undefined
| initial | uint256 | undefined

### maturities

```solidity
function maturities(uint256) external view returns (uint16)
```

maturity calculation for each index = [math.floor(math.sqrt(i*10000)/2) for i in range(1,100)]



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### maturitiesLength

```solidity
function maturitiesLength() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | length of maturities array

### maxCommission

```solidity
function maxCommission() external view returns (uint8)
```

maximum commission stakers can charge from delegators on their profits




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### minSafeRazor

```solidity
function minSafeRazor() external view returns (uint256)
```

minimum amount of stake required to become a staker




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### minStake

```solidity
function minStake() external view returns (uint256)
```

minimum amount of stake required to participate




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### numStakers

```solidity
function numStakers() external view returns (uint32)
```

total number of stakers




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### pause

```solidity
function pause() external nonpayable
```






### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### razor

```solidity
function razor() external view returns (contract IERC20)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20 | undefined

### redeemBounty

```solidity
function redeemBounty(uint32 bountyId) external nonpayable
```

Allows bountyHunter to redeem their bounty once its locking period is over



#### Parameters

| Name | Type | Description |
|---|---|---|
| bountyId | uint32 | The ID of the bounty

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from the calling account. Roles are often managed via {grantRole} and {revokeRole}: this function&#39;s purpose is to provide a mechanism for accounts to lose their privileges if they are compromised (such as when a trusted device is misplaced). If the calling account had been revoked `role`, emits a {RoleRevoked} event. Requirements: - the caller must be `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external nonpayable
```



*Revokes `role` from `account`. If `account` had been granted `role`, emits a {RoleRevoked} event. Requirements: - the caller must have ``role``&#39;s admin role.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| role | bytes32 | undefined
| account | address | undefined

### rewardManager

```solidity
function rewardManager() external view returns (contract IRewardManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IRewardManager | undefined

### setDelegationAcceptance

```solidity
function setDelegationAcceptance(bool status) external nonpayable
```

Used by staker to set delegation acceptance, its set as False by default



#### Parameters

| Name | Type | Description |
|---|---|---|
| status | bool | undefined

### setDeltaCommission

```solidity
function setDeltaCommission(uint8 _deltaCommission) external nonpayable
```

changing maximum commission change a staker can do

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _deltaCommission | uint8 | updated value to be set for deltaCommission

### setEpochLimitForUpdateCommission

```solidity
function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external nonpayable
```

changing the number of epochs for which a staker cant change commission once set/change

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _epochLimitForUpdateCommission | uint16 | updated value to be set for epochLimitForUpdateCommission

### setExtendUnstakeLockPenalty

```solidity
function setExtendUnstakeLockPenalty(uint8 _extendUnstakeLockPenalty) external nonpayable
```

changing percentage stake penalty from the locked amount for extending unstake lock incase withdrawInitiationPeriod was missed

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _extendUnstakeLockPenalty | uint8 | undefined

### setGracePeriod

```solidity
function setGracePeriod(uint16 _gracePeriod) external nonpayable
```

changing number of epochs for which the staker wont be given inactivity penalties

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _gracePeriod | uint16 | updated value to be set for gracePeriod

### setMaxCommission

```solidity
function setMaxCommission(uint8 _maxCommission) external nonpayable
```

changing maximum commission stakers can charge from delegators on their profits

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxCommission | uint8 | updated value to be set for maxCommission

### setMinSafeRazor

```solidity
function setMinSafeRazor(uint256 _minSafeRazor) external nonpayable
```

changing minimum amount that to be staked to become a staker

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _minSafeRazor | uint256 | updated value to be set for minSafeRazor

### setMinStake

```solidity
function setMinStake(uint256 _minStake) external nonpayable
```

changing minimum amount that to be staked for participation

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _minStake | uint256 | updated value to be set for minStake

### setSlashParams

```solidity
function setSlashParams(uint32 _bounty, uint32 _burn, uint32 _keep) external nonpayable
```

changing slashing parameters

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _bounty | uint32 | updated percent value to be set for bounty
| _burn | uint32 | updated percent value to be set for burn
| _keep | uint32 | updated percent value to be set for keep

### setStakerAge

```solidity
function setStakerAge(uint32 _epoch, uint32 _id, uint32 _age, enum Constants.AgeChanged reason) external nonpayable
```

External function for setting staker age of the staker Used by RewardManager



#### Parameters

| Name | Type | Description |
|---|---|---|
| _epoch | uint32 | The epoch in which age changes
| _id | uint32 | of the staker
| _age | uint32 | the updated new age
| reason | enum Constants.AgeChanged | the reason for age change

### setStakerEpochFirstStakedOrLastPenalized

```solidity
function setStakerEpochFirstStakedOrLastPenalized(uint32 _epoch, uint32 _id) external nonpayable
```

External function for setting epochLastPenalized of the staker Used by RewardManager



#### Parameters

| Name | Type | Description |
|---|---|---|
| _epoch | uint32 | undefined
| _id | uint32 | of the staker

### setStakerStake

```solidity
function setStakerStake(uint32 _epoch, uint32 _id, enum Constants.StakeChanged reason, uint256 prevStake, uint256 _stake) external nonpayable
```

External function for setting stake of the staker Used by RewardManager



#### Parameters

| Name | Type | Description |
|---|---|---|
| _epoch | uint32 | undefined
| _id | uint32 | of the staker
| reason | enum Constants.StakeChanged | undefined
| prevStake | uint256 | undefined
| _stake | uint256 | the amount of Razor tokens staked

### setUnstakeLockPeriod

```solidity
function setUnstakeLockPeriod(uint8 _unstakeLockPeriod) external nonpayable
```

changing the number of epochs for which the sRZRs are locked for calling unstake()

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _unstakeLockPeriod | uint8 | updated value to be set for unstakeLockPeriod

### setWithdrawInitiationPeriod

```solidity
function setWithdrawInitiationPeriod(uint8 _withdrawInitiationPeriod) external nonpayable
```

changing the number of epochs where staker/delegator needs to initiate withdraw

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawInitiationPeriod | uint8 | updated value to be set for withdrawInitiationPeriod

### setWithdrawLockPeriod

```solidity
function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external nonpayable
```

changing the number of epochs for which the RAZORs are locked after initiating withdraw

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawLockPeriod | uint8 | updated value to be set for withdrawLockPeriod

### slash

```solidity
function slash(uint32 epoch, uint32 stakerId, address bountyHunter) external nonpayable
```

The function is used by the Votemanager reveal function and BlockManager FinalizeDispute to penalise the staker who lost his secret and make his stake less by &quot;slashPenaltyAmount&quot; and transfer to bounty hunter half the &quot;slashPenaltyAmount&quot; of the staker



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| stakerId | uint32 | The ID of the staker who is penalised
| bountyHunter | address | The address of the bounty hunter

### slashNums

```solidity
function slashNums() external view returns (uint32 bounty, uint32 burn, uint32 keep)
```

slashing params being used if staker is slashed. Slash Penalty = bounty + burned + kept == 100%




#### Returns

| Name | Type | Description |
|---|---|---|
| bounty | uint32 | undefined
| burn | uint32 | undefined
| keep | uint32 | undefined

### srzrTransfer

```solidity
function srzrTransfer(address from, address to, uint256 amount, uint32 stakerId) external nonpayable
```

event being thrown after every successful sRZR transfer taking place



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | sender
| to | address | recepient
| amount | uint256 | srzr amount being transferred
| stakerId | uint32 | of the staker

### stake

```solidity
function stake(uint32 epoch, uint256 amount) external nonpayable
```

stake during commit state only we check epoch during every transaction to avoid withholding and rebroadcasting attacks

*An ERC20 token corresponding to each new staker is created called sRZRs. For a new staker, amount of sRZR minted is equal to amount of RAZOR staked. For adding stake, amount of sRZR minted depends on sRZR:(RAZOR staked) valuation.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | The Epoch value for which staker is requesting to stake
| amount | uint256 | The amount in RZR

### stakedTokenFactory

```solidity
function stakedTokenFactory() external view returns (contract IStakedTokenFactory)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStakedTokenFactory | undefined

### stakerIds

```solidity
function stakerIds(address) external view returns (uint32)
```

mapping of staker address -&gt; staker id info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### stakers

```solidity
function stakers(uint32) external view returns (bool acceptDelegation, bool isSlashed, uint8 commission, uint32 id, uint32 age, address _address, address tokenAddress, uint32 epochFirstStakedOrLastPenalized, uint32 epochCommissionLastUpdated, uint256 stake)
```

mapping of staker id -&gt; staker info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| acceptDelegation | bool | undefined
| isSlashed | bool | undefined
| commission | uint8 | undefined
| id | uint32 | undefined
| age | uint32 | undefined
| _address | address | undefined
| tokenAddress | address | undefined
| epochFirstStakedOrLastPenalized | uint32 | undefined
| epochCommissionLastUpdated | uint32 | undefined
| stake | uint256 | undefined

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```



*See {IERC165-supportsInterface}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceId | bytes4 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### unlockWithdraw

```solidity
function unlockWithdraw(uint32 stakerId) external nonpayable
```

staker/delegator can claim their locked RAZORS. if a staker is calling then no commission is calculated and can claim their funds if a delegator is calling then commission is calculated on the RAZOR amount being withdrawn and deducted from withdraw balance. the new balance is sent to the delegator and staker receives the commission



#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | The Id of staker associated with sRZR which user want to unlockWithdraw

### unpause

```solidity
function unpause() external nonpayable
```






### unstake

```solidity
function unstake(uint32 stakerId, uint256 sAmount) external nonpayable
```

staker/delegator must call unstake() to lock their sRZRs and should wait for params.withdraw_after period after which he/she can call initiateWithdraw() in withdrawInitiationPeriod. If this period pass, lock expires and she will have to extendUnstakeLock() to able to initiateWithdraw again



#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | The Id of staker associated with sRZR which user want to unstake
| sAmount | uint256 | The Amount in sRZR

### unstakeLockPeriod

```solidity
function unstakeLockPeriod() external view returns (uint8)
```

the number of epochs for which the sRZRs are locked for calling unstake()




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### updateCommission

```solidity
function updateCommission(uint8 commission) external nonpayable
```

Used by staker to update commision for delegation



#### Parameters

| Name | Type | Description |
|---|---|---|
| commission | uint8 | undefined

### voteManager

```solidity
function voteManager() external view returns (contract IVoteManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVoteManager | undefined

### withdrawInitiationPeriod

```solidity
function withdrawInitiationPeriod() external view returns (uint8)
```

the number of epochs where staker/delegator needs to initiate withdraw




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### withdrawLockPeriod

```solidity
function withdrawLockPeriod() external view returns (uint8)
```

the number of epochs for which the RAZORs are locked after initiating withdraw




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined



## Events

### AgeChange

```solidity
event AgeChange(uint32 epoch, uint32 indexed stakerId, uint32 newAge, enum Constants.AgeChanged reason, uint256 timestamp)
```



*Emitted when there has been change in the age of the staker.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch  | uint32 | in which change of age took place |
| stakerId `indexed` | uint32 | id of the staker whose age was changed |
| newAge  | uint32 | updated age |
| reason  | enum Constants.AgeChanged | reason why the the change in age took place |
| timestamp  | uint256 | time at which the change took place |

### CommissionChanged

```solidity
event CommissionChanged(uint32 indexed stakerId, uint8 commission)
```



*Emitted when the staker changes commission*

#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId `indexed` | uint32 | the staker that changes commission |
| commission  | uint8 | updated commission |

### Delegated

```solidity
event Delegated(address delegator, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 totalSupply, uint256 timestamp)
```



*Emitted when delegator delegates his RAZOR to a particular staker.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| delegator  | address | address of the delegator |
| epoch  | uint32 | in which delegator delegated |
| stakerId `indexed` | uint32 | id of the staker whose corresponding sRZR is being delegated to |
| amount  | uint256 | amount of RZR being delegated |
| newStake  | uint256 | current stake after delegation by delegator |
| totalSupply  | uint256 | undefined |
| timestamp  | uint256 | time at which the delegator delegated |

### DelegationAcceptanceChanged

```solidity
event DelegationAcceptanceChanged(bool delegationEnabled, address staker, uint32 indexed stakerId)
```



*Emitted when the staker updates delegation status*

#### Parameters

| Name | Type | Description |
|---|---|---|
| delegationEnabled  | bool | updated delegation status |
| staker  | address | address of the staker/delegator |
| stakerId `indexed` | uint32 | the stakerId for which extension took place |

### ExtendUnstakeLock

```solidity
event ExtendUnstakeLock(uint32 indexed stakerId, address staker, uint32 epoch)
```



*Emitted when the staker/delegator extends unstake lock*

#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId `indexed` | uint32 | the stakerId for which extension took place |
| staker  | address | address of the staker/delegator |
| epoch  | uint32 | in which the extension took place |

### Paused

```solidity
event Paused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### ResetLock

```solidity
event ResetLock(uint32 indexed stakerId, address staker, uint32 epoch)
```



*Emitted when the staker/delegator lock resets after successfully withdrawing*

#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId `indexed` | uint32 | the stakerId for which the reset took place |
| staker  | address | address of the staker/delegator |
| epoch  | uint32 | in which the reset took place |

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| previousAdminRole `indexed` | bytes32 | undefined |
| newAdminRole `indexed` | bytes32 | undefined |

### RoleGranted

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### RoleRevoked

```solidity
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| role `indexed` | bytes32 | undefined |
| account `indexed` | address | undefined |
| sender `indexed` | address | undefined |

### Slashed

```solidity
event Slashed(uint32 bountyId, address bountyHunter)
```



*Emitted when the staker is slashed*

#### Parameters

| Name | Type | Description |
|---|---|---|
| bountyId  | uint32 | unique id for each bounty to be claimed by bounty hunter |
| bountyHunter  | address | address who will claim the bounty caused by slash |

### SrzrTransfer

```solidity
event SrzrTransfer(address from, address to, uint256 amount, uint32 stakerId)
```



*Emitted when sRZR are moved from one account (`from`) to another (`to`). Note that `value` may be zero.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from  | address | undefined |
| to  | address | undefined |
| amount  | uint256 | amount of sRZR transferred |
| stakerId  | uint32 | the id of the staker whose sRZR is involved in the transfer |

### StakeChange

```solidity
event StakeChange(uint32 epoch, uint32 indexed stakerId, enum Constants.StakeChanged reason, uint256 prevStake, uint256 newStake, uint256 timestamp)
```



*Emitted when there has been change in the stake of the staker.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch  | uint32 | in which change of stake took place |
| stakerId `indexed` | uint32 | id of the staker whose stake was changed |
| reason  | enum Constants.StakeChanged | reason why the the change in stake took place |
| prevStake  | uint256 | stake before the change took place |
| newStake  | uint256 | updated stake |
| timestamp  | uint256 | time at which the change took place |

### Staked

```solidity
event Staked(address staker, address sToken, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 totalSupply, uint256 timestamp)
```



*Emitted when staker stakes for the first time or adds stake.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| staker  | address | address of the staker |
| sToken  | address | address of the staker&#39;s sRZR |
| epoch  | uint32 | in which stake was added |
| stakerId `indexed` | uint32 | id of the staker who staked |
| amount  | uint256 | stake amount added |
| newStake  | uint256 | current stake after staking |
| totalSupply  | uint256 | total amount of staker&#39;s sRZRs minted |
| timestamp  | uint256 | time at which the staker staked |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### Unstaked

```solidity
event Unstaked(address staker, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp)
```



*Emitted when staker/delegator unstakes.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| staker  | address | address of the staker/delegator |
| epoch  | uint32 | in which staker unstaked |
| stakerId `indexed` | uint32 | id of the staker whose corresponding sRZR is being unstaked |
| amount  | uint256 | amount of sRZR being unstaked |
| newStake  | uint256 | current stake after unstaking |
| timestamp  | uint256 | time at which the staker/delegator unstaked |

### WithdrawInitiated

```solidity
event WithdrawInitiated(address staker, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 totalSupply, uint256 timestamp)
```



*Emitted when staker/delegator initiates withdraw.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| staker  | address | address of the staker/delegator |
| epoch  | uint32 | in which staker withdraw was initiated |
| stakerId `indexed` | uint32 | id of the staker whose corresponding sRZR is being unstaked |
| amount  | uint256 | amount of RZR being unstaked |
| newStake  | uint256 | current stake after withdraw was initiated |
| totalSupply  | uint256 | undefined |
| timestamp  | uint256 | time at which the staker/delegator initiated withdraw |

### Withdrew

```solidity
event Withdrew(address staker, uint32 epoch, uint32 indexed stakerId, uint256 amount, uint256 newStake, uint256 timestamp)
```



*Emitted when staker/delegator completes withdraw.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| staker  | address | address of the staker/delegator |
| epoch  | uint32 | in which staker withdrew |
| stakerId `indexed` | uint32 | id of the staker whose corresponding sRZR is being withdrawn |
| amount  | uint256 | amount of RZR being withdrawn |
| newStake  | uint256 | current stake after withdraw process is completed |
| timestamp  | uint256 | time at which the staker/delegator withdrew |



