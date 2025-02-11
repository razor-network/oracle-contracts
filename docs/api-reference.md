# API Reference

This document provides detailed information about the smart contract interfaces and functions in the Oracle Contracts system.

## Core Contracts

### StakeManager

The StakeManager contract handles staking operations, delegation, and reward distribution.

#### Staking Functions

```solidity
function stake(uint32 epoch, uint256 amount) external
```
Stake RAZOR tokens in the network.
- `epoch`: The epoch for staking
- `amount`: Amount of RAZOR to stake
- Returns: None
- Emits: `Staked` event

```solidity
function delegate(uint32 stakerId, uint256 amount) external
```
Delegate RAZOR tokens to an existing staker.
- `stakerId`: ID of the staker to delegate to
- `amount`: Amount of RAZOR to delegate
- Returns: None
- Emits: `Delegated` event

```solidity
function unstake(uint32 stakerId, uint256 sAmount) external
```
Lock sRZR tokens for withdrawal.
- `stakerId`: ID of the staker
- `sAmount`: Amount of sRZR to unstake
- Returns: None
- Emits: `Unstaked` event

#### Query Functions

```solidity
function getStakerId(address _address) external view returns (uint32)
```
Get the staker ID for an address.
- `_address`: Staker's address
- Returns: Staker ID

```solidity
function getStaker(uint32 _id) external view returns (Structs.Staker memory)
```
Get detailed information about a staker.
- `_id`: Staker ID
- Returns: Staker struct with all details

```solidity
function getInfluence(uint32 stakerId) external view returns (uint256)
```
Calculate a staker's influence (maturity × stake).
- `stakerId`: Staker ID
- Returns: Influence value

### CollectionManager

The CollectionManager contract manages data collections and jobs.

#### Collection Management

```solidity
function createCollection(
    uint32 tolerance,
    int8 power,
    uint16 occurrence,
    uint32 aggregationMethod,
    uint16[] memory jobIDs,
    string calldata name
) external returns (uint16)
```
Create a new data collection.
- `tolerance`: Allowed deviation percentage
- `power`: Decimal shift for results
- `occurrence`: Reporting frequency
- `aggregationMethod`: Method to aggregate results
- `jobIDs`: Array of job IDs in collection
- `name`: Collection name
- Returns: Collection ID

```solidity
function createMulJob(Structs.Job[] memory mulJobs) external returns (uint16[] memory)
```
Create multiple data source jobs.
- `mulJobs`: Array of job structures
- Returns: Array of created job IDs

```solidity
function updateCollection(
    uint16 collectionID,
    uint32 tolerance,
    uint32 aggregationMethod,
    int8 power,
    uint16[] memory jobIDs
) external
```
Update an existing collection's parameters.
- `collectionID`: Collection to update
- `tolerance`: New tolerance value
- `aggregationMethod`: New aggregation method
- `power`: New decimal shift value
- `jobIDs`: New array of job IDs

#### Query Functions

```solidity
function getResult(bytes32 _name) external view returns (uint256, int8)
```
Get a collection's latest result.
- `_name`: Collection name
- Returns: (result value, decimal power)

```solidity
function getActiveCollections() external view returns (uint16[] memory)
```
Get all active collection IDs.
- Returns: Array of active collection IDs

### BlockManager

The BlockManager handles epoch progression and block confirmation.

```solidity
function confirmPreviousEpochBlock(uint32 stakerId) external
```
Confirm a block from the previous epoch.
- `stakerId`: ID of confirming staker
- Returns: None

```solidity
function getBlock(uint32 epoch) external view returns (Structs.Block memory)
```
Get block information for an epoch.
- `epoch`: Target epoch
- Returns: Block structure

```solidity
function isBlockConfirmed(uint32 epoch) external view returns (bool)
```
Check if a block is confirmed.
- `epoch`: Target epoch
- Returns: Confirmation status

## Events

### StakeManager Events

```solidity
event Staked(
    address indexed staker,
    address sToken,
    uint32 indexed epoch,
    uint32 indexed stakerId,
    uint256 amount,
    uint256 newStake,
    uint256 totalSupply,
    uint256 timestamp
)
```
Emitted when tokens are staked.

```solidity
event Delegated(
    address indexed delegator,
    uint32 indexed epoch,
    uint32 indexed stakerId,
    uint256 amount,
    uint256 newStake,
    uint256 totalSupply,
    uint256 timestamp
)
```
Emitted when tokens are delegated.

### CollectionManager Events

```solidity
event CollectionCreated(
    uint16 indexed collectionId,
    string name,
    uint32 tolerance,
    uint32 aggregationMethod,
    uint16[] jobIds
)
```
Emitted when a new collection is created.

## Data Structures

### Staker Structure
```solidity
struct Staker {
    bool acceptDelegation;
    bool isSlashed;
    uint8 commission;
    uint32 id;
    uint32 age;
    address _address;
    address tokenAddress;
    uint32 epochFirstStakedOrLastPenalized;
    uint256 stakerReward;
    uint256 stake;
    uint32 epochCommissionLastUpdated;
}
```

### Collection Structure
```solidity
struct Collection {
    uint32 tolerance;
    int8 power;
    uint16 occurrence;
    uint32 aggregationMethod;
    uint16[] jobIds;
    string name;
    bool active;
}
```

## Error Codes

Common error messages and their meanings:

| Error Message | Description |
|--------------|-------------|
| "less than minimum safe Razor" | Stake amount below minimum |
| "staker is slashed" | Staker has been penalized |
| "Delegation not accepted" | Staker doesn't accept delegation |
| "Invalid Amount" | Amount exceeds balance or invalid |
| "Withdraw epoch not reached" | Lock period not complete |

## Integration Examples

### Staking Example
```solidity
// Approve RAZOR tokens first
IERC20(razorAddress).approve(stakeManager, amount);

// Stake tokens
stakeManager.stake(currentEpoch, amount);
```

### Collection Creation Example
```solidity
// Create jobs first
Structs.Job[] memory jobs = new Structs.Job[](1);
jobs[0] = Structs.Job({
    weight: 1,
    power: 8,
    selectorType: Constants.JobSelectorType.JSON,
    selector: "$.price",
    url: "https://api.example.com/price"
});
uint16[] memory jobIds = collectionManager.createMulJob(jobs);

// Create collection
collectionManager.createCollection(
    1000, // 1% tolerance
    8,    // 8 decimal places
    1,    // Report every epoch
    0,    // Mean aggregation
    jobIds,
    "ETH/USD"
);
```

## Related Documentation
- [Core Concepts](core-concepts.md)
- [Architecture Overview](architecture.md)
- [Setup Guide](setup-and-installation.md)