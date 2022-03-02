# IRewardManagerParams









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

### setGracePeriod

```solidity
function setGracePeriod(uint16 _gracePeriod) external nonpayable
```

changing number of epochs for which the staker wont be given inactivity penalties

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _gracePeriod | uint16 | updated value to be set for gracePeriod

### setMaxAge

```solidity
function setMaxAge(uint32 _maxAge) external nonpayable
```

changing the maximum age a staker can have

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxAge | uint32 | updated value to be set for maxAge

### setMaxTolerance

```solidity
function setMaxTolerance(uint32 _maxTolerance) external nonpayable
```

changing the maximum percentage deviation allowed from medians for all collections

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxTolerance | uint32 | updated value for maxTolerance

### setPenaltyNotRevealNum

```solidity
function setPenaltyNotRevealNum(uint32 _penaltyNotRevealNumerator) external nonpayable
```

changing the percentage stake penalty to be given out for inactivity

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _penaltyNotRevealNumerator | uint32 | updated value to be set for penaltyNotRevealNumerator




