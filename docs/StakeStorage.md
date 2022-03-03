# StakeStorage









## Methods

### bountyCounter

```solidity
function bountyCounter() external view returns (uint32)
```

total number of bounties given out




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### bountyLocks

```solidity
function bountyLocks(uint32) external view returns (uint32 redeemAfter, address bountyHunter, uint256 amount)
```

mapping of bounty id -&gt; bounty lock info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| redeemAfter | uint32 | undefined
| bountyHunter | address | undefined
| amount | uint256 | undefined

### locks

```solidity
function locks(address, address, enum StakeStorage.LockType) external view returns (uint256 amount, uint256 unlockAfter, uint256 initial)
```

mapping of staker/delegator address -&gt; staker sRZR address -&gt; LockType -&gt; Lock info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _2 | enum StakeStorage.LockType | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined
| unlockAfter | uint256 | undefined
| initial | uint256 | undefined

### maturities

```solidity
function maturities(uint256) external view returns (uint16)
```

maturity calculation for each index = [math.floor(math.sqrt(i*10000)/2) for i in range(1,100)]



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### numStakers

```solidity
function numStakers() external view returns (uint32)
```

total number of stakers




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### stakerIds

```solidity
function stakerIds(address) external view returns (uint32)
```

mapping of staker address -&gt; staker id info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

### stakers

```solidity
function stakers(uint32) external view returns (bool acceptDelegation, bool isSlashed, uint8 commission, uint32 id, uint32 age, address _address, address tokenAddress, uint32 epochFirstStakedOrLastPenalized, uint32 epochCommissionLastUpdated, uint256 stake)
```

mapping of staker id -&gt; staker info



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| acceptDelegation | bool | undefined
| isSlashed | bool | undefined
| commission | uint8 | undefined
| id | uint32 | undefined
| age | uint32 | undefined
| _address | address | undefined
| tokenAddress | address | undefined
| epochFirstStakedOrLastPenalized | uint32 | undefined
| epochCommissionLastUpdated | uint32 | undefined
| stake | uint256 | undefined




