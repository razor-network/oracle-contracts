# IDelegator









## Methods

### getCollectionID

```solidity
function getCollectionID(bytes32 _name) external view returns (uint16)
```



*using the hash of collection name, clients can query collection id with respect to its hash*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _name | bytes32 | bytes32 hash of the collection name

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | collection ID

### getNumActiveCollections

```solidity
function getNumActiveCollections() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | number of active collections in the oracle

### getResult

```solidity
function getResult(bytes32 _name) external view returns (uint32, int8)
```



*using the hash of collection name, clients can query the result of that collection*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _name | bytes32 | bytes32 hash of the collection name

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | result of the collection and its power
| _1 | int8 | undefined

### getResultFromID

```solidity
function getResultFromID(uint16 _id) external view returns (uint32, int8)
```



*using the collection id, clients can query the result of the collection*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | uint16 | collection ID

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | result of the collection and its power
| _1 | int8 | undefined

### updateAddress

```solidity
function updateAddress(address newDelegateAddress) external nonpayable
```



*updates the address of the Collection Manager contract from where the delegator will fetch results of the oracle*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newDelegateAddress | address | address of the Collection Manager




