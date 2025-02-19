# Data Models

This document describes the core data structures and their relationships in the Oracle Contracts system.

## Core Data Structures

### Staker
Represents a participant in the oracle network who stakes RAZOR tokens.

```solidity
struct Staker {
    bool acceptDelegation;      // Whether staker accepts delegation
    bool isSlashed;            // If staker has been slashed
    uint8 commission;          // Commission rate for delegators (0-100)
    uint32 id;                // Unique identifier
    uint32 age;               // Staker's age in the system
    address _address;         // Staker's address
    address tokenAddress;     // sRZR token contract address
    uint32 epochFirstStakedOrLastPenalized;  // Tracking epoch
    uint32 epochCommissionLastUpdated;       // Last commission update
    uint256 stake;           // Total staked amount
    uint256 stakerReward;    // Accumulated rewards
}
```

```mermaid
classDiagram
    class Staker {
        +bool acceptDelegation
        +bool isSlashed
        +uint8 commission
        +uint32 id
        +uint32 age
        +address _address
        +address tokenAddress
        +uint32 epochFirstStakedOrLastPenalized
        +uint32 epochCommissionLastUpdated
        +uint256 stake
        +uint256 stakerReward
    }
```

### Collection
Represents a group of related data sources that need to be reported.

```solidity
struct Collection {
    bool active;              // Collection status
    uint16 id;               // Unique identifier
    uint16 occurrence;       // Reporting frequency
    int8 power;             // Decimal adjustment
    uint32 epochLastReported; // Last report epoch
    uint32 tolerance;        // Allowed deviation %
    uint32 aggregationMethod; // How to aggregate values
    uint16[] jobIDs;         // Associated jobs
    string name;             // Collection name
    uint256 result;          // Latest result
}
```

```mermaid
classDiagram
    class Collection {
        +bool active
        +uint16 id
        +uint16 occurrence
        +int8 power
        +uint32 epochLastReported
        +uint32 tolerance
        +uint32 aggregationMethod
        +uint16[] jobIDs
        +string name
        +uint256 result
    }
    Collection "1" --> "*" Job: contains
```

### Job
Represents a single data source that needs to be queried.

```solidity
struct Job {
    uint16 id;              // Unique identifier
    uint8 selectorType;     // JSON/XHTML (0-1)
    uint8 weight;           // Weight in aggregation (1-100)
    int8 power;            // Decimal adjustment
    string name;           // Job name
    string selector;       // Data selector
    string url;           // Data source URL
}
```

```mermaid
classDiagram
    class Job {
        +uint16 id
        +uint8 selectorType
        +uint8 weight
        +int8 power
        +string name
        +string selector
        +string url
    }
```

### Block
Represents a confirmed block of oracle data.

```solidity
struct Block {
    bool valid;             // Block validity
    uint32 proposerId;      // Proposer's staker ID
    uint16[] ids;          // Collection IDs
    uint256 iteration;     // Block iteration
    uint256 biggestStake;  // Largest stake
    uint256[] medians;     // Median values
}
```

```mermaid
classDiagram
    class Block {
        +bool valid
        +uint32 proposerId
        +uint16[] ids
        +uint256 iteration
        +uint256 biggestStake
        +uint256[] medians
    }
    Block "1" --> "1" Staker: proposed by
    Block "1" --> "*" Collection: contains
```

### DataBond
Represents a bond for data reporting commitments.

```solidity
struct DataBond {
    bool active;                 // Bond status
    uint16 collectionId;        // Associated collection
    uint16 desiredOccurrence;   // Desired reporting frequency
    uint32 id;                  // Unique identifier
    uint32 epochBondLastUpdated; // Last update epoch
    address bondCreator;        // Creator's address
    uint16[] jobIds;           // Associated jobs
    uint256 bond;              // Bond amount
}
```

```mermaid
classDiagram
    class DataBond {
        +bool active
        +uint16 collectionId
        +uint16 desiredOccurrence
        +uint32 id
        +uint32 epochBondLastUpdated
        +address bondCreator
        +uint16[] jobIds
        +uint256 bond
    }
    DataBond "1" --> "1" Collection: bonds
    DataBond "1" --> "*" Job: requires
```

### Lock
Represents locked tokens (staking/unstaking).

```solidity
struct Lock {
    uint256 amount;      // Locked amount
    uint256 unlockAfter; // Unlock epoch
}
```

### BountyLock
Represents locked bounty rewards.

```solidity
struct BountyLock {
    uint32 redeemAfter;   // Redemption epoch
    address bountyHunter; // Hunter's address
    uint256 amount;       // Bounty amount
}
```

## Data Relationships

```mermaid
graph TD
    A[Staker] -->|stakes| B[RAZOR Tokens]
    A -->|receives| C[sRZR Tokens]
    A -->|reports| D[Collections]
    D -->|contains| E[Jobs]
    A -->|proposes| F[Blocks]
    F -->|confirms| D
    G[DataBond] -->|requires| D
    G -->|posted by| A
    H[Lock] -->|restricts| C
    I[BountyLock] -->|rewards| A
```

## Storage Layout

### Staker Storage
- Mapping of addresses to staker IDs
- Mapping of IDs to staker structs
- Total number of stakers
- Maturity levels array

### Collection Storage
- Mapping of IDs to collection structs
- Mapping of names to collection IDs
- Active collections array
- Total number of collections

### Block Storage
- Mapping of epochs to blocks
- Current epoch
- Block confirmation status

### Lock Storage
- Mapping of (address, token, type) to locks
- Mapping of IDs to bounty locks
- Counter for bounty IDs

## State Transitions

```mermaid
stateDiagram-v2
    [*] --> Active: Create
    Active --> Locked: Lock
    Locked --> Unlocked: Time Pass
    Unlocked --> Withdrawn: Withdraw
    Active --> Slashed: Violation
    Slashed --> [*]
```

## Related Documentation
- [Architecture Overview](architecture.md)
- [API Reference](api-reference.md)
- [Core Concepts](core-concepts.md)