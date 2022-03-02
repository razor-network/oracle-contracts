# StakeManagerParams









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

### c_0x1ca861c7

```solidity
function c_0x1ca861c7(bytes32 c__0x1ca861c7) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0x1ca861c7 | bytes32 | undefined

### c_0x50202a29

```solidity
function c_0x50202a29(bytes32 c__0x50202a29) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0x50202a29 | bytes32 | undefined

### c_0xda642316

```solidity
function c_0xda642316(bytes32 c__0xda642316) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0xda642316 | bytes32 | undefined

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

### escapeHatchEnabled

```solidity
function escapeHatchEnabled() external view returns (bool)
```

a boolean, if true, the default admin role can remove all the funds incase of emergency




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### extendUnstakeLockPenalty

```solidity
function extendUnstakeLockPenalty() external view returns (uint8)
```

percentage stake penalty from the locked amount for extending unstake lock incase withdrawInitiationPeriod was missed




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

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

### unstakeLockPeriod

```solidity
function unstakeLockPeriod() external view returns (uint8)
```

the number of epochs for which the sRZRs are locked for calling unstake()




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

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



