// var Schelling = artifacts.require('./Schelling.sol')
var Schelling2 = artifacts.require('./Schelling2.sol')
var SimpleToken = artifacts.require('./SimpleToken.sol')

module.exports = async function (deployer) {
  // let dai = await deployer.deploy(Dai, 'DAI', 'DAI')
  deployer.deploy(SimpleToken).then(async function (toke) {
    // await deployer.deploy(Schelling, toke.address).then(async function (sch) {
    await deployer.deploy(Schelling2, toke.address).then(async function (sch2) {
          // let tx = await toke.addMinter(sch.address)
      tx = await toke.addMinter(sch2.address)
          // console.log(tx)
        // })
    })
  })
}
