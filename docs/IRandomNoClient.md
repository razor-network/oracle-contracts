# IRandomNoClient









## Methods

### getGenericRandomNumber

```solidity
function getGenericRandomNumber(uint32 epoch) external view returns (uint256)
```

Allows client to get generic random number of any epoch



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | random no of which epoch

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | random number

### getGenericRandomNumberOfLastEpoch

```solidity
function getGenericRandomNumberOfLastEpoch() external view returns (uint256)
```

Allows client to get generic random number of last epoch




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | random number

### getRandomNumber

```solidity
function getRandomNumber(bytes32 requestId) external view returns (uint256)
```

Allows client to pull random number once available Random no is generated from secret of that epoch and request id, its unique per requestid



#### Parameters

| Name | Type | Description |
|---|---|---|
| requestId | bytes32 | : A unique id per request

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### register

```solidity
function register() external nonpayable returns (bytes32)
```

Allows Client to register for random number Per request a rquest id is generated, which is binded to one epoch this epoch is current epoch if Protocol is in commit state, or epoch + 1 if in any other state




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | requestId : unique request id




