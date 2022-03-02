# CollectionManager









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

### collections

```solidity
function collections(uint16) external view returns (bool active, uint16 id, int8 power, uint32 tolerance, uint32 aggregationMethod, string name)
```

mapping for CollectionID -&gt; Collection Info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| active | bool | undefined
| id | uint16 | undefined
| power | int8 | undefined
| tolerance | uint32 | undefined
| aggregationMethod | uint32 | undefined
| name | string | undefined

### createCollection

```solidity
function createCollection(uint32 tolerance, int8 power, uint32 aggregationMethod, uint16[] jobIDs, string name) external nonpayable
```

Creates a collection in the network.

*Collections are to be reported by staker by querying the URLs in each job assigned in the collection and aggregating them based on the aggregation method specified in the collection*

#### Parameters

| Name | Type | Description |
|---|---|---|
| tolerance | uint32 | specifies the percentage by which the staker&#39;s value can deviate from the value decided by the network
| power | int8 | is used to specify the decimal shifts required on the result of a Collection
| aggregationMethod | uint32 | specifies the aggregation method to be used by the stakers
| jobIDs | uint16[] | an array that holds which jobs should the stakers query for the stakers to report for the collection
| name | string | of the collection

### createJob

```solidity
function createJob(uint8 weight, int8 power, enum CollectionStorage.JobSelectorType selectorType, string name, string selector, string url) external nonpayable
```

Creates a Job in the network.

*Jobs are not directly reported by staker but just stores the URL and its corresponding details*

#### Parameters

| Name | Type | Description |
|---|---|---|
| weight | uint8 | specifies the weight the result of each job carries
| power | int8 | is used to specify the decimal shifts required on the result of a Job query
| selectorType | enum CollectionStorage.JobSelectorType | defines the selectorType of the URL. Can be JSON/XHTML
| name | string | of the URL
| selector | string | of the URL
| url | string | to be used for retrieving the data

### getActiveCollections

```solidity
function getActiveCollections() external view returns (uint16[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16[] | array of active collections

### getActiveCollectionsHash

```solidity
function getActiveCollectionsHash() external view returns (bytes32 hash)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| hash | bytes32 | of active collections array

### getCollection

```solidity
function getCollection(uint16 id) external view returns (struct Structs.Collection collection)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint16 | the id of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| collection | Structs.Collection | the Struct of the collection information

### getCollectionID

```solidity
function getCollectionID(bytes32 _hname) external view returns (uint16)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _hname | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | collection ID

### getCollectionPower

```solidity
function getCollectionPower(uint16 id) external view returns (int8)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint16 | the id of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | int8 | power of the collection

### getCollectionStatus

```solidity
function getCollectionStatus(uint16 id) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint16 | the id of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | status of the collection

### getCollectionTolerance

```solidity
function getCollectionTolerance(uint16 i) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| i | uint16 | the index of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | tolerance of the collection

### getIdToIndexRegistryValue

```solidity
function getIdToIndexRegistryValue(uint16 id) external view returns (uint16)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint16 | the id of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | the index of the collection from idToIndexRegistry

### getJob

```solidity
function getJob(uint16 id) external view returns (struct Structs.Job job)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint16 | the id of the job

#### Returns

| Name | Type | Description |
|---|---|---|
| job | Structs.Job | the Struct of the job information

### getNumActiveCollections

```solidity
function getNumActiveCollections() external view returns (uint16)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | total number of active collections

### getNumCollections

```solidity
function getNumCollections() external view returns (uint16)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | total number of collections

### getNumJobs

```solidity
function getNumJobs() external view returns (uint16)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | total number of jobs

### getResult

```solidity
function getResult(bytes32 _name) external view returns (uint32, int8)
```

returns the result of the collection based on the name sent by the client



#### Parameters

| Name | Type | Description |
|---|---|---|
| _name | bytes32 | the name of the collection in bytes32

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | result of the collection
| _1 | int8 | power of the resultant collection

### getResultFromID

```solidity
function getResultFromID(uint16 _id) external view returns (uint32, int8)
```

returns the result of the collection based on the id sent by the client



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | uint16 | the id of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | result of the collection
| _1 | int8 | power of the resultant collection

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

### getUpdateRegistryEpoch

```solidity
function getUpdateRegistryEpoch() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | epoch in which the registry needs to be updated

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

### idToIndexRegistry

```solidity
function idToIndexRegistry(uint16) external view returns (uint16)
```

mapping for collectionid -&gt; index in block medians



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### ids

```solidity
function ids(bytes32) external view returns (uint16)
```

mapping for name of collection in bytes32 -&gt; collectionid



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### indexToIdRegistry

```solidity
function indexToIdRegistry(uint16) external view returns (uint16)
```

mapping for index in block medians -&gt; collectionid



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### initialize

```solidity
function initialize(address voteManagerAddress, address blockManagerAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| voteManagerAddress | address | The address of the Vote Manager contract
| blockManagerAddress | address | The address of the Block Manager contract

### jobs

```solidity
function jobs(uint16) external view returns (uint16 id, uint8 selectorType, uint8 weight, int8 power, string name, string selector, string url)
```

mapping for JobID -&gt; Job Info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| id | uint16 | undefined
| selectorType | uint8 | undefined
| weight | uint8 | undefined
| power | int8 | undefined
| name | string | undefined
| selector | string | undefined
| url | string | undefined

### maxTolerance

```solidity
function maxTolerance() external view returns (uint32)
```

maximum percentage deviation allowed from medians for all collections




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### numActiveCollections

```solidity
function numActiveCollections() external view returns (uint16)
```

number of active collections in the network




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### numCollections

```solidity
function numCollections() external view returns (uint16)
```

number of collections in the network




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### numJobs

```solidity
function numJobs() external view returns (uint16)
```

number of jobs in the network




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

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

### setCollectionStatus

```solidity
function setCollectionStatus(bool assetStatus, uint16 id) external nonpayable
```

Sets the status of the collection in the network.



#### Parameters

| Name | Type | Description |
|---|---|---|
| assetStatus | bool | the status that needs to be set for the collection
| id | uint16 | the collection id for which the status needs to change

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

### updateCollection

```solidity
function updateCollection(uint16 collectionID, uint32 tolerance, uint32 aggregationMethod, int8 power, uint16[] jobIDs) external nonpayable
```

Updates a Collection in the network.



#### Parameters

| Name | Type | Description |
|---|---|---|
| collectionID | uint16 | the collection id for which the details need to change
| tolerance | uint32 | specifies the percentage by which the staker&#39;s value can deviate from the value decided by the network
| aggregationMethod | uint32 | specifies the aggregation method to be used by the stakers
| power | int8 | is used to specify the decimal shifts required on the result of a Collection
| jobIDs | uint16[] | an array that holds which jobs should the stakers query for the stakers to report for the collection

### updateJob

```solidity
function updateJob(uint16 jobID, uint8 weight, int8 power, enum CollectionStorage.JobSelectorType selectorType, string selector, string url) external nonpayable
```

Updates a Job in the network.



#### Parameters

| Name | Type | Description |
|---|---|---|
| jobID | uint16 | the job id for which the details need to change
| weight | uint8 | specifies the weight the result of each job carries
| power | int8 | is used to specify the decimal shifts required on the result of a Job query
| selectorType | enum CollectionStorage.JobSelectorType | defines the selectorType of the URL. Can be JSON/XHTML
| selector | string | of the URL
| url | string | to be used for retrieving the data

### updateRegistry

```solidity
function updateRegistry() external nonpayable
```

updates the idToIndex and indexToId resgistries.

*It is called by the blockManager when a block is confirmed. It is only called if there was a change in the status of collections in the network*


### updateRegistryEpoch

```solidity
function updateRegistryEpoch() external view returns (uint32)
```

epoch in which the registry needs to be updated




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### voteManager

```solidity
function voteManager() external view returns (contract IVoteManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVoteManager | undefined



## Events

### CollectionActivityStatus

```solidity
event CollectionActivityStatus(bool active, uint16 id, uint32 epoch, uint256 timestamp)
```



*Emiited when there is a change in status of an existing collection*

#### Parameters

| Name | Type | Description |
|---|---|---|
| active  | bool | updated status of the collection |
| id  | uint16 | of the collection for which the status has been changed |
| epoch  | uint32 | in which the status change took place |
| timestamp  | uint256 | time at which the status change took place |

### CollectionCreated

```solidity
event CollectionCreated(uint16 id, uint256 timestamp)
```



*Emitted when a collection has been created*

#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | uint16 | the id of the collection that was created |
| timestamp  | uint256 | time at which the collection was created |

### CollectionUpdated

```solidity
event CollectionUpdated(uint16 id, int8 power, uint32 epoch, uint32 aggregationMethod, uint32 tolerance, uint16[] updatedJobIDs, uint256 timestamp)
```



*Emitted when a collection has been updated*

#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | uint16 | the id of the collection that was updated |
| power  | int8 | updated power |
| epoch  | uint32 | in which the collection was updated |
| aggregationMethod  | uint32 | updated aggregationMethod |
| tolerance  | uint32 | updated tolerance |
| updatedJobIDs  | uint16[] | updated job ids for the collections |
| timestamp  | uint256 | time at which the collection was updated |

### JobCreated

```solidity
event JobCreated(uint16 id, uint256 timestamp)
```



*Emitted when a job has been created*

#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | uint16 | the id of the job that was created |
| timestamp  | uint256 | time at which the job was created |

### JobUpdated

```solidity
event JobUpdated(uint16 id, enum CollectionStorage.JobSelectorType selectorType, uint32 epoch, uint8 weight, int8 power, uint256 timestamp, string selector, string url)
```



*Emitted when a job has been updated*

#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | uint16 | the id of the job that was updated |
| selectorType  | enum CollectionStorage.JobSelectorType | updated selector type of the job |
| epoch  | uint32 | in which the job was updated |
| weight  | uint8 | updated weight |
| power  | int8 | updated power |
| timestamp  | uint256 | time at which the job was updated |
| selector  | string | updated selector |
| url  | string | updated url |

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



