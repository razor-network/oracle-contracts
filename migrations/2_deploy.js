/* global contract, it, artifacts, assert, web3 */
var SimpleToken = artifacts.require('./SimpleToken.sol')
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

// todo remove deployer write access
module.exports = async function (deployer) {
// let dai = await deployer.deploy(Dai, 'DAI', 'DAI')

  deployer.then(async () => {
    await deployer.deploy(SimpleToken)
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
    let token = await SimpleToken.deployed()
    let block = await BlockManager.deployed()
    let vote = await VoteManager.deployed()
    let stake = await StakeManager.deployed()
    let job = await JobManager.deployed()
    // let state = await StateManager.deployed()
    return Promise.all([
      token.addMinter(StakeManager.address),
      block.init(StakeManager.address, StateManager.address, VoteManager.address, JobManager.address),
      vote.init(StakeManager.address, StateManager.address, BlockManager.address),
      stake.init(SimpleToken.address, VoteManager.address, BlockManager.address, StateManager.address),
      block.addWriter(VoteManager.address),
      stake.addWriter(VoteManager.address),
      stake.addWriter(BlockManager.address),
      job.addWriter(BlockManager.address),
      // uncomment following for testnet
      token.transfer('0x09633cEE3db9BB662C35Bd32aaA5579e3d2aac3c', 1000000),
      token.transfer('0xc807af42c30b53aA9AC20E298840D2d4e4d3f043', 1000000),
      token.transfer('0xeF9058db9F395eefE3D2b2869C739a0770586018', 1000000),
      token.transfer('0x0519cA2C7B556fa3699107EC8348cA2573e90A75', 1000000),
      token.transfer('0x782672281D06E4c1a3e45E80F9bB4CD028BfBBa8', 1000000)

      // vote.addWriter(StakeManager.address)
      // console.log(await stake.blockManager.call())
    ])
  })
}
