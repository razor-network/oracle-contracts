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
let merkle = require('@razor-network/merkle')
const BN = require('bn.js')
const { mineToNextState } = require('./helpers/functions')
let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
let numBlocks = 10



contract('BlockManager', function (accounts) {
  contract('SchellingCoin', async function () {

    it('should be able to initialize', async function () {
      let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      let sch = await SchellingCoin.deployed()

      let voteManager = await VoteManager.deployed()

      await functions.mineToNextEpoch()
      await sch.transfer(accounts[5], new BN(423000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[0] })
      await sch.transfer(accounts[6], new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[0] })

      await sch.approve(stakeManager.address, new BN(420000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[5] })
      let epoch = await functions.getEpoch()
      await stakeManager.stake(epoch, new BN(420000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[5] })

      await sch.approve(stakeManager.address, new BN(18000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[6] })
      await stakeManager.stake(epoch, new BN(18000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[6] })

      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)

      let root = tree.root()
      let commitment1 = web3i.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment1, { 'from': accounts[5] })

      let votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree2 = merkle('keccak256').sync(votes2)

      let root2 = tree2.root()
      let commitment2 = web3i.utils.soliditySha3(epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment2, { 'from': accounts[6] })


      await functions.mineToNextState()

      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[5], { 'from': accounts[5] })

      let proof2 = []
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree2.root(), votes2, proof2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[6], { 'from': accounts[6] })
    })

    it('should be able to propose', async function () {
      let stateManager = await StateManager.deployed()
      let stakeManager = await StakeManager.deployed()

      let blockManager = await BlockManager.deployed()
      let random = await Random.deployed()
      let epoch = await functions.getEpoch()

      await functions.mineToNextState()
      let stakerId_acc5 = await stakeManager.stakerIds(accounts[5])
      let staker = await stakeManager.getStaker(stakerId_acc5)
      let numStakers = await stakeManager.getNumStakers()
      let stake = Number(staker.stake)
      let stakerId = Number(staker.id)

      let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]

      let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]

      let blockHashes = await random.blockHashes(numBlocks)

      let iteration = await functions.getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes)


      await blockManager.propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        [99, 199, 299, 399, 499, 599, 699, 799, 899],
        [101, 201, 301, 401, 501, 601, 701, 801, 901],
        iteration,
        biggestStakerId,
        { 'from': accounts[5] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0)
      assert(Number(proposedBlock.proposerId) === 1, "incorrect proposalID")
    })

    it('Number of proposals should be 1', async function () {
      let blockManager = await BlockManager.deployed()
      let epoch = await functions.getEpoch()

      let nblocks = await blockManager.getNumProposedBlocks(epoch)

      assert(Number(nblocks) === 1, "Only one block has been proposed till now. Incorrect Answer")
    })

    it('should allow another proposals', async function () {
      let voteManager = await VoteManager.deployed()
      let stateManager = await StateManager.deployed()
      let stakeManager = await StakeManager.deployed()
      let blockManager = await BlockManager.deployed()
      let random = await Random.deployed()
      let epoch = await functions.getEpoch()

      let stakerId_acc6 = await stakeManager.stakerIds(accounts[6])
      let staker = await stakeManager.getStaker(stakerId_acc6)
      let numStakers = await stakeManager.getNumStakers()
      let stake = Number(staker.stake)
      let stakerId = Number(staker.id)

      let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]
      let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]
      let blockHashes = await random.blockHashes(numBlocks)

      let iteration = await functions.getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes)

      await blockManager.propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        [99, 199, 299, 399, 499, 599, 699, 799, 899],
        [101, 201, 301, 401, 501, 601, 701, 801, 901],
        iteration,
        biggestStakerId,
        { 'from': accounts[6] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 1)
      assert(Number(proposedBlock.proposerId) === 2)
    })

    it('Number of proposals should be 2', async function () {
      let blockManager = await BlockManager.deployed()
      let epoch = await functions.getEpoch()

      let nblocks = await blockManager.getNumProposedBlocks(epoch)

      assert(Number(nblocks) === 2, "Only one block has been proposed till now. Incorrect Answer")
    })

    it('should be able to dispute', async function () {
      let stateManager = await StateManager.deployed()

      let voteManager = await VoteManager.deployed()
      let blockManager = await BlockManager.deployed()

      await functions.mineToNextState()
      let epoch = await functions.getEpoch()

      let sortedVotes = [200]
      let weights = [new BN(420000).mul(new BN(10).pow(new BN('18'))), new BN(18000).mul(new BN(10).pow(new BN('18')))]

      let totalStakeRevealed = Number(await voteManager.getTotalStakeRevealed(epoch, 1))
      let medianWeight = Math.floor(totalStakeRevealed / 2)
      let lowerCutoffWeight = Math.floor(totalStakeRevealed / 4)
      let higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4)
      let i = 0
      let median = 0
      let lowerCutoff = 0
      let higherCutoff = 0
      let weight = 0
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i]
        if (weight > medianWeight && median === 0) median = sortedVotes[i]
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes[i]
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes[i]
      }

      console.log('medianWeight', medianWeight)
      console.log('twoFiveWeight', lowerCutoffWeight)
      console.log('sevenFiveWeight', higherCutoffWeight)
      console.log('twofive', lowerCutoff)
      console.log('sevenFive', higherCutoff)


      await blockManager.giveSorted(epoch, 1, sortedVotes, { 'from': accounts[20] })

      assert(Number((await blockManager.disputes(epoch, accounts[20])).assetId) === 1, 'assetId not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).median) === median, 'median not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).lastVisited) === sortedVotes[sortedVotes.length - 1], 'lastVisited not matching')


    })

    it('should be able to finalize Dispute', async function () {
      let blockManager = await BlockManager.deployed()
      let stakeManager = await StakeManager.deployed()
      let sch = await SchellingCoin.deployed()
      let epoch = await functions.getEpoch()
      await blockManager.finalizeDispute(epoch, 0, { 'from': accounts[20] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0)
      assert((await proposedBlock.valid) === false)
      let stakerId_acc5 = await stakeManager.stakerIds(accounts[5])
      assert(Number((await stakeManager.getStaker(stakerId_acc5)).stake) === 0)
      assert(Number(await sch.balanceOf(accounts[20])) === Number(new BN(210000).mul(new BN(10).pow(new BN('18')))))
    })

    it('block proposed by account 6 should be confirmed', async function () {
      let voteManager = await VoteManager.deployed()
      let blockManager = await BlockManager.deployed()
      let stakeManager = await StakeManager.deployed()
      let sch = await SchellingCoin.deployed()

      await functions.mineToNextState()
      await sch.transfer(accounts[7], new BN(20000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[0] })


      let epoch = await functions.getEpoch()

      await sch.approve(stakeManager.address, new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[7] })
      await stakeManager.stake(epoch, new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[7] })

      let votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000]
      let tree = merkle('keccak256').sync(votes)

      let root = tree.root()
      let commitment1 = web3i.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment1, { 'from': accounts[6] })

      let votes2 = [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010]
      let tree2 = merkle('keccak256').sync(votes2)

      let root2 = tree2.root()
      let commitment2 = web3i.utils.soliditySha3(epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')

      await voteManager.commit(epoch, commitment2, { 'from': accounts[7] })

      assert(Number((await blockManager.getBlock(epoch - 1)).proposerId) === Number(await stakeManager.stakerIds(accounts[6])), `${await stakeManager.stakerIds(accounts[6])} ID is the one who proposed the block `)

      await functions.mineToNextState()

      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[6], { 'from': accounts[6] })

      let proof2 = []
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree2.root(), votes2, proof2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[7], { 'from': accounts[7] })
    })


    it('all blocks being disputed', async function () {
      let voteManager = await VoteManager.deployed()
      let stateManager = await StateManager.deployed()
      let stakeManager = await StakeManager.deployed()
      let blockManager = await BlockManager.deployed()
      let random = await Random.deployed()
      let epoch = await functions.getEpoch()

      let stakerId_acc6 = await stakeManager.stakerIds(accounts[6])
      let staker_6 = await stakeManager.getStaker(stakerId_acc6)
      let stake_6 = Number(staker_6.stake)
      let stakerId_6 = Number(staker_6.id)

      let numStakers = await stakeManager.getNumStakers()
      let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]
      let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]
      let blockHashes = await random.blockHashes(numBlocks)

      let iteration_6 = await functions.getIteration(random, biggestStake, stake_6, stakerId_6, numStakers, blockHashes)

      let stakerId_acc7 = await stakeManager.stakerIds(accounts[7])
      let staker_7 = await stakeManager.getStaker(stakerId_acc7)
      let stake_7 = Number(staker_7.stake)
      let stakerId_7 = Number(staker_7.id)

      let iteration_7 = await functions.getIteration(random, biggestStake, stake_7, stakerId_7, numStakers, blockHashes)

      await functions.mineToNextState()

      await blockManager.propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1000, 2001, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010],
        iteration_6,
        biggestStakerId,
        { 'from': accounts[6] })

      await blockManager.propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1000, 2000, 3001, 4000, 5000, 6000, 7000, 8000, 9000],
        [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010],
        iteration_7,
        biggestStakerId,
        { 'from': accounts[7] })

      await functions.mineToNextState()

      let sortedVotes_1 = [2000, 2010]
      let sortedVotes_2 = [3000, 3010]
      let weights = [new BN(18000).mul(new BN(10).pow(new BN('18'))), new BN(19000).mul(new BN(10).pow(new BN('18')))]

      let totalStakeRevealed = Number(await voteManager.getTotalStakeRevealed(epoch, 1))
      let medianWeight = Math.floor(totalStakeRevealed / 2)
      let lowerCutoffWeight = Math.floor(totalStakeRevealed / 4)
      let higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4)
      let i = 0
      let median = 0
      let lowerCutoff = 0
      let higherCutoff = 0
      let weight = 0
      for (i = 0; i < sortedVotes_1.length; i++) {
        weight += weights[i]
        if (weight > medianWeight && median === 0) median = sortedVotes_1[i]
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes_1[i]
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes_1[i]
      }

      console.log('medianWeight', medianWeight)
      console.log('twoFiveWeight', lowerCutoffWeight)
      console.log('sevenFiveWeight', higherCutoffWeight)
      console.log('twofive', lowerCutoff)
      console.log('sevenFive', higherCutoff)


      await blockManager.giveSorted(epoch, 1, sortedVotes_1, { 'from': accounts[20] })

      assert(Number((await blockManager.disputes(epoch, accounts[20])).assetId) === 1, 'assetId not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).median) === median, 'median not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).lastVisited) === sortedVotes_1[sortedVotes_1.length - 1], 'lastVisited not matching')

      await blockManager.finalizeDispute(epoch, 0, { 'from': accounts[20] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0)
      assert((await proposedBlock.valid) === false)


      totalStakeRevealed = Number(await voteManager.getTotalStakeRevealed(epoch, 2))
      medianWeight = Math.floor(totalStakeRevealed / 2)
      lowerCutoffWeight = Math.floor(totalStakeRevealed / 4)
      higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4)
      i = 0
      median = 0
      lowerCutoff = 0
      higherCutoff = 0
      weight = 0
      for (i = 0; i < sortedVotes_2.length; i++) {
        weight += weights[i]
        if (weight > medianWeight && median === 0) median = sortedVotes_2[i]
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes_2[i]
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes_2[i]
      }

      console.log('medianWeight', medianWeight)
      console.log('twoFiveWeight', lowerCutoffWeight)
      console.log('sevenFiveWeight', higherCutoffWeight)
      console.log('twofive', lowerCutoff)
      console.log('sevenFive', higherCutoff)

      await blockManager.giveSorted(epoch, 2, sortedVotes_2, { 'from': accounts[15] })

      assert(Number((await blockManager.disputes(epoch, accounts[15])).assetId) === 2, 'assetId not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[15])).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[15])).median) === median, 'median not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[15])).lastVisited) === sortedVotes_2[sortedVotes_2.length - 1], 'lastVisited not matching')

      await blockManager.finalizeDispute(epoch, 1, { 'from': accounts[15] })
      proposedBlock = await blockManager.proposedBlocks(epoch, 1)
      assert((await proposedBlock.valid) === false)
    })

    it('no block should be confirmed in the previous epoch', async function () {

      let voteManager = await VoteManager.deployed()
      let blockManager = await BlockManager.deployed()
      let stakeManager = await StakeManager.deployed()
      let sch = await SchellingCoin.deployed()

      await functions.mineToNextState()
      let epoch = await functions.getEpoch()

      await sch.approve(stakeManager.address, new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[20] })
      await stakeManager.stake(epoch, new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[20] })

      let votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000]
      let tree = merkle('keccak256').sync(votes)

      let root = tree.root()
      let commitment1 = web3i.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment1, { 'from': accounts[20] })

      assert(Number((await blockManager.getBlock(epoch - 1)).proposerId) === 0)
      assert((await blockManager.getBlock(epoch - 1)).valid === false)
      assert(Number(((await blockManager.getBlock(epoch - 1)).medians).length) === 0)

      await functions.mineToNextState()

      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[20], { 'from': accounts[20] })

    })

    it('should be able to reset dispute incase of wrong values being entered', async function () {

      let voteManager = await VoteManager.deployed()
      let stakeManager = await StakeManager.deployed()
      let blockManager = await BlockManager.deployed()
      let random = await Random.deployed()
      let epoch = await functions.getEpoch()

      await functions.mineToNextState()
      let stakerId_acc20 = await stakeManager.stakerIds(accounts[20])
      let staker = await stakeManager.getStaker(stakerId_acc20)
      let numStakers = await stakeManager.getNumStakers()
      let stake = Number(staker.stake)
      let stakerId = Number(staker.id)

      let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]

      let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]

      let blockHashes = await random.blockHashes(numBlocks)

      let iteration = await functions.getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes)
      await blockManager.propose(epoch,
        [10, 12, 13, 14, 15, 16, 17, 18, 19],
        [1000, 2001, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1002, 2002, 3002, 4002, 5002, 6002, 7002, 8002, 9002],
        iteration,
        biggestStakerId,
        { 'from': accounts[20] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0)
      assert(Number(proposedBlock.proposerId) === 4, "incorrect proposalID")

      await functions.mineToNextState()
      // typing error
      let sortedVotes = [20000]
      let weights = [new BN(19000).mul(new BN(10).pow(new BN('18')))]

      let totalStakeRevealed = Number(await voteManager.getTotalStakeRevealed(epoch, 1))
      let medianWeight = Math.floor(totalStakeRevealed / 2)
      let lowerCutoffWeight = Math.floor(totalStakeRevealed / 4)
      let higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4)
      let i = 0
      let median = 0
      let lowerCutoff = 0
      let higherCutoff = 0
      let weight = 0
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i]
        if (weight > medianWeight && median === 0) median = sortedVotes[i]
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes[i]
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes[i]
      }

      console.log('medianWeight', medianWeight)
      console.log('twoFiveWeight', lowerCutoffWeight)
      console.log('sevenFiveWeight', higherCutoffWeight)
      console.log('twofive', lowerCutoff)
      console.log('sevenFive', higherCutoff)


      await blockManager.giveSorted(epoch, 1, sortedVotes, { 'from': accounts[15] })

      assert(Number((await blockManager.disputes(epoch, accounts[15])).assetId) === 1, 'assetId not matching')

      await blockManager.resetDispute(epoch, { 'from': accounts[15] })

      assert(Number((await blockManager.disputes(epoch, accounts[15])).assetId) === 0, 'assetId not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[15])).median) === 0, 'median not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[15])).lowerCutoff) === 0, 'lowerCutoff not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[15])).higherCutoff) === 0, 'higherCutoff not matching')
    })

    it('should be able to dispute in batches', async function () {
      let stakeManager = await StakeManager.deployed()
      let stateManager = await StateManager.deployed()
      let sch = await SchellingCoin.deployed()
      let voteManager = await VoteManager.deployed()
      let blockManager = await BlockManager.deployed()
      let random = await Random.deployed()

      // Commit 
      await functions.mineToNextEpoch()
      await sch.transfer(accounts[5], new BN(423000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[0] })
      await sch.transfer(accounts[6], new BN(19000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[0] })
      let epoch = await functions.getEpoch()
      await sch.approve(stakeManager.address, new BN(420000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[5] })

      await stakeManager.stake(epoch, new BN(420000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[5] })

      await sch.approve(stakeManager.address, new BN(18000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[6] })
      await stakeManager.stake(epoch, new BN(18000).mul(new BN(10).pow(new BN('18'))), { 'from': accounts[6] })

      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)

      let root = tree.root()
      let commitment1 = web3i.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment1, { 'from': accounts[5] })

      let votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree2 = merkle('keccak256').sync(votes2)

      let root2 = tree2.root()
      let commitment2 = web3i.utils.soliditySha3(epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      await voteManager.commit(epoch, commitment2, { 'from': accounts[6] })

      // Reveal 
      await functions.mineToNextState()
      let proof = []
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[5], { 'from': accounts[5] })

      let proof2 = []
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true))
      }
      await voteManager.reveal(epoch, tree2.root(), votes2, proof2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        accounts[6], { 'from': accounts[6] })

      // Propose 
      await functions.mineToNextState()
      let stakerId_acc5 = await stakeManager.stakerIds(accounts[5])
      let staker = await stakeManager.getStaker(stakerId_acc5)
      let numStakers = await stakeManager.getNumStakers()
      let stake = Number(staker.stake)
      let stakerId = Number(staker.id)

      let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]

      let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]

      let blockHashes = await random.blockHashes(numBlocks)

      let iteration = await functions.getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes)


      await blockManager.propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        [99, 199, 299, 399, 499, 599, 699, 799, 899],
        [101, 201, 301, 401, 501, 601, 701, 801, 901],
        iteration,
        biggestStakerId,
        { 'from': accounts[5] })
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0)
      assert(Number(proposedBlock.proposerId) === 1, "incorrect proposalID")

      // Dispute
      await functions.mineToNextState()
      epoch = await functions.getEpoch()
      let sortedVotes = [200]
      let weights = [new BN(420000).mul(new BN(10).pow(new BN('18'))), new BN(18000).mul(new BN(10).pow(new BN('18')))]
      let totalStakeRevealed = Number(await voteManager.getTotalStakeRevealed(epoch, 1))
      let medianWeight = Math.floor(totalStakeRevealed / 2)
      let lowerCutoffWeight = Math.floor(totalStakeRevealed / 4)
      let higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4)
      let i = 0
      let median = 0
      let lowerCutoff = 0
      let higherCutoff = 0
      let weight = 0
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i]
        if (weight > medianWeight && median === 0) median = sortedVotes[i]
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes[i]
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes[i]
      }

      // Dispute in batches
      await blockManager.giveSorted(epoch, 1, sortedVotes.slice(0, 51), { 'from': accounts[20] })
      await blockManager.giveSorted(epoch, 1, sortedVotes.slice(51, 101), { 'from': accounts[20] })
      await blockManager.giveSorted(epoch, 1, sortedVotes.slice(101, 151), { 'from': accounts[20] })
      await blockManager.giveSorted(epoch, 1, sortedVotes.slice(151, 201), { 'from': accounts[20] })

      assert(Number((await blockManager.disputes(epoch, accounts[20])).assetId) === 1, 'assetId not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).median) === median, 'median not matching')
      assert(Number((await blockManager.disputes(epoch, accounts[20])).lastVisited) === sortedVotes[sortedVotes.length - 1], 'lastVisited not matching')
    })

  })
})
