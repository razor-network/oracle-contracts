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
module.exports = async function (deployer) {
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
      token.transfer('0x3Dd6cA6859776584d2Ec714746B5A3eFF429576b', seed),
      token.transfer('0xEa416170dfAb0eBD7cebE2E28E042027AB96732d', seed),
      token.transfer('0xeA279c981ce9146831BA09e6467683D81A5135a2', seed),
      token.transfer('0x43F826321e326F571a31Ba9f2061b06A868bF350', seed),
      token.transfer('0xF80a267A160A0604C1Fa47d7aF5CF978BDa54B41', seed),
      token.transfer(Faucet.address, seed)
    ])
    fs.writeFile('ADDRESSES.md', 'Current contract addresses on Görli testnet: \\\n' +
    'Token: ' + SchellingCoin.address +
    '\\\n Stake Manager: ' + StakeManager.address +
    '\\\n Vote Manager: ' + VoteManager.address +
    '\\\n Block Manager: ' + BlockManager.address +
    '\\\n Job Manager: ' + JobManager.address +
    '\\\n Delegator: ' + Delegator.address,
      function (err) {
        if (err) throw err
        console.log('Replaced ADDRESSES.md!')
      })
  })
}
