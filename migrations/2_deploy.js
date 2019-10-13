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
    return Promise.all([
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
      token.transfer('0x09633cEE3db9BB662C35Bd32aaA5579e3d2aac3c', seed),
      token.transfer('0xc807af42c30b53aA9AC20E298840D2d4e4d3f043', seed),
      token.transfer('0xeF9058db9F395eefE3D2b2869C739a0770586018', seed),
      token.transfer('0x0519cA2C7B556fa3699107EC8348cA2573e90A75', seed),
      token.transfer('0x782672281D06E4c1a3e45E80F9bB4CD028BfBBa8', seed),
      token.transfer('0xe0431d3B7F453D008dFa92947F31Fba8969C0015', seed),
      token.transfer('0x04b8129d730ad55C3DA2f8BF8e0Ce1a6D118ccd6', seed),
      token.transfer('0x1Dc0b62436A1db4E28743E66c8bcF02D8103Ad8c', seed),
      token.transfer('0x21D7ACbcAEa5dD43e28c41b37A1296d6aAa4D912', seed),
      token.transfer('0x50B2740e437410f30c2f679C06357eF1d76cedAE', seed),
      token.transfer('0x484D0e98f78550DBBCf95D49573F77B4Ab50a38C', seed),
      token.transfer('0xa186900e0e24C5a5943Ac10dF71B574debfFC74b', seed),
      token.transfer(Faucet.address, seed)

    // vote.addWriter(StakeManager.address)
    // console.log(await stake.blockManager.call())
    ])
  })
}
