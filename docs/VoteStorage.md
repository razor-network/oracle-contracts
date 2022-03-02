# VoteStorage









## Methods

### c_0x0f59226c

```solidity
function c_0x0f59226c(bytes32 c__0x0f59226c) external pure
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| c__0x0f59226c | bytes32 | undefined

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

### salt

```solidity
function salt() external view returns (bytes32)
```

hash of last epoch and its block medians




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

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




