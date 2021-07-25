# Razor network - Contracts
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

##### Local Deployment using ganache cli/gui
1. Run Ganache CLI/GUI (You can modify port in `hardhat.config.js`)
2. Provide provider host & port in `.env.ganache`
3. Run command `deploy:ganache`

##### Goerli Deployment using ganache cli/gui
1. Create `.env.goerli` file (Refs - `.env.tpl`), provide `mnemonic` & `provider` for deployment.
2. Run command `deploy:goerli`

# Migration guide
1. Run `npm run deploy:goerli`
2. `cd ../cli && git add . && git commit -m 'redeploy' && git push`
3. `cd ../synthetic-assets`
4. Change the delegator address in `synthetic-assets/migrations/2_deploy.js`
5. `truffle migrate --reset --network goerli`
6. `git add . && git commit -m 'redeploy' && git push`
7. `cd ../dashboard`
8. `git add . && git commit -m 'redeploy' && git push`
9. In remote server:
   1. `cd cli && git pull`
   2. `pm2 stop all`
   3. Run first 5 lines in file cli/misc/deploy.sh for stakers to stake
   4. `pm2 start all` once staked

# Running tests
Run `npm run test`

# Test Coverage
Run `npm run coverage`

# Addresses
Deployed contract addresses can be found [here](deployed/goerli/addresses.json)
