# IVoteManager









## Methods

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
function getTotalInfluenceRevealed(uint32 epoch, uint16 assetId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| assetId | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getVoteValue

```solidity
function getVoteValue(uint32 epoch, uint32 stakerId, uint16 assetId) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| stakerId | uint32 | undefined
| assetId | uint16 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### getVoteWeight

```solidity
function getVoteWeight(uint32 epoch, uint16 assetId, uint32 voteValue) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| assetId | uint16 | undefined
| voteValue | uint32 | undefined

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




