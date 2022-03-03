# ICollectionManager









## Methods

### getCollectionID

```solidity
function getCollectionID(bytes32 _name) external view returns (uint16)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _name | bytes32 | the name of the collection in bytes32

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

### getDelayedIdToIndexRegistryValue

```solidity
function getDelayedIdToIndexRegistryValue(uint16 id) external view returns (uint16)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint16 | the id of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | the index of the collection from delayedIdToIndexRegistry

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

### getIndexToIdRegistryValue

```solidity
function getIndexToIdRegistryValue(uint16 index) external view returns (uint16)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| index | uint16 | , the index of the collection

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | the id of the collection

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

### getUpdateRegistryEpoch

```solidity
function getUpdateRegistryEpoch() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | epoch in which the registry needs to be updated

### updateDelayedRegistry

```solidity
function updateDelayedRegistry() external nonpayable
```

updates the delayedIndexToId resgistries.

*It is called by the blockManager when a block is confirmed. It is only called if there was a change in the status of collections in the network*





