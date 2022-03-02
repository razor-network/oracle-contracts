# IVoteManager









## Methods

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




