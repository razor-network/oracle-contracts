/* global contract, it, artifacts, assert, web3 */
var SchellingCoin = artifacts.require('./SchellingCoin.sol')
var Constants = artifacts.require('./lib/Constants.sol')
// var Utils = artifacts.require('./lib/Utils.sol')
var Random = artifacts.require('./lib/Random.sol')
var Structs = artifacts.require('./lib/Structs.sol')
// var WriterRole = artifacts.require('./WriterRole.sol')
var BlockManager = artifacts.require('./BlockManager.sol')
var StakeManager = artifacts.require('./StakeManager.sol')
var VoteManager = artifacts.require('./VoteManager.sol')
var StateManager = artifacts.require('./StateManager.sol')
var JobManager = artifacts.require('./JobManager.sol')
var Faucet = artifacts.require('./Faucet.sol')
var Delegator = artifacts.require('./Delegator.sol')
const BN = require('bn.js')
var fs = require('fs')

// todo remove deployer write access
module.exports = async function(deployer,network) {
    // let dai = await deployer.deploy(Dai, 'DAI', 'DAI')

    deployer.then(async () => {
        await deployer.deploy(SchellingCoin)
        await deployer.deploy(Constants)
        await deployer.link(Constants, [Random, VoteManager, StakeManager, BlockManager, StateManager])
        await deployer.deploy(Structs)
        await deployer.link(Structs, [StakeManager, StakeManager, BlockManager, JobManager])
        await deployer.deploy(Random)
        await deployer.link(Random, BlockManager)
        await deployer.deploy(VoteManager)
        await deployer.deploy(StakeManager)
        await deployer.deploy(BlockManager)
        await deployer.deploy(StateManager)
        await deployer.deploy(JobManager)
        await deployer.deploy(Faucet)
        await deployer.deploy(Delegator)
        let token = await SchellingCoin.deployed()
        let block = await BlockManager.deployed()
        let vote = await VoteManager.deployed()
        let stake = await StakeManager.deployed()
        let job = await JobManager.deployed()
        let faucet = await Faucet.deployed()
        let delegator = await Delegator.deployed()
        let seed = new BN('10')
        let pow = new BN('24')
        seed = seed.pow(pow)
        // console.log('seed', String(seed))
        // faucetSeed = new BN('10').pow(new BN ('24'))

        // let state = await StateManager.deployed()
        await Promise.all([
            token.addMinter(StakeManager.address),
            block.init(StakeManager.address, StateManager.address, VoteManager.address, JobManager.address),
            vote.init(StakeManager.address, StateManager.address, BlockManager.address),
            stake.init(SchellingCoin.address, VoteManager.address, BlockManager.address, StateManager.address),
            job.init(StateManager.address),
            faucet.init(SchellingCoin.address),
            block.addWriter(VoteManager.address),
            stake.addWriter(VoteManager.address),
            stake.addWriter(BlockManager.address),
            job.addWriter(BlockManager.address),
            delegator.upgradeDelegate(JobManager.address),
            // uncomment following for testnet
            // server stakers
            token.transfer('0x1D68ad204637173b2d8656B7972c57dcE41Bc80e', seed),
            token.transfer('0x9FF5085aa345C019cDF2A427B02Bd6746DeF549B', seed),
            token.transfer('0xc4695904751Ad8414c75798d6Ff2579f55e61522', seed),
            token.transfer('0x40d57C3F5c3BAbac3033E2D50AB7C6886A595F46', seed),
            token.transfer('0xa2B827aCF6073f5D9e2350cbf0646Ba2535a5B0C', seed),
            token.transfer(Faucet.address, seed)
        ])
        if (network == "goerli") {
            fs.writeFile('ADDRESSES.md', 'Current contract addresses on Görli testnet: \\\n' +
                'Token: ' + SchellingCoin.address +
                '\\\n Stake Manager: ' + StakeManager.address +
                '\\\n Vote Manager: ' + VoteManager.address +
                '\\\n Block Manager: ' + BlockManager.address +
                '\\\n Job Manager: ' + JobManager.address +
                '\\\n Delegator: ' + Delegator.address,
                function(err) {
                    if (err) throw err
                    console.log('Replaced ADDRESSES.md!')
                })
        }
    })
}
