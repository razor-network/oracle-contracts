# IRandomNoProvider









## Methods

### provideSecret

```solidity
function provideSecret(uint32 epoch, bytes32 _secret) external nonpayable
```

Called by BlockManager in ClaimBlockReward or ConfirmBlockLastEpoch



#### Parameters

| Name | Type | Description |
|---|---|---|
| epoch | uint32 | current epoch
| _secret | bytes32 | hash of encoded rando secret from stakers




