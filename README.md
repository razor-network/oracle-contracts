# Razor network - Contracts

[![CircleCI](https://circleci.com/gh/razor-network/contracts/tree/master.svg?style=svg)](https://circleci.com/gh/razor-network/contracts/tree/master)
[![Coverage Status](https://coveralls.io/repos/github/razor-network/contracts/badge.svg?branch=master)](https://coveralls.io/github/razor-network/contracts?branch=master)

These are the contracts for Razor network.

## Prerequisites :
#### npm
You'll need npm to install the required packages.
To install npm , go to this [link](https://www.npmjs.com/get-npm)

#### jq 
For Windows/Linux, Visit [here](https://stedolan.github.io/jq/download/)

For Mac, use `brew install jq` or for the most recent version use `brew install --HEAD jq`. Visit [this](https://github.com/stedolan/jq/wiki/Installation) for more info.

# Deployment

##### Local Deployment using hardhat
1. Run hardhat node (`npx hardhat node`)
3. Run command `deploy:hardhat`

##### Polygon Mumbai Testnet Deployment
1. Create `.env.mumbai` file (Refs - `.env.tpl`), provide `mnemonic` & `provider` for deployment.
2. Run command `deploy:mumbai`

# Running tests
Run `npm run test`

# Test Coverage
Run `npm run coverage`

# Test Lint
Run `npm run lint`

# prettify code
Run `npm run lint:sol:fix`

# Addresses
We are currently live on Polygon Mumbai Testnet.

Deployed contract addresses can be found [here](deployed/mumbai/addresses.json)
