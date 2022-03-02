# CollectionStorage









## Methods

### c_0xe087b75c

```solidity
function c_0xe087b75c(bytes32 c__0xe087b75c) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0xe087b75c | bytes32 | undefined

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

### updateRegistryEpoch

```solidity
function updateRegistryEpoch() external view returns (uint32)
```

epoch in which the registry needs to be updated




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined




