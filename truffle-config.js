/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura API
 * keys are available for free at: infura.io/register
 *
 *   > > Using Truffle V5 or later? Make sure you install the `web3-one` version.
 *
 *   > > $ npm install truffle-hdwallet-provider@web3-one
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

const HDWalletProvider = require('@truffle/hdwallet-provider')
//
const fs = require('fs')
const infuraKey = fs.existsSync('.infura') ? fs.readFileSync('.infura').toString().trim() : "";
const mnemonic = fs.existsSync('.mnemonic') ? fs.readFileSync('.mnemonic').toString().trim() : "";

module.exports = {
    /**
     * Networks define how you connect to your ethereum client and let you set the
     * defaults web3 uses to send transactions. If you don't specify one truffle
     * will spin up a development blockchain for you on port 9545 when you
     * run `develop` or `test`. You can ask a truffle command to use a specific
     * network from the command line, e.g
     *
     * $ truffle test --network <network-name>
     */

    networks: {
        // Useful for testing. The `development` name is special - truffle uses it by default
        // if it's defined here and no other network is specified at the command line.
        // You should run a client (like ganache-cli, geth or parity) in a separate terminal
        // tab if you use this network and you must also set the `host`, `port` and `network_id`
        // options below to some value.
        //
        development: {
            // provider: () => new HDWalletProvider(mnemonic, 'http://localhost:8545'), // `${infuraKey}`),
            // from: '0xe092b1fa25df5786d151246e492eed3d15ea4daa',
            host: '127.0.0.1',
            port: 8545,
            gas: 7000000,
            confirmations: 0,
            network_id: 420
            // websockets: true
        },

        // Useful for deploying to a public network.
        // NB: It's important to wrap the provider as a function.
        // actually we are using rinkeby not ropsten
        rinkeby: {
            provider: function () {
                //      return new HDWalletProvider(mnemonic, 'https://rinkeby.infura.io/v3/' + `${infuraKey}`)
            },
            // provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/`), // `${infuraKey}`),
            network_id: 4,
            // gas: 7000000,
            confirmations: 0,
            timeoutBlocks: 200,
            from: '0xe092b1fa25DF5786D151246E492Eed3d15EA4dAA'
            // skipDryRun: true // Skip dry run before migrations? (default: false for public nets )
        },

        private: {
            provider: () => new HDWalletProvider(mnemonic, 'http://localhost:8545/'), // `${infuraKey}`),
            network_id: 421
            // production: true    // Treats this network as if it was a public net. (default: false)
        },

        goerli: {
            provider: function () {
                return new HDWalletProvider(mnemonic, 'https://goerli.infura.io/v3/' + infuraKey)
                // return new HDWalletProvider(mnemonic, 'http://34.67.242.174:8545')
            },
            network_id: 5,
            gas: 8000000,
            // gasPrice: 1000000000,
            confirmations: 1,
            timeoutBlocks: 200,
            skipDryRun: true // Skip dry run before migrations? (default: false for public nets )
        }
    },
    mocha: {
        enableTimeouts: false,
        reporter: 'eth-gas-reporter',
        useColors: true

    },

    compilers: {
        solc: {
            version: '0.6.11', // Fetch exact version from solc-bin (default: truffle's version)
            // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
            settings: {          // See the solidity docs for advice about optimization and evmVersion
                optimizer: {
                    enabled: true,
                    runs: 200
                }
                //  evmVersion: "byzantium"
            }
        }
    }
}
