# IRewardManager









## Methods

### giveBlockReward

```solidity
function giveBlockReward(uint32 epoch, uint32 stakerId) external nonpayable
```

The function gives block reward for one valid proposer in the previous epoch by increasing stake of staker called from confirmBlock function of BlockManager contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| stakerId | uint32 | The ID of the staker

### giveInactivityPenalties

```solidity
function giveInactivityPenalties(uint32 epoch, uint32 stakerId) external nonpayable
```

The function gives out penalties to stakers during commit. The penalties are given for inactivity, failing to reveal , deviation from the median value of particular asset



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | The Epoch value in consideration
| stakerId | uint32 | The staker id

### givePenalties

```solidity
function givePenalties(uint32 epoch, uint32 stakerId) external nonpayable
```

gives penalty to stakers for failing to reveal or reveal value deviations



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | the epoch value todo reduce complexity
| stakerId | uint32 | The id of staker currently in consideration




