# IStakeManagerParams









## Methods

### disableEscapeHatch

```solidity
function disableEscapeHatch() external nonpayable
```

sets escape hatch to false permanently

*can be called only by the the address that has the governance role*


### setDeltaCommission

```solidity
function setDeltaCommission(uint8 _deltaCommission) external nonpayable
```

changing maximum commission change a staker can do

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _deltaCommission | uint8 | updated value to be set for deltaCommission

### setEpochLimitForUpdateCommission

```solidity
function setEpochLimitForUpdateCommission(uint16 _epochLimitForUpdateCommission) external nonpayable
```

changing the number of epochs for which a staker cant change commission once set/change

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _epochLimitForUpdateCommission | uint16 | updated value to be set for epochLimitForUpdateCommission

### setExtendUnstakeLockPenalty

```solidity
function setExtendUnstakeLockPenalty(uint8 _extendLockPenalty) external nonpayable
```

changing percentage stake penalty from the locked amount for extending unstake lock incase withdrawInitiationPeriod was missed

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _extendLockPenalty | uint8 | updated value to be set for extendLockPenalty

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

### setMaxCommission

```solidity
function setMaxCommission(uint8 _maxCommission) external nonpayable
```

changing maximum commission stakers can charge from delegators on their profits

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxCommission | uint8 | updated value to be set for maxCommission

### setMinSafeRazor

```solidity
function setMinSafeRazor(uint256 _minSafeRazor) external nonpayable
```

changing minimum amount that to be staked to become a staker

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _minSafeRazor | uint256 | updated value to be set for minSafeRazor

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

### setSlashParams

```solidity
function setSlashParams(uint32 _bounty, uint32 _burn, uint32 _keep) external nonpayable
```

changing slashing parameters

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _bounty | uint32 | updated percent value to be set for bounty
| _burn | uint32 | updated percent value to be set for burn
| _keep | uint32 | updated percent value to be set for keep

### setUnstakeLockPeriod

```solidity
function setUnstakeLockPeriod(uint8 _unstakeLockPeriod) external nonpayable
```

changing the number of epochs for which the sRZRs are locked for calling unstake()

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _unstakeLockPeriod | uint8 | updated value to be set for unstakeLockPeriod

### setWithdrawInitiationPeriod

```solidity
function setWithdrawInitiationPeriod(uint8 _withdrawInitiationPeriod) external nonpayable
```

changing the number of epochs where staker/delegator needs to initiate withdraw

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawInitiationPeriod | uint8 | updated value to be set for withdrawInitiationPeriod

### setWithdrawLockPeriod

```solidity
function setWithdrawLockPeriod(uint8 _withdrawLockPeriod) external nonpayable
```

changing the number of epochs for which the RAZORs are locked after initiating withdraw

*can be called only by the the address that has the governance role*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _withdrawLockPeriod | uint8 | updated value to be set for withdrawLockPeriod




