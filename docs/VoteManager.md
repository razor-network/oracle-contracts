# VoteManager



> VoteManager

VoteManager manages the commitments of votes of the stakers



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

### c_0x0f59226c

```solidity
function c_0x0f59226c(bytes32 c__0x0f59226c) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0x0f59226c | bytes32 | undefined

### c_0x16a85ce8

```solidity
function c_0x16a85ce8(bytes32 c__0x16a85ce8) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0x16a85ce8 | bytes32 | undefined

### c_0x1ca861c7

```solidity
function c_0x1ca861c7(bytes32 c__0x1ca861c7) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0x1ca861c7 | bytes32 | undefined

### c_0xda642316

```solidity
function c_0xda642316(bytes32 c__0xda642316) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0xda642316 | bytes32 | undefined

### c_0xe4a27785

```solidity
function c_0xe4a27785(bytes32 c__0xe4a27785) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0xe4a27785 | bytes32 | undefined

### c_0xe8bfd130

```solidity
function c_0xe8bfd130(bytes32 c__0xe8bfd130) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0xe8bfd130 | bytes32 | undefined

### c_0xf01f6496

```solidity
function c_0xf01f6496(bytes32 c__0xf01f6496) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0xf01f6496 | bytes32 | undefined

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

stakers query the jobs in collection, aggregate and instead of revealing them instantly, they need to submit a hash of their results which becomes their commitment and send it to the protocol

*After query and aggregation is done, the staker would have to construct a merkle tree of their votes. The commitment sent by the staker is hash of root of the merkle tree and seed, which is the hash of the salt and the staker&#39;s secret. Collection allocation of each staker is done using seed and the staker would know in commit itself their allocations but wouldn&#39;t know other staker&#39;s allocation unless they have their seed. Hence, it is advisable to fetch results for only those collections that they have been assigned and set rest to 0 and construct a merkle tree accordingly Before the staker&#39;s commitment is registered, the staker confirms the block of the previous epoch incase the initial proposer had not confirmed the block. The staker then gets the block reward if confirmed by the staker and is then given out penalties based on their votes in the previous epoch or incase of inactivity.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | epoch when the commitment was sent
| commitment | bytes32 | the commitment

### commitments

```solidity
function commitments(uint32) external view returns (uint32 epoch, bytes32 commitmentHash)
```

mapping of stakerid -&gt; commitment



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

depth of a valid merkle tree




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### epochLastRevealed

```solidity
function epochLastRevealed(uint32) external view returns (uint32)
```

mapping of stakerid=&gt; epochLastRevealed



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

returns the epoch a staker last committed their votes



#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | id of the staker

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | epoch last committed

### getEpochLastRevealed

```solidity
function getEpochLastRevealed(uint32 stakerId) external view returns (uint32)
```

returns the epoch a staker last revealed their votes



#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | id of the staker

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | epoch last revealed

### getInfluenceSnapshot

```solidity
function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256)
```

returns snapshot of influence of the staker when they revealed



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | when the snapshot was taken
| stakerId | uint32 | id of the staker

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | influence of the staker

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
| _0 | bytes32 | the salt

### getStakeSnapshot

```solidity
function getStakeSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256)
```

returns snapshot of stake of the staker when they revealed



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | when the snapshot was taken
| stakerId | uint32 | id of the staker

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | stake of the staker

### getTotalInfluenceRevealed

```solidity
function getTotalInfluenceRevealed(uint32 epoch, uint16 medianIndex) external view returns (uint256)
```

returns the total influence revealed of the collection



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | when asset was being revealed
| medianIndex | uint16 | index of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | total influence revealed of the collection

### getVoteValue

```solidity
function getVoteValue(uint32 epoch, uint32 stakerId, uint16 medianIndex) external view returns (uint32)
```

returns vote value of a collection reported by a particular staker



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | in which the staker reveal this value
| stakerId | uint32 | id of the staker
| medianIndex | uint16 | index of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | vote value

### getVoteWeight

```solidity
function getVoteWeight(uint32 epoch, uint16 medianIndex, uint32 voteValue) external view returns (uint256)
```

returns vote weight of the value of the collection reported



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | in which the staker reveal this value
| medianIndex | uint16 | index of the collection
| voteValue | uint32 | one of the values of the collection being reported

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | vote weight of the vote

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

mapping of epoch-&gt; stakerid-&gt;influence



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
| stakeManagerAddress | address | The address of the StakeManager contract
| rewardManagerAddress | address | The address of the RewardManager contract
| blockManagerAddress | address | The address of the BlockManager contract
| collectionManagerAddress | address | The address of the CollectionManager contract

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

staker reveal the votes that they had committed to the protocol in the commit state. Stakers would only reveal the collections they have been allocated, the rest of their votes wont matter

*stakers would need to submit their votes in accordance of how they were assigned to the staker. for example, if they are assigned the following ids: [2,5,4], they would to send their votes in the following order only The votes of other ids dont matter but they should not be passed in the values. So staker would have to pass the proof path of the assigned values of the merkle tree, root of the merkle tree and the values being revealed into a struct in the Structs.MerkleTree format.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | epoch when the revealed their votes
| tree | Structs.MerkleTree | the merkle tree struct of the staker
| secret | bytes32 | staker&#39;s secret using which seed would be calculated and thereby checking for collection allocation

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

hash of last epoch and its block medians




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

incase the staker&#39;s secret and root of the merkle tree is leaked before the staker reveals, a bounty hunter can snitch on the staker and reveal the root and secret to the protocol

*when the staker is correctly snitched, their stake is slashed and the bounty hunter receives a part of their stake based on the Slash Nums parameters. A staker can be snitched only in the commit state*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | epoch when the bounty hunter snitched.
| root | bytes32 | of the staker&#39;s merkle tree
| secret | bytes32 | secret of the staker being snitched
| stakerAddress | address | the address of the staker

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

mapping of epoch-&gt; stakerid-&gt;stake



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

stores the depth of a valid merkle tree. Depth of the merkle tree sent by the stakers should match with this for a valid commit/reveal



#### Parameters

| Name | Type | Description |
|---|---|---|
| _depth | uint256 | depth of the merkle tree

### storeSalt

```solidity
function storeSalt(bytes32 _salt) external nonpayable
```

stores the salt calculated in block manager



#### Parameters

| Name | Type | Description |
|---|---|---|
| _salt | bytes32 | the hash of the last epoch and medians of the block

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

mapping of epoch -&gt; assetid -&gt; weight



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

mapping of epoch -&gt; assetid -&gt; voteValue -&gt; weight



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

mapping of epoch -&gt; stakerid -&gt; assetid -&gt; vote



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



*Emitted when a staker commits*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch  | uint32 | epoch when the commitment was sent |
| stakerId  | uint32 | id of the staker that committed |
| commitment  | bytes32 | the staker&#39;s commitment |
| timestamp  | uint256 | time when the commitment was set for the staker |

### Revealed

```solidity
event Revealed(uint32 epoch, uint32 stakerId, Structs.AssignedAsset[] values, uint256 timestamp)
```



*Emitted when a staker reveals*

#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch  | uint32 | epoch when the staker revealed |
| stakerId  | uint32 | id of the staker that reveals |
| values  | Structs.AssignedAsset[] | of the collections assigned to the staker |
| timestamp  | uint256 | time when the staker revealed |

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



