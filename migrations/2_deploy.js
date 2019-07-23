// var Schelling = artifacts.require('./Schelling.sol')
var Schelling3 = artifacts.require('./Schelling3.sol')
var SimpleToken = artifacts.require('./SimpleToken.sol')
var Constants = artifacts.require('./lib/Constants.sol')
var Random = artifacts.require('./lib/Random.sol')

module.exports = async function (deployer) {
  // let dai = await deployer.deploy(Dai, 'DAI', 'DAI')
  deployer.deploy(SimpleToken).then(async function (toke) {
    // await deployer.deploy(Schelling, toke.address).then(async function (sch) {
    await deployer.deploy(Constants)
    await deployer.link(Constants, Random)
    await deployer.deploy(Random)
    await deployer.link(Random, Schelling3)
    await deployer.link(Constants, Schelling3)
    await deployer.deploy(Schelling3, toke.address).then(async function (sch3) {
          // let tx = await toke.addMinter(sch.address)
      tx = await toke.addMinter(sch3.address)

          // console.log(tx)
        // })
    })
  })
}
