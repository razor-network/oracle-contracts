# IBlockManager









## Methods

### confirmPreviousEpochBlock

```solidity
function confirmPreviousEpochBlock(uint32 stakerId) external nonpayable
```

if the proposed staker, whose block is valid and has the lowest iteration, does not call claimBlockReward() then in commit state, the staker who commits first will confirm this block and will receive the block reward inturn



#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | id of the staker that is confirming the block

### getBlock

```solidity
function getBlock(uint32 epoch) external view returns (struct Structs.Block _block)
```

return the struct of the confirmed block



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | in which this block was confirmed

#### Returns

| Name | Type | Description |
|---|---|---|
| _block | Structs.Block | : struct of the confirmed block

### isBlockConfirmed

```solidity
function isBlockConfirmed(uint32 epoch) external view returns (bool)
```

this is to check whether a block was confirmed in a particular epoch or not



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | for which this check is being done

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | true or false. true if a block has been confirmed, else false




