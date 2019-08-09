// var Razor = artifacts.require('./Razor.sol')
var SimpleToken = artifacts.require('./SimpleToken.sol')
var Constants = artifacts.require('./lib/Constants.sol')
var Utils = artifacts.require('./lib/Utils.sol')
var Random = artifacts.require('./lib/Random.sol')
var Structs = artifacts.require('./lib/Structs.sol')
// var WriterRole = artifacts.require('./WriterRole.sol')
var BlockManager = artifacts.require('./BlockManager.sol')
var StakeManager = artifacts.require('./StakeManager.sol')
var VoteManager = artifacts.require('./VoteManager.sol')

module.exports = async function (deployer) {
  // let dai = await deployer.deploy(Dai, 'DAI', 'DAI')
  deployer.deploy(SimpleToken).then(async function (toke) {
    await deployer.deploy(Constants)
    await deployer.deploy(Structs)
    // await deployer.link(Constants, Utils)
    // await deployer.link(Constants, Schelling3)
    await deployer.link(Constants, Random)
    await deployer.deploy(Random)
    await deployer.link(Structs, StakeManager)
    deployer.deploy(StakeManager).then(async function (stake) {
      deployer.deploy(VoteManager).then(async function (vote) {
        await deployer.link(Random, BlockManager)
        await deployer.link(Structs, BlockManager)
        await deployer.link(Constants, BlockManager)
        deployer.deploy(BlockManager).then(async function (block) {
      // await deployer.link(Random, StakeManager)
      // await deployer.link(Structs, StakeManager)
      // await deployer.link(Constants, StakeManager)
        // await deployer.link(Random, VoteManager)
        // await deployer.link(Structs, VoteManager)
        // await deployer.link(Constants, VoteManager)
          await toke.addMinter(stake.address)
          await block.init(stake.address, vote.address)
          await stake.init(toke.address, vote.address, block.address)
          await vote.init(stake.address, block.address)
        })
    // deployer.deploy(StakeManager).then(async function (stake) {
    // deployer.deploy(VoteManager).then(async function (vote) {
    // await deployer.deploy(BlockManager)
    // await deployer.deploy(StakeManager)
    // await deployer.deploy(VoteManager)
    // deployer.deploy(Blocks).then(async function (blocks) {
    // await deployer.deploy(Schelling, toke.address).then(async function (sch) {
    // await deployer.link(Utils, Schelling4)
    // await deployer.link(SimpleToken, Schelling4)
    // await deployer.link(Random, Blocks)
    // await deployer.link(Constants, Blocks)
    // deployer.deploy(Utils).then(async function (utils) {
    // await deployer.deploy(Razor).then(async function (razor) {
    // await toke.addMinter(stake.address)
    // await block.transferOwnership(razor.address)
    // await stake.transferOwnership(razor.address)
    // await vote.transferOwnership(razor.address)

    // await deployer.deploy(Schelling4)

    // console.log(tx)
    // })
    // })
    // })
    // })
      })
    })
  })
}
