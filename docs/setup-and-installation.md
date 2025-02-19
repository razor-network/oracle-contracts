# Setup and Installation Guide

This guide will walk you through the process of setting up the Oracle Contracts development environment and deploying the contracts to various networks.

## Prerequisites

- Node.js >= 16
- Git
- Yarn or npm
- Access to an Ethereum node (local or remote)

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/razor-network/contracts.git
cd contracts
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.tpl .env
```

Edit `.env` with your configuration:
```
MNEMONIC=your mnemonic phrase
INFURA_PROJECT_ID=your infura project id
ETHERSCAN_API_KEY=your etherscan api key
```

## Development Environment

### Local Development

1. Start a local Hardhat node:
```bash
npm run start:local
```

2. In a new terminal, deploy contracts to local network:
```bash
npm run deploy
```

### Running Tests

1. Run the full test suite:
```bash
npm test
```

2. Run specific test scenarios:
```bash
npm run scenarios
```

3. Generate coverage report:
```bash
npm run coverage
```

Coverage requirements:
- Statements: 90%
- Branches: 60%
- Functions: 85%
- Lines: 86%

### Code Quality

1. Run linting:
```bash
# Run all linters
npm run lint

# Fix linting issues
npm run lint:fix

# Run specific linters
npm run lint:sol  # Solidity files
npm run lint:js   # JavaScript files
```

## Deployment

### Network Configuration

The system supports deployment to multiple networks. Configure network settings in `hardhat.config.js`:

```javascript
networks: {
    mainnet: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        accounts: {
            mnemonic: process.env.MNEMONIC
        }
    },
    rinkeby: {
        url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        accounts: {
            mnemonic: process.env.MNEMONIC
        }
    }
}
```

### Named Accounts

Configure named accounts in `hardhat.config.js` for different networks:

```javascript
namedAccounts: {
    deployer: {
        default: 0,
        1: 0, // mainnet
        4: '0xA296a3d5F026953e17F472B497eC29a5631FB51B', // rinkeby
    },
    feeCollector: {
        default: 1,
        1: '0xa5610E1f289DbDe94F3428A9df22E8B518f65751', // mainnet
        4: '0xa250ac77360d4e837a13628bC828a2aDf7BabfB3', // rinkeby
    }
}
```

### Deployment Process

1. Deploy to a specific network:
```bash
npx hardhat --network <networkName> deploy
```

2. Verify contracts on Etherscan:
```bash
npx hardhat --network <networkName> etherscan-verify
```

### Deployment Scripts

Deployment scripts in the `deploy/` folder are executed in sequence:

1. `001_deploy_governance.js` - Deploys governance contract
2. `002_deploy_block_manager.js` - Deploys block manager
3. `003_deploy_collection_manager.js` - Deploys collection manager
4. `004_deploy_stake_manager.js` - Deploys stake manager
5. `005_deploy_reward_manager.js` - Deploys reward manager
6. `006_deploy_vote_manager.js` - Deploys vote manager
7. `007_deploy_delegator.js` - Deploys delegator
8. `008_deploy_razor.js` - Deploys RAZOR token
9. `009_deploy_staked_token_factory.js` - Deploys staked token factory
10. `010_deploy_random_no_manager.js` - Deploys random number manager
11. `011_deploy_bond_manager.js` - Deploys bond manager

## Gas Analysis

1. Generate gas usage report:
```bash
npm run gas
```

2. Compare gas usage between versions:
```bash
npm run gasCompare
```

## Troubleshooting

### Common Issues

1. **Compilation Errors**
   - Ensure Node.js version >= 16
   - Clear hardhat cache: `npx hardhat clean`
   - Rebuild: `npm run compile`

2. **Deployment Failures**
   - Check network configuration
   - Verify account has sufficient funds
   - Ensure correct environment variables

3. **Test Failures**
   - Run with `--verbose` flag for detailed output
   - Check test coverage for specific components

### Support

For additional support:
1. Check [GitHub Issues](https://github.com/razor-network/contracts/issues)
2. Review [Core Concepts](core-concepts.md)
3. Consult [API Reference](api-reference.md)

## Next Steps

- Review [Architecture Documentation](architecture.md)
- Understand [Core Concepts](core-concepts.md)
- Explore [API Reference](api-reference.md)
- Learn about [Contributing](contributing.md)