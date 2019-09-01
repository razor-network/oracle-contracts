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

contract('BlockManager', function (accounts) {
  contract('SimpleToken', async function () {
    // let blockManager = await BlockManager.deployed()
    // let voteManager = await VoteManager.deployed()
    // let stakeManager = await StakeManager.deployed()

    it('shuld be able to initialize', async function () {
      let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      let sch = await SimpleToken.deployed()

      let voteManager = await VoteManager.deployed()
      // await stateManager.setEpoch(1)
      // await stateManager.setState(0)
      await functions.mineToNextEpoch()
      await sch.transfer(accounts[5], 423000, { 'from': accounts[0] })
      await sch.transfer(accounts[6], 19000, { 'from': accounts[0] })
      await sch.approve(stakeManager.address, 420000, { 'from': accounts[5] })
      let epoch = await functions.getEpoch()
      await stakeManager.stake(epoch, 420000, { 'from': accounts[5] })
      // await sch.transfer(accounts[3], 800000, { 'from': accounts[0]})
      // await sch.transfer(accounts[4], 600000, { 'from': accounts[0]})
      // await sch.transfer(accounts[5], 2000, { 'from': accounts[0]})
      // await sch.transfer(accounts[6], 700000, { 'from': accounts[0]})
      // await sch.transfer(accounts[7], 3000, { 'from': accounts[0]})
      // await sch.transfer(accounts[8], 4000, { 'from': accounts[0]})
      // await sch.transfer(accounts[9], 5000, { 'from': accounts[0]})
      // await sch.transfer(accounts[10], 6000, { 'from': accounts[0]})

              // await stateManager.setEpoch(3)
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
              // console.log(tree.root())
      let root = tree.root()

              // console.log(await blockManager.isWriter(VoteManager.address))
      let commitment1 = web3i.utils.soliditySha3(1, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment1, { 'from': accounts[5] })

      // await stateManager.setState(1)
      await functions.mineToNextState()

              // let root = tree.root()
              // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree.root(), votes, proof,
                '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
                accounts[5], { 'from': accounts[5] })
    })

    it('should be able to propose', async function () {
      let stateManager = await StateManager.deployed()
      let stakeManager = await StakeManager.deployed()

      let blockManager = await BlockManager.deployed()
      let random = await Random.deployed()
      let epoch = await functions.getEpoch()
      // await stateManager.setState(2)
      await functions.mineToNextState()
      let stakerId_acc5 = await stakeManager.stakerIds(accounts[5])
      let staker = await stakeManager.getStaker(stakerId_acc5)
      let numStakers = await stakeManager.getNumStakers()
      let stake = Number(staker.stake)
      let stakerId = Number(staker.id)
      // console.log('stake', stake)
      let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]
      // console.log('biggestStake', biggestStake)
      let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]
      // console.log('biggestStakerId', biggestStakerId)
      let blockHashes = await random.blockHashes(numBlocks)
      // console.log(' biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
      let iteration = await functions.getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes)
      // console.log('iteration1b', iteration)
      await blockManager.propose(epoch, [100, 201, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[5] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0)
      console.log(Number(proposedBlock.proposerId) === 1)
    })

    it('should be able to dispute', async function () {
      let stateManager = await StateManager.deployed()

      let voteManager = await VoteManager.deployed()
      let blockManager = await BlockManager.deployed()
      // let random = await Random.deployed()
      // await stateManager.setState(3, { 'from': accounts[20] })
      await functions.mineToNextState()
      let epoch = await functions.getEpoch()
      // TODO check acutal weights from con tract
      let sortedVotes = [200]
      let weights = [420000]

      let totalStakeRevealed = Number(await voteManager.getTotalStakeRevealed(1, 1))
      let medianWeight = totalStakeRevealed / 2
      let i = 0
      let median = 0
      let weight = 0
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i]
        if (weight > medianWeight && median === 0) median = sortedVotes[i]
      }
      // //console.log('totalStakeRevealed', totalStakeRevealed)
      // //console.log('medianWeight', medianWeight)
      // //console.log('twoFiveWeight', twoFiveWeight)
      // //console.log('sevenFiveWeight', sevenFiveWeight)
      // //console.log('twofive', twoFive)
      // //console.log('sevenFive', sevenFive)
      // //console.log('---------------------------')

      await blockManager.giveSorted(epoch, 1, sortedVotes, { 'from': accounts[20] })
      // console.log('median', median)
      // // console.log('Number(await voteManager.getTotalStakeRevealed(1, 0))', Number(await voteManager.getTotalStakeRevealed(1, 0)))
      // // console.log('accweight', Number((await blockManager.disputes(1, accounts[20])).accWeight))
      // // console.log('median contract', Number((await blockManager.disputes(1, accounts[20])).median))
      assert(Number((await blockManager.disputes(epoch, accounts[20])).assetId) === 1, 'assetId not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).median) === median, 'median not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).lastVisited) === sortedVotes[sortedVotes.length - 1], 'lastVisited not matching')
    //      await blockManager.finalizeDispute(1, 0)
    })

    it('should be able to finalize Dispute', async function () {
      let blockManager = await BlockManager.deployed()
      let stakeManager = await StakeManager.deployed()
      let sch = await SimpleToken.deployed()
      let epoch = await functions.getEpoch()
      await blockManager.finalizeDispute(epoch, 0, { 'from': accounts[20] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0)
      assert((await proposedBlock.valid) === false)
      let stakerId_acc5 = await stakeManager.stakerIds(accounts[5])
      assert(Number((await stakeManager.getStaker(stakerId_acc5)).stake) === 0)
      assert(Number(await sch.balanceOf(accounts[20])) === 210000)
    })
  })
})
