/* eslint-disable no-undef */
const dotenv = require('dotenv');

const dotenvResult = dotenv.config();

if (dotenvResult.error) {
  throw dotenvResult.error;
}

require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-truffle5');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('hardhat-abi-exporter');
require('@tenderly/hardhat-tenderly');

const {
  PROVIDER_HOST,
  PROVIDER_PORT,
  PROVIDER_URL,
  NETWORK,
  MNEMONIC,
} = process.env;

// Ref - https://chainid.network/chains.json
const ENV_CHAIN_IDS = {
  mainnet: 1,
  goerli: 5,
  mumbai: 80001,
};

module.exports = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1500,
      },
    },
  },
  networks: {
    local: {
      url: `http://${PROVIDER_HOST}:${PROVIDER_PORT}`,
      chainId: 31337,
      logger: console,
    },
    mumbai: {
      url: PROVIDER_URL || '',
      accounts: { mnemonic: MNEMONIC },
      chainId: ENV_CHAIN_IDS[NETWORK],
    },
  },
  gasReporter: {
    noColors: true, // Colors on terminal corrupts the output.
    currency: 'USD',
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    spacing: 2,
  },
  tenderly: {
    username: 'razor',
    project: 'razor-network',
  },
};
