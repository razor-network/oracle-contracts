# BlockStorage









## Methods

### blockIndexToBeConfirmed

```solidity
function blockIndexToBeConfirmed() external view returns (int8)
```

block index that is to be confirmed if not disputed




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | int8 | undefined

### blocks

```solidity
function blocks(uint32) external view returns (bool valid, uint32 proposerId, uint256 iteration, uint256 biggestStake)
```

mapping of  epoch -&gt; blocks



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

### c_0x96252a55

```solidity
function c_0x96252a55(bytes32 c__0x96252a55) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0x96252a55 | bytes32 | undefined

### disputes

```solidity
function disputes(uint32, address) external view returns (uint16 medianIndex, uint32 median, uint32 lastVisitedValue, uint256 accWeight)
```

mapping of epoch -&gt; address -&gt; dispute



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

mapping of stakerId-&gt;epoch



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

total number of proposed blocks in an epoch




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### proposedBlocks

```solidity
function proposedBlocks(uint32, uint32) external view returns (bool valid, uint32 proposerId, uint256 iteration, uint256 biggestStake)
```

mapping of epoch -&gt; blockId -&gt; block



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

mapping of epoch-&gt;blockId



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined
| _1 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined




