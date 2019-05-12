var Schelling = artifacts.require('./Schelling.sol')
var SimpleToken = artifacts.require('./SimpleToken.sol')

module.exports = async function (deployer) {
  // let dai = await deployer.deploy(Dai, 'DAI', 'DAI')
  deployer.deploy(SimpleToken).then(async function (toke) {
    await deployer.deploy(Schelling, toke.address).then(async function (sch) {
      let tx = await toke.addMinter(sch.address)
      // console.log(tx)
    })
  })
}
