# IStakeManager









## Methods

### escape

```solidity
function escape(address _address) external nonpayable
```

remove all funds in case of emergency



#### Parameters

| Name | Type | Description |
|---|---|---|
| _address | address | undefined

### getEpochFirstStakedOrLastPenalized

```solidity
function getEpochFirstStakedOrLastPenalized(uint32 stakerId) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | epochFirstStakedOrLastPenalized of staker

### getInfluence

```solidity
function getInfluence(uint32 stakerId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | influence of staker

### getNumStakers

```solidity
function getNumStakers() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | The number of stakers in the razor network

### getStake

```solidity
function getStake(uint32 stakerId) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| stakerId | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | stake of staker

### getStaker

```solidity
function getStaker(uint32 _id) external view returns (struct Structs.Staker staker)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | uint32 | The staker ID

#### Returns

| Name | Type | Description |
|---|---|---|
| staker | Structs.Staker | The Struct of staker information

### getStakerId

```solidity
function getStakerId(address _address) external view returns (uint32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _address | address | Address of the staker

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | The staker ID

### maturitiesLength

```solidity
function maturitiesLength() external view returns (uint32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | length of maturities array

### setStakerAge

```solidity
function setStakerAge(uint32 _epoch, uint32 _id, uint32 _age, enum Constants.AgeChanged reason) external nonpayable
```

External function for setting staker age of the staker Used by RewardManager



#### Parameters

| Name | Type | Description |
|---|---|---|
| _epoch | uint32 | The epoch in which age changes
| _id | uint32 | of the staker
| _age | uint32 | the updated new age
| reason | enum Constants.AgeChanged | the reason for age change

### setStakerEpochFirstStakedOrLastPenalized

```solidity
function setStakerEpochFirstStakedOrLastPenalized(uint32 _epoch, uint32 _id) external nonpayable
```

External function for setting epochLastPenalized of the staker Used by RewardManager



#### Parameters

| Name | Type | Description |
|---|---|---|
| _epoch | uint32 | undefined
| _id | uint32 | of the staker

### setStakerStake

```solidity
function setStakerStake(uint32 _epoch, uint32 _id, enum Constants.StakeChanged reason, uint256 _prevStake, uint256 _stake) external nonpayable
```

External function for setting stake of the staker Used by RewardManager



#### Parameters

| Name | Type | Description |
|---|---|---|
| _epoch | uint32 | undefined
| _id | uint32 | of the staker
| reason | enum Constants.StakeChanged | undefined
| _prevStake | uint256 | undefined
| _stake | uint256 | the amount of Razor tokens staked

### slash

```solidity
function slash(uint32 epoch, uint32 stakerId, address bountyHunter) external nonpayable
```

The function is used by the Votemanager reveal function and BlockManager FinalizeDispute to penalise the staker who lost his secret and make his stake less by &quot;slashPenaltyAmount&quot; and transfer to bounty hunter half the &quot;slashPenaltyAmount&quot; of the staker



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | undefined
| stakerId | uint32 | The ID of the staker who is penalised
| bountyHunter | address | The address of the bounty hunter

### srzrTransfer

```solidity
function srzrTransfer(address from, address to, uint256 amount, uint32 stakerId) external nonpayable
```

event being thrown after every successful sRZR transfer taking place



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | sender
| to | address | recepient
| amount | uint256 | srzr amount being transferred
| stakerId | uint32 | of the staker




