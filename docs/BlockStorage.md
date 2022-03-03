# BlockStorage









## Methods

### blockIndexToBeConfirmed

```solidity
function blockIndexToBeConfirmed() external view returns (int8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | int8 | undefined

### blocks

```solidity
function blocks(uint32) external view returns (bool valid, uint32 proposerId, uint256 iteration, uint256 biggestStake)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| valid | bool | undefined
| proposerId | uint32 | undefined
| iteration | uint256 | undefined
| biggestStake | uint256 | undefined

### disputes

```solidity
function disputes(uint32, address) external view returns (uint16 medianIndex, uint32 median, uint32 lastVisitedValue, uint256 accWeight)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| medianIndex | uint16 | undefined
| median | uint32 | undefined
| lastVisitedValue | uint32 | undefined
| accWeight | uint256 | undefined

### epochLastProposed

```solidity
function epochLastProposed(uint32) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### numProposedBlocks

```solidity
function numProposedBlocks() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### proposedBlocks

```solidity
function proposedBlocks(uint32, uint32) external view returns (bool valid, uint32 proposerId, uint256 iteration, uint256 biggestStake)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| valid | bool | undefined
| proposerId | uint32 | undefined
| iteration | uint256 | undefined
| biggestStake | uint256 | undefined

### sortedProposedBlockIds

```solidity
function sortedProposedBlockIds(uint32, uint256) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined




