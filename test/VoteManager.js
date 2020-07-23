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
let SchellingCoin = artifacts.require('./SchellingCoin.sol')
let Random = artifacts.require('./lib/Random.sol')
let Web3 = require('web3')
const BN = require('bn.js')
let merkle = require('@razor-network/merkle')

let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
let numBlocks = 10

// / TODO:
// test unstake and withdraw
// test cases where nobody votes, too low stake (1-4)

contract('VoteManager', function (accounts) {
  contract('SchellingCoin', async function () {
    // let blockManager = await BlockManager.deployed()
    // let voteManager = await VoteManager.deployed()
    // let stakeManager = await StakeManager.deployed()

    it('shuld be able to initialize', async function () {
      let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      let sch = await SchellingCoin.deployed()
      // await stateManager.setEpoch(1)
      // await stateManager.setState(0)
      await functions.mineToNextEpoch()
      await sch.transfer(accounts[3], new BN(423000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[0]})
      await sch.transfer(accounts[4], new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[0]})
      await sch.approve(stakeManager.address, new BN(420000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[3]})
      await sch.approve(stakeManager.address, new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[4]})
      let epoch = await functions.getEpoch()
      await stakeManager.stake(epoch, new BN(420000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[3]})
      await stakeManager.stake(epoch, new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[4]})
    // await sch.transfer(accounts[3], 800000, { 'from': accounts[0]})
    // await sch.transfer(accounts[4], 600000, { 'from': accounts[0]})
    // await sch.transfer(accounts[5], 2000, { 'from': accounts[0]})
    // await sch.transfer(accounts[6], 700000, { 'from': accounts[0]})
    // await sch.transfer(accounts[7], 3000, { 'from': accounts[0]})
    // await sch.transfer(accounts[8], 4000, { 'from': accounts[0]})
    // await sch.transfer(accounts[9], 5000, { 'from': accounts[0]})
    // await sch.transfer(accounts[10], 6000, { 'from': accounts[0]})
    })

    it('should be able to commit', async function () {
      let stakeManager = await StakeManager.deployed()
      let voteManager = await VoteManager.deployed()
      let epoch = await functions.getEpoch()
      // await stateManager.setEpoch(3)
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      let root = tree.root()
      let commitment1 = web3i.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')

      await voteManager.commit(epoch, commitment1, { 'from': accounts[3]})
      // arguments getCommitment => epoch number and stakerId
      let stakerId_acc3 = await stakeManager.stakerIds(accounts[3])
      let commitment2 = await voteManager.getCommitment(epoch, stakerId_acc3)

      assert(commitment1 === commitment2, 'commitment1, commitment2 not equal')

      let votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904]
      let tree2 = merkle('keccak256').sync(votes2)
      let root2 = tree2.root()
      let commitment3 = web3i.utils.soliditySha3(epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment3, { 'from': accounts[4]})
    })

    it('should be able to reveal', async function () {
      let stakeManager = await StakeManager.deployed()
      let voteManager = await VoteManager.deployed()
      let epoch = await functions.getEpoch()
      let stakerId_acc3 = await stakeManager.stakerIds(accounts[3])

      let stakeBefore = Number((await stakeManager.stakers(stakerId_acc3)).stake)

      // await stateManager.setEpoch(3)
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      // console.log(tree.root())
      // await stateManager.setState(1)
      await functions.mineToNextState() // reveal

      // let root = tree.root()
      // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }

      await voteManager.reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[3], { 'from': accounts[3]})
      // arguments getvVote => epoch, stakerId, assetId
      assert(Number((await voteManager.getVote(epoch, stakerId_acc3, 0)).value) === 100, 'Vote not equal to 100')

      let votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904]
      let tree2 = merkle('keccak256').sync(votes2)
      let root2 = tree2.root()
      let proof2 = []
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, root2, votes2, proof2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[4], { 'from': accounts[4]})

      let stakeAfter = Number((await stakeManager.stakers(stakerId_acc3)).stake)
      console.log(stakeBefore , stakeAfter)
      assert(stakeBefore === stakeAfter)
    })

    it('should be able to commit again with correct penalties', async function () {
      let stakeManager = await StakeManager.deployed()
      let voteManager = await VoteManager.deployed()
      let blockManager = await BlockManager.deployed()
      let random = await Random.deployed()
      let epoch = await functions.getEpoch()
      let stakerId_acc3 = await stakeManager.stakerIds(accounts[3])
      let stakerId_acc4 = await stakeManager.stakerIds(accounts[4])
      let staker = await stakeManager.getStaker(stakerId_acc3)
      let numStakers = await stakeManager.getNumStakers()
      let stake = Number(staker.stake)
      let stakerId = Number(staker.id)
      // await stateManager.setEpoch(3)
      let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]
      // console.log('biggestStake', biggestStake)
      let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]
      // console.log('biggestStakerId', biggestStakerId)
      let blockHashes = await random.blockHashes(numBlocks)
      // console.log(' biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
      let iteration = await functions.getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes)

      await functions.mineToNextState() // propose
      await blockManager.propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        [104, 204, 304, 404, 504, 604, 704, 804, 904],
        iteration,
        biggestStakerId,
        { from: accounts[3]})

      let stakeBefore = Number((await stakeManager.stakers(stakerId_acc3)).stake)
      let stakeBefore2 = Number((await stakeManager.stakers(stakerId_acc4)).stake)
      await functions.mineToNextState() // dispute
      await functions.mineToNextState() // commit
      await functions.mineToNextEpoch()
      epoch = await functions.getEpoch()
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      let root = tree.root()
      let commitment1 = web3i.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')

      await voteManager.commit(epoch, commitment1, { 'from': accounts[3]})
      await voteManager.commit(epoch, commitment1, { 'from': accounts[4]})
      // arguments getCommitment => epoch number and stakerId
      let commitment2 = await voteManager.getCommitment(epoch, stakerId_acc3)
      // let commitment2 = await voteManager.getCommitment(epoch, stakerId_acc3)

      assert(commitment1 === commitment2, 'commitment1, commitment2 not equal')

      let stakeAfter = Number((await stakeManager.stakers(stakerId_acc3)).stake)
      let stakeAfter2 = Number((await stakeManager.stakers(stakerId_acc4)).stake)
      console.log(stakeBefore, stakeAfter)
      let penalty = 0
      for (let i = 0; i < votes.length; i++) {
        penalty += Math.floor(stakeBefore2 / 1000)
      }
      console.log(stakeBefore2 - penalty, stakeAfter2)
      assert(stakeBefore + 5 === stakeAfter, 'Error 1')
      assert(stakeBefore2 - penalty === stakeAfter2, 'Error 2')
      let stakeGettingReward = Number(await stakeManager.stakeGettingReward())
      console.log('stakeGettingReward', stakeGettingReward)
      assert(stakeGettingReward === stakeAfter, 'Error 3')
      let rewardPool = Number(await stakeManager.rewardPool())
      console.log('rewardPool', rewardPool)
      assert(rewardPool === penalty, 'Error 4')
    // let votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904]
    // let tree2 = merkle('keccak256').sync(votes2)
    // let root2 = tree2.root()
    // let commitment3 = web3i.utils.soliditySha3(epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
    // await voteManager.commit(epoch, commitment3, { 'from': accounts[4]})
    })

    it('should be able to reveal again with correct rewards', async function () {
      let stakeManager = await StakeManager.deployed()
      let voteManager = await VoteManager.deployed()
      let epoch = await functions.getEpoch()
      let stakerId_acc3 = await stakeManager.stakerIds(accounts[3])
      let stakerId_acc4 = await stakeManager.stakerIds(accounts[4])

      let stakeBefore = Number((await stakeManager.stakers(stakerId_acc3)).stake)
      let stakeBefore2 = Number((await stakeManager.stakers(stakerId_acc4)).stake)

      // await stateManager.setEpoch(3)
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      // console.log(tree.root())
      // await stateManager.setState(1)

      // let root = tree.root()
      // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await functions.mineToNextState() // reveal
      let rewardPool = Number(await stakeManager.rewardPool())

      await voteManager.reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[3], { from: accounts[3]})
      // arguments getvVote => epoch, stakerId, assetId
      assert(Number((await voteManager.getVote(epoch, stakerId_acc3, 0)).value) === 100, 'Vote not equal to 100')

      await voteManager.reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[4], { from: accounts[4]})

      let stakeAfter = Number((await stakeManager.stakers(stakerId_acc3)).stake)
      let stakeAfter2 = Number((await stakeManager.stakers(stakerId_acc4)).stake)
      console.log('stake should have recieved rewardpool', stakeBefore + rewardPool, stakeAfter)
      console.log(stakeBefore2 , stakeAfter2)
      assert(stakeBefore + rewardPool === stakeAfter)
      assert(stakeBefore2 === stakeAfter2)
    })
  })
})
