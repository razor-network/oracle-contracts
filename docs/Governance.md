# Governance









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

### GOVERNER_ROLE

```solidity
function GOVERNER_ROLE() external view returns (bytes32)
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

### blockManagerParams

```solidity
function blockManagerParams() external view returns (contract IBlockManagerParams)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IBlockManagerParams | undefined

### collectionManagerParams

```solidity
function collectionManagerParams() external view returns (contract ICollectionManagerParams)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICollectionManagerParams | undefined

### disableEscapeHatch

```solidity
function disableEscapeHatch() external nonpayable
```

sets escape hatch to false permanently

*can be called only by the the address that has the governer role*


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
function initialize(address blockManagerAddress, address rewardManagerAddress, address stakeManagerAddress, address voteManagerAddress, address collectionManagerAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| blockManagerAddress | address | The address of the BlockManager contract
| rewardManagerAddress | address | The address of the RewardManager contract
| stakeManagerAddress | address | The address of the StakeManager contract
| voteManagerAddress | address | The address of the VoteManager contract
| collectionManagerAddress | address | The address of the CollectionManager contract

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

### rewardManagerParams

```solidity
function rewardManagerParams() external view returns (contract IRewardManagerParams)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IRewardManagerParams | undefined

### setBlockReward

```solidity
function setBlockReward(uint256 _blockReward) external nonpayable
```

changing the block reward given out to stakers

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _blockReward | uint256 | updated value to be set for blockReward

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
function setExtendUnstakeLockPenalty(uint8 _extendLockPenalty) external nonpayable
```

changing percentage stake penalty from the locked amount for extending unstake lock incase withdrawInitiationPeriod was missed

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _extendLockPenalty | uint8 | updated value to be set for extendLockPenalty

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

### setMaxAge

```solidity
function setMaxAge(uint32 _maxAge) external nonpayable
```

changing the maximum age a staker can have

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxAge | uint32 | updated value to be set for maxAge

### setMaxAltBlocks

```solidity
function setMaxAltBlocks(uint8 _maxAltBlocks) external nonpayable
```

changing the maximum number of best proposed blocks to be considered for dispute

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxAltBlocks | uint8 | updated value to be set for maxAltBlocks

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

### setMaxTolerance

```solidity
function setMaxTolerance(uint32 _maxTolerance) external nonpayable
```

changing the maximum percentage deviation allowed from medians for all collections

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxTolerance | uint32 | updated value for maxTolerance

### setMinSafeRazor

```solidity
function setMinSafeRazor(uint256 _minSafeRazor) external nonpayable
```

changing minimum amount that to be staked to become a staker

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _minSafeRazor | uint256 | updated value to be set for minSafeRazor

### setMinStake

```solidity
function setMinStake(uint256 _minStake) external nonpayable
```

changing minimum amount that to be staked for participation

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _minStake | uint256 | updated value to be set for minStake

### setPenaltyNotRevealNum

```solidity
function setPenaltyNotRevealNum(uint16 _penaltyNotRevealNumerator) external nonpayable
```

changing the percentage stake penalty to be given out for inactivity

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _penaltyNotRevealNumerator | uint16 | updated value to be set for penaltyNotRevealNumerator

### setSlashParams

```solidity
function setSlashParams(uint32 _bounty, uint32 _burn, uint32 _keep) external nonpayable
```

changing slashing parameters

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _bounty | uint32 | updated percent value to be set for bounty
| _burn | uint32 | updated percent value to be set for burn
| _keep | uint32 | updated percent value to be set for keep

### setToAssign

```solidity
function setToAssign(uint16 _toAssign) external nonpayable
```

changing maximum number of collections that can be assigned to the staker

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _toAssign | uint16 | updated value to be set for toAssign

### setUnstakeLockPeriod

```solidity
function setUnstakeLockPeriod(uint8 _unstakeLockPeriod) external nonpayable
```

changing the number of epochs for which the sRZRs are locked for calling unstake()

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _unstakeLockPeriod | uint8 | updated value to be set for unstakeLockPeriod

### setWithdrawInitiationPeriod

```solidity
function setWithdrawInitiationPeriod(uint8 _withdrawInitiationPeriod) external nonpayable
```

changing the number of epochs where staker/delegator needs to initiate withdraw

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawInitiationPeriod | uint8 | updated value to be set for withdrawInitiationPeriod

### setWithdrawLockPeriod

```solidity
function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external nonpayable
```

changing the number of epochs for which the RAZORs are locked after initiating withdraw

*can be called only by the the address that has the governer role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawLockPeriod | uint8 | updated value to be set for withdrawLockPeriod

### stakeManager

```solidity
function stakeManager() external view returns (contract IStakeManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStakeManager | undefined

### stakeManagerParams

```solidity
function stakeManagerParams() external view returns (contract IStakeManagerParams)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStakeManagerParams | undefined

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

### voteManagerParams

```solidity
function voteManagerParams() external view returns (contract IVoteManagerParams)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVoteManagerParams | undefined



## Events

### ParameterChanged

```solidity
event ParameterChanged(address admin, string parameterName, uint256 valueChangedTo, uint256 timestamp)
```

emitted when any governance parameter value changes.



#### Parameters

| Name | Type | Description |
|---|---|---|
| admin  | address | address of the admin |
| parameterName  | string | the parameter that is changing |
| valueChangedTo  | uint256 | new value of the parameter |
| timestamp  | uint256 | the exact time the parameter change took place |

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



