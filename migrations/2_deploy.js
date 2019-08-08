// var Schelling = artifacts.require('./Schelling.sol')
var Schelling4 = artifacts.require('./Schelling4.sol')
var SimpleToken = artifacts.require('./SimpleToken.sol')
// var Constants = artifacts.require('./lib/Constants.sol')
var Utils = artifacts.require('./lib/Utils.sol')
// var Random = artifacts.require('./lib/Random.sol')
// var Blocks = artifacts.require('./Blocks.sol')

module.exports = async function (deployer) {
  // let dai = await deployer.deploy(Dai, 'DAI', 'DAI')
  deployer.deploy(SimpleToken).then(async function (toke) {
    // await deployer.deploy(Constants)
    // await deployer.link(Constants, Utils)
    // await deployer.link(Constants, Schelling3)
    // await deployer.link(Constants, Random)
    // await deployer.deploy(Random)
    // await deployer.link(Random, Schelling3)
    // deployer.deploy(Blocks).then(async function (blocks) {
    // await deployer.deploy(Schelling, toke.address).then(async function (sch) {
    // await deployer.link(Utils, Schelling4)
    // await deployer.link(SimpleToken, Schelling4)
    // await deployer.link(Random, Blocks)
    // await deployer.link(Constants, Blocks)
    await deployer.deploy(Utils).then(async function (utils) {
      await deployer.deploy(Schelling4).then(async function (sch) {
        await toke.addMinter(sch.address)
        // let tx = await toke.addMinter(sch3.address)
        // await deployer.deploy(Schelling4)

        // console.log(tx)
        // })
      })
    })
  })
}
