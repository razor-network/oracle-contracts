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

// todo remove deployer write access
module.exports = async function (deployer) {
  // let dai = await deployer.deploy(Dai, 'DAI', 'DAI')

  deployer.then(async () => {
    await deployer.deploy(SimpleToken)
    await deployer.deploy(Constants)
    await deployer.link(Constants, [Random, VoteManager, StakeManager, BlockManager, StateManager])
    await deployer.deploy(Structs)
    await deployer.link(Structs, [StakeManager, StakeManager, BlockManager])
    await deployer.deploy(Random)
    await deployer.link(Random, BlockManager)
    await deployer.deploy(VoteManager)
    await deployer.deploy(StakeManager)
    await deployer.deploy(BlockManager)
    await deployer.deploy(StateManager)
    let token = await SimpleToken.deployed()
    let block = await BlockManager.deployed()
    let vote = await VoteManager.deployed()
    let stake = await StakeManager.deployed()
    // let state = await StateManager.deployed()
    return Promise.all([
      token.addMinter(StakeManager.address),
      block.init(StakeManager.address, StateManager.address, VoteManager.address),
      vote.init(StakeManager.address, StateManager.address, BlockManager.address),
      stake.init(SimpleToken.address, VoteManager.address, BlockManager.address, StateManager.address),
      block.addWriter(VoteManager.address),
      stake.addWriter(VoteManager.address)
      // vote.addWriter(StakeManager.address)
      // console.log(await stake.blockManager.call())
    ])
  })
}
