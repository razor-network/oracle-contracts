/* global contract, it, artifacts, assert, web3 */
/* jshint esversion: 8 */

// // TODO:
// // test same vote values, stakes
// test penalizeEpochs
// const { assertRevert } = require('./helpers/assertRevert')
// let functions = require('./helpers/functions')
// let BlockManager = artifacts.require('./BlockManager.sol')
let StakeManager = artifacts.require('./StakeManager.sol')
let StateManager = artifacts.require('./StateManager.sol')
// let VoteManager = artifacts.require('./VoteManager.sol')
let SimpleToken = artifacts.require('./SimpleToken.sol')
// let Random = artifacts.require('./lib/Random.sol')
let Web3 = require('web3')
// let merkle = require('@razor-network/merkle')

let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})

// / TODO:
// test unstake and withdraw
// test cases where nobody votes, too low stake (1-4)

contract('StakeManager', function (accounts) {
  contract('SimpleToken', async function () {
    // let blockManager = await BlockManager.deployed()
    // let voteManager = await VoteManager.deployed()

    it('shuld be able to initialize', async function () {
      // let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      let sch = await SimpleToken.deployed()
      await stateManager.setEpoch(1)
      await stateManager.setState(0)
      await sch.transfer(accounts[1], 420000, { 'from': accounts[0] })
      await sch.transfer(accounts[2], 19000, { 'from': accounts[0]})
      await sch.transfer(accounts[3], 800000, { 'from': accounts[0]})
      await sch.transfer(accounts[4], 600000, { 'from': accounts[0]})
      await sch.transfer(accounts[5], 2000, { 'from': accounts[0]})
      await sch.transfer(accounts[6], 700000, { 'from': accounts[0]})
      await sch.transfer(accounts[7], 3000, { 'from': accounts[0]})
      await sch.transfer(accounts[8], 4000, { 'from': accounts[0]})
      await sch.transfer(accounts[9], 5000, { 'from': accounts[0]})
      await sch.transfer(accounts[10], 6000, { 'from': accounts[0]})
    })

    it('should be able to stake', async function () {
      // console.log(web3i.eth.accounts)
      let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      console.log('epoch, state', Number(await stateManager.getEpoch()), Number(await stateManager.getState()))
      // console.log('epoch', Number(await stakeManager.wtfEpoch()))
      let sch = await SimpleToken.deployed()
      await sch.approve(stakeManager.address, 420000, { 'from': accounts[1] })
      await stakeManager.stake(1, 420000, { 'from': accounts[1] })
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      // let stakerId = await stakeManager.stakerIds(accounts[1])
      // assert(stakerId.toString() === '1')
      // let numStakers = await stakeManager.numStakers()
      // assert(numStakers.toString() === '1')
      // let staker = await stakeManager.stakers(1)
      // assert(staker.id.toString() === '1')
      // assert(staker.stake.toString() === '420000')
      // let totalStake = await stakeManager.totalStake()
      // assert(totalStake.toString() === '420000')
    })
  })
})
