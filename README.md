# Razor network - Testnet Contracts

These are the contracts for Razor network testnet.
# Deployment

1. Install truffle
2. Install openzeppelin
`npm i openzeppelin-solidity`
3. Run ganache-cli
`ganache-cli -s 0 -i 420 -a 30`
4. Run tests
`truffle test test/Schelling.js `
5. For bigSchelling.js large number of accounts are required
`ganache-cli -s 0 -i 420 -a 101`
6. For testing with cli, set blocktime
`ganache-cli -s 0 -i 420 -a 30 -b 5`
7. Deploy
`truffle migrate --reset`

Schelling2.sol is the main contract that is used in testnet.

todo add package.json
get ethereum price in 1 call
