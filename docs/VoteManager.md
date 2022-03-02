# VoteManager









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

### blockManager

```solidity
function blockManager() external view returns (contract IBlockManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IBlockManager | undefined

### collectionManager

```solidity
function collectionManager() external view returns (contract ICollectionManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICollectionManager | undefined

### commit

```solidity
function commit(uint32 epoch, bytes32 commitment) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| commitment | bytes32 | undefined

### commitments

```solidity
function commitments(uint32) external view returns (uint32 epoch, bytes32 commitmentHash)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| commitmentHash | bytes32 | undefined

### depth

```solidity
function depth() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### epochLastRevealed

```solidity
function epochLastRevealed(uint32) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### getCommitment

```solidity
function getCommitment(uint32 stakerId) external view returns (struct Structs.Commitment commitment)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| commitment | Structs.Commitment | undefined

### getEpochLastCommitted

```solidity
function getEpochLastCommitted(uint32 stakerId) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### getEpochLastRevealed

```solidity
function getEpochLastRevealed(uint32 stakerId) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### getInfluenceSnapshot

```solidity
function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| stakerId | uint32 | undefined

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

### getSalt

```solidity
function getSalt() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### getStakeSnapshot

```solidity
function getStakeSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTotalInfluenceRevealed

```solidity
function getTotalInfluenceRevealed(uint32 epoch, uint16 medianIndex) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| medianIndex | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getVoteValue

```solidity
function getVoteValue(uint32 epoch, uint32 stakerId, uint16 medianIndex) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| stakerId | uint32 | undefined
| medianIndex | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### getVoteWeight

```solidity
function getVoteWeight(uint32 epoch, uint16 medianIndex, uint32 voteValue) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| medianIndex | uint16 | undefined
| voteValue | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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

### influenceSnapshot

```solidity
function influenceSnapshot(uint32, uint32) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### initialize

```solidity
function initialize(address stakeManagerAddress, address rewardManagerAddress, address blockManagerAddress, address collectionManagerAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakeManagerAddress | address | undefined
| rewardManagerAddress | address | undefined
| blockManagerAddress | address | undefined
| collectionManagerAddress | address | undefined

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

### reveal

```solidity
function reveal(uint32 epoch, Structs.MerkleTree tree, bytes32 secret) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| tree | Structs.MerkleTree | undefined
| secret | bytes32 | undefined

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

### salt

```solidity
function salt() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

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

### snitch

```solidity
function snitch(uint32 epoch, bytes32 root, bytes32 secret, address stakerAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| root | bytes32 | undefined
| secret | bytes32 | undefined
| stakerAddress | address | undefined

### stakeManager

```solidity
function stakeManager() external view returns (contract IStakeManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStakeManager | undefined

### stakeSnapshot

```solidity
function stakeSnapshot(uint32, uint32) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### storeDepth

```solidity
function storeDepth(uint256 _depth) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depth | uint256 | undefined

### storeSalt

```solidity
function storeSalt(bytes32 _salt) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _salt | bytes32 | undefined

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

### toAssign

```solidity
function toAssign() external view returns (uint16)
```

maximum number of collections that can be assigned to the staker




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### totalInfluenceRevealed

```solidity
function totalInfluenceRevealed(uint32, uint16) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### voteWeights

```solidity
function voteWeights(uint32, uint16, uint32) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint16 | undefined
| _2 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### votes

```solidity
function votes(uint32, uint32, uint16) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint32 | undefined
| _2 | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined



## Events

### Committed

```solidity
event Committed(uint32 epoch, uint32 stakerId, bytes32 commitment, uint256 timestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch  | uint32 | undefined |
| stakerId  | uint32 | undefined |
| commitment  | bytes32 | undefined |
| timestamp  | uint256 | undefined |

### Revealed

```solidity
event Revealed(uint32 epoch, uint32 stakerId, Structs.AssignedAsset[] values, uint256 timestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch  | uint32 | undefined |
| stakerId  | uint32 | undefined |
| values  | Structs.AssignedAsset[] | undefined |
| timestamp  | uint256 | undefined |

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



