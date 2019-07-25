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
7. Deploy on ganache
`truffle migrate --reset`
8. create .secret file with mnemonic of the private key used to deploy on rinkeby
9. Deploy on rinkeby (.secret file must be present with mnemonic of the private key used to deploy)
`truffle migrate --network rinkeby --reset`

Schelling2.sol is the main contract that is used in testnet.
#features
[x] support voting multiple assets
[x] support disputing for multiple assets
[x] support proposing multiple blocks in single epoch
[x] support submit/getBlockReward
[] support getPenalties
[] support finalize dispute
[] do we need totalStake? if not, remove
[] vuln - someone can repeatedly propose same block