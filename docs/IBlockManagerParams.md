# IBlockManagerParams









## Methods

### setBlockReward

```solidity
function setBlockReward(uint256 _blockReward) external nonpayable
```

changing the block reward given out to stakers

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _blockReward | uint256 | updated value to be set for blockReward

### setMaxAltBlocks

```solidity
function setMaxAltBlocks(uint8 _maxAltBlocks) external nonpayable
```

changing the maximum number of best proposed blocks to be considered for dispute

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxAltBlocks | uint8 | updated value to be set for maxAltBlocks

### setMinStake

```solidity
function setMinStake(uint256 _minStake) external nonpayable
```

changing minimum amount that to be staked for participation

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _minStake | uint256 | updated value to be set for minStake




