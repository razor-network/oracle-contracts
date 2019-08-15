/* global contract, it, artifacts, assert, web3 */
/* jshint esversion: 8 */

// // TODO:
// // test same vote values, stakes
// test penalizeEpochs
const { assertRevert } = require('./helpers/assertRevert')
let functions = require('./helpers/functions')
let BlockManager = artifacts.require('./BlockManager.sol')
let StakeManager = artifacts.require('./StakeManager.sol')
let StateManager = artifacts.require('./StateManager.sol')
let VoteManager = artifacts.require('./VoteManager.sol')
let SimpleToken = artifacts.require('./SimpleToken.sol')
let Random = artifacts.require('./lib/Random.sol')
let Web3 = require('web3')
let merkle = require('@razor-network/merkle')

let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
let numBlocks = 10

// / TODO:
// test unstake and withdraw
// test cases where nobody votes, too low stake (1-4)

contract('StakeManager', function (accounts) {
  contract('SimpleToken', async function () {
    // let blockManager = await BlockManager.deployed()
    // let voteManager = await VoteManager.deployed()
    // let stakeManager = await StakeManager.deployed()

    it('shuld be able to initialize', async function () {
      // let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      let sch = await SimpleToken.deployed()
      await stateManager.setEpoch(1)
      await stateManager.setState(0)
      await sch.transfer(accounts[1], 423000, { 'from': accounts[0] })
      await sch.transfer(accounts[2], 19000, { 'from': accounts[0] })
      // await sch.transfer(accounts[3], 800000, { 'from': accounts[0]})
      // await sch.transfer(accounts[4], 600000, { 'from': accounts[0]})
      // await sch.transfer(accounts[5], 2000, { 'from': accounts[0]})
      // await sch.transfer(accounts[6], 700000, { 'from': accounts[0]})
      // await sch.transfer(accounts[7], 3000, { 'from': accounts[0]})
      // await sch.transfer(accounts[8], 4000, { 'from': accounts[0]})
      // await sch.transfer(accounts[9], 5000, { 'from': accounts[0]})
      // await sch.transfer(accounts[10], 6000, { 'from': accounts[0]})
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

      let stakerId = await stakeManager.stakerIds(accounts[1])
      assert(stakerId.toString() === '1')
      let numStakers = await stakeManager.numStakers()
      assert(numStakers.toString() === '1')
      let staker = await stakeManager.stakers(1)
      assert(staker.id.toString() === '1')
      assert(staker.stake.toString() === '420000')
      // let totalStake = await stakeManager.totalStake()
      // assert(totalStake.toString() === '420000')
    })

    it('should handle second staker correctly', async function () {
      let sch = await SimpleToken.deployed()
      let stakeManager = await StakeManager.deployed()

      await sch.approve(stakeManager.address, 19000, { 'from': accounts[2] })
      await stakeManager.stake(1, 19000, { 'from': accounts[2] })

      let stakerId = await stakeManager.stakerIds(accounts[2])
      assert(stakerId.toString() === '2')
      let numStakers = await stakeManager.numStakers()
      assert(numStakers.toString() === '2')
      let staker = await stakeManager.stakers(2)
      assert(staker.id.toString() === '2')
      assert(staker.stake.toString() === '19000')
    })

    it('getters should work as expected', async function () {
      // console.log(web3i.eth.accounts)
      let stakeManager = await StakeManager.deployed()
      // let stateManager = await StateManager.deployed()
      // console.log('epoch, state', Number(await stateManager.getEpoch()), Number(await stateManager.getState()))
      // console.log('epoch', Number(await stakeManager.wtfEpoch()))
      // let sch = await SimpleToken.deployed()
      // await sch.approve(stakeManager.address, 420000, { 'from': accounts[1] })
      // await stakeManager.stake(1, 420000, { 'from': accounts[1] })
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      let stakerId = await stakeManager.stakerIds(accounts[1])
      assert(stakerId.toString() === String(await stakeManager.getStakerId(accounts[1])))
      let numStakers = await stakeManager.numStakers()
      assert(numStakers.toString() === String(await stakeManager.getNumStakers()))
      let staker = await stakeManager.stakers(1)
      let staker2 = await stakeManager.getStaker(1)
      assert(staker.id.toString() === String(staker2.id))
      assert(staker.stake.toString() === String(staker2.stake))
      // let totalStake = await stakeManager.totalStake()
      // assert(totalStake.toString() === '420000')
    })

    it('should be able to increase stake', async function () {
      let stakeManager = await StakeManager.deployed()
      let sch = await SimpleToken.deployed()
      await sch.approve(stakeManager.address, 3000, { 'from': accounts[1] })
      await stakeManager.stake(1, 3000, { 'from': accounts[1] })
      let staker = await stakeManager.getStaker(1)
      assert(Number(staker.stake) === 423000)
    })

    it('should not be able to unstake before unstake lock period', async function () {
      let stakeManager = await StakeManager.deployed()
      await assertRevert(stakeManager.unstake(1, { 'from': accounts[1] }))
      // let staker = await stakeManager.getStaker(1)
      // assert(Number(staker.stake) === 423000)
    })

    it('should be able to unstake after unstake lock period', async function () {
      let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      await stateManager.setEpoch(2)
      await stakeManager.unstake(2, { 'from': accounts[1] })
      let staker = await stakeManager.getStaker(1)
      assert(Number(staker.unstakeAfter) === 0, "UnstakeAfter should be zero")
      assert(Number(staker.withdrawAfter) === 3, "withdrawAfter does not match")
    })

    it('should not be able to withdraw before withdraw lock period', async function () {
      let stakeManager = await StakeManager.deployed()
      await assertRevert(stakeManager.withdraw(2, { 'from': accounts[1] }))
      let staker = await stakeManager.getStaker(1)
      assert(Number(staker.stake) === 423000, "Stake should not change")
    })

    it('should not be able to withdraw after withdraw lock period if didnt reveal in last epoch', async function () {
      let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      await stateManager.setEpoch(3)
      await assertRevert(stakeManager.withdraw(3, { 'from': accounts[1] }))
      let staker = await stakeManager.getStaker(1)
      assert(Number(staker.stake) == 423000, "Stake should not change");
    })

    it('should be able to withdraw after withdraw lock period if revealed in last epoch', async function () {
      let stateManager = await StateManager.deployed()
      let stakeManager = await StakeManager.deployed()

      let voteManager = await VoteManager.deployed()
      let sch = await SimpleToken.deployed()

      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      let root = tree.root()

      // Here 3 => Epoch Number, root => Merkle root, 0x72... => random secret
      let commitment1 = web3i.utils.soliditySha3(3, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(3, commitment1, { 'from': accounts[1] })

      await stateManager.setState(1)

      // let root = tree.root()
      // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await voteManager.reveal(3, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[1], { 'from': accounts[1] })

      // await stateManager.setState(2)
      // let staker = await stakeManager.getStaker(1)
      // let numStakers = await stakeManager.getNumStakers()
      // let stake = Number(staker.stake)
      // let stakerId = Number(staker.id)
      // console.log('stake', stake)
      // let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]
      // console.log('biggestStake', biggestStake)
      // let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]
      // console.log('biggestStakerId', biggestStakerId)
      // let blockHashes = await random.blockHashes(numBlocks)
      // console.log(' biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
      // let iteration = await functions.getIteration(stakeManager, random, biggestStake, stake, stakerId, numStakers, blockHashes)
      // console.log('iteration1b', iteration)
      // // await blockManager.propose(3, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[1] })
      //
      await stateManager.setEpoch(4)
      await stateManager.setState(0)
      // commitment1 = web3i.utils.soliditySha3(4, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      // await voteManager.commit(4, commitment1, { 'from': accounts[2] })
      let staker = await stakeManager.getStaker(1)
      // console.log(Number(await staker.stake))
      // console.log(Number(await staker.epochLastRevealed))
      await (stakeManager.withdraw(4, { 'from': accounts[1] }))
      staker = await stakeManager.getStaker(1)
      // console.log(Number(await staker.stake))
      assert(Number(staker.stake) === 0)
      // console.log('bal', Number(await sch.balanceOf(accounts[1])))
      assert(Number(await sch.balanceOf(accounts[1])) === 423000)
    })
  })
})
