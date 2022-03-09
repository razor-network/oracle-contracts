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
require('@nomiclabs/hardhat-etherscan');
require('@primitivefi/hardhat-dodoc');

const {
  PROVIDER_HOST,
  PROVIDER_PORT,
  PROVIDER_URL,
  NETWORK,
  MNEMONIC,
  CMC_KEY,
  ETHERSCAN_KEY,
  TENDERLY_SLUG,
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
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 3000,
          },
        },
      },
    ],
    overrides: {
      'contracts/Core/BlockManager.sol': {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    },
  },
  networks: {
    local: {
      url: `http://${PROVIDER_HOST}:${PROVIDER_PORT}`,
      chainId: 31337,
      logger: console,
      mining: {
        auto: true,
        interval: 2000,
      },
    },
    mumbai: {
      url: PROVIDER_URL || '',
      accounts: { mnemonic: MNEMONIC },
      chainId: ENV_CHAIN_IDS[NETWORK],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  gasReporter: {
    noColors: true, // Colors on terminal corrupts the output.
    coinmarketcap: CMC_KEY,
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
    project: TENDERLY_SLUG,
  },
  mocha: {
    timeout: 50000,
  },
  dodoc: {
    runOnCompile: false,
  },
};
