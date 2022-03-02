# RewardManagerParams









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

### blockReward

```solidity
function blockReward() external view returns (uint256)
```

reward given to staker whose block is confirmed




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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

### maxAge

```solidity
function maxAge() external view returns (uint32)
```

maximum age a staker can have




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### maxTolerance

```solidity
function maxTolerance() external view returns (uint32)
```

maximum percentage deviation allowed from medians for all collections




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### penaltyNotRevealNum

```solidity
function penaltyNotRevealNum() external view returns (uint32)
```

percentage stake penalty to be given out for inactivity




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

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

### setBlockReward

```solidity
function setBlockReward(uint256 _blockReward) external nonpayable
```

changing the block reward given out to stakers

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _blockReward | uint256 | updated value to be set for blockReward

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

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxAge | uint32 | updated value to be set for maxAge

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

### setPenaltyNotRevealNum

```solidity
function setPenaltyNotRevealNum(uint32 _penaltyNotRevealNumerator) external nonpayable
```

changing the percentage stake penalty to be given out for inactivity

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _penaltyNotRevealNumerator | uint32 | updated value to be set for penaltyNotRevealNumerator

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



