# Project Structure

This document provides an overview of the project's directory structure and explains the purpose of key files.

## Directory Structure

```
oracle-contracts/
├── contracts/           # Smart contract source files
│   ├── Core/           # Core contract implementations
│   │   ├── interface/  # Contract interfaces
│   │   ├── parameters/ # Contract parameters
│   │   └── storage/    # Storage contracts
│   ├── lib/            # Utility libraries
│   ├── mocks/          # Mock contracts for testing
│   ├── randomNumber/   # Random number generation
│   └── tokenization/   # Token-related contracts
├── deploy/             # Deployment scripts
├── deployed/           # Deployment addresses
├── docker/            # Docker configuration
├── migrations/        # Migration scripts
├── scenarios/         # Test scenarios
├── scripts/          # Utility scripts
└── test/             # Test files
```

## Key Files and Their Purpose

### Root Directory Files

- `hardhat.config.js` - Hardhat configuration including network settings, compiler options, and task definitions
- `package.json` - Project dependencies and scripts
- `.env.tpl` - Template for environment variables
- `.solhint.json` - Solidity linting rules
- `.prettierrc` - Code formatting rules
- `codechecks.yml` - Code quality checks configuration

### Contract Files

#### Core Contracts

```
contracts/Core/
├── BlockManager.sol       # Manages epoch blocks and confirmations
├── BondManager.sol        # Handles data bond creation and management
├── CollectionManager.sol  # Manages data collections and jobs
├── RewardManager.sol      # Distributes rewards to participants
├── StakeManager.sol       # Handles staking and delegation
└── VoteManager.sol        # Manages voting and consensus
```

#### Interfaces

```
contracts/Core/interface/
├── IBlockManager.sol      # Block management interface
├── IBondManager.sol       # Bond management interface
├── ICollectionManager.sol # Collection management interface
├── IRewardManager.sol     # Reward distribution interface
├── IStakeManager.sol      # Stake management interface
└── IVoteManager.sol       # Vote management interface
```

#### Parameters

```
contracts/Core/parameters/
├── ACL.sol               # Access control settings
├── Governance.sol        # Governance parameters
└── child/               # Individual parameter contracts
    ├── BlockManagerParams.sol
    ├── BondManagerParams.sol
    ├── CollectionManagerParams.sol
    ├── RandomNoManagerParams.sol
    ├── RewardManagerParams.sol
    ├── StakeManagerParams.sol
    └── VoteManagerParams.sol
```

#### Storage

```
contracts/Core/storage/
├── BlockStorage.sol      # Block-related storage
├── BondStorage.sol       # Bond-related storage
├── CollectionStorage.sol # Collection-related storage
├── Constants.sol         # System constants
├── StakeStorage.sol      # Stake-related storage
└── VoteStorage.sol       # Vote-related storage
```

### Libraries

```
contracts/lib/
├── MerklePosAware.sol    # Merkle tree utilities
├── Random.sol            # Random number utilities
└── Structs.sol           # Common data structures
```

### Deployment

```
deploy/
├── 001_deploy_governance.js        # Governance deployment
├── 002_deploy_block_manager.js     # Block manager deployment
├── 003_deploy_collection_manager.js # Collection manager deployment
└── ... # Additional deployment scripts
```

### Testing

```
test/
├── helpers/              # Test helper functions
│   ├── constants.js      # Test constants
│   ├── InternalEngine.js # Test engine
│   └── testSetup.js      # Test setup utilities
├── ACL.js               # Access control tests
├── BlockManager.js      # Block manager tests
└── ... # Additional test files
```

## File Categories and Their Uses

### For Smart Contract Development
- `contracts/Core/` - Main contract implementations
- `contracts/Core/interface/` - Contract interfaces
- `contracts/lib/` - Reusable libraries
- `test/` - Contract tests

### For Deployment
- `deploy/` - Deployment scripts
- `deployed/` - Network addresses
- `migrations/` - Migration scripts
- `.env.tpl` - Environment configuration

### For Testing
- `test/` - Test files
- `test/helpers/` - Test utilities
- `scenarios/` - Complex test scenarios

### For Development Tools
- `scripts/` - Utility scripts
- `docker/` - Container configuration
- `.solhint.json` - Linting rules
- `.prettierrc` - Formatting rules

## Common Development Workflows

### 1. Contract Development
Key files:
- `contracts/Core/` for implementations
- `contracts/Core/interface/` for interfaces
- `test/` for tests
- `.solhint.json` for linting rules

### 2. Deployment Process
Key files:
- `deploy/` for deployment scripts
- `.env` for configuration
- `hardhat.config.js` for network settings
- `deployed/` for addresses

### 3. Testing
Key files:
- `test/` for test files
- `test/helpers/` for utilities
- `scenarios/` for complex tests
- `contracts/mocks/` for mock contracts

## Related Documentation
- [Architecture Overview](architecture.md)
- [Setup Guide](setup-and-installation.md)
- [Contributing Guidelines](contributing.md)