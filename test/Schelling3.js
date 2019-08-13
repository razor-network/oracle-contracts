/* global contract, it, artifacts, assert, web3 */
/* jshint esversion: 8 */

// // TODO:
// // test same vote values, stakes
// test penalizeEpochs
const { assertRevert } = require('./helpers/assertRevert')
// let Schelling = artifacts.require('./Schelling3.sol')
let SimpleToken = artifacts.require('./SimpleToken.sol')
let Random = artifacts.require('./lib/Random.sol')
let Web3 = require('web3')
let merkle = require('@razor-network/merkle')

let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
let gasPrice = 3.9 // gwei
let ethPrice = 172
let numBlocks = 10

// let dollarPerGas = ethUsd * gasPrice * 10 ** 9 = 6.708e-7
let dollarPerGas = 6.708e-7
let electedProposer
let iteration
let biggestStakerId
// / TODO:
// test unstake and withdraw
// test cases where nobody votes, too low stake (1-4)
// describe.('Fullscale test', function () {
contract.skip('Schelling', function (accounts) {
  contract('SimpleToken', function () {
    it('shuld be able to initialize', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()

      await schelling.setEpoch(1)
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
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()

      // console.log(web3i.eth.accounts)

      await sch.approve(schelling.address, 420000, { 'from': accounts[1]})
      let tx = await schelling.stake(1, 420000, {'from': accounts[1]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      let stakerId = await schelling.stakerIds(accounts[1])
      assert(stakerId.toString() === '1')
      let numStakers = await schelling.numStakers()
      assert(numStakers.toString() === '1')
      let staker = await schelling.stakers(1)
      assert(staker.id.toString() === '1')
      assert(staker.stake.toString() === '420000')
      let totalStake = await schelling.totalStake()
      assert(totalStake.toString() === '420000')
    })

    it('should handle second staker correctly', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await sch.approve(schelling.address, 19000, { 'from': accounts[2]})
      let tx = await schelling.stake(1, 19000, { 'from': accounts[2]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      let stakerId = await schelling.stakerIds(accounts[2])
      assert(stakerId.toString() === '2')
      let numStakers = await schelling.numStakers()
      assert(numStakers.toString() === '2')
      let staker = await schelling.stakers(2)
      assert(staker.id.toString() === '2')
      assert(staker.stake.toString() === '19000')
      let totalStake = await schelling.totalStake()
      assert(totalStake.toString() === '439000')
    })

    it('should handle other stakers correctly', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await sch.approve(schelling.address, 800000, { 'from': accounts[3]})
      let tx = await schelling.stake(1, 800000, { 'from': accounts[3]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      let stakerId = await schelling.stakerIds(accounts[3])

      assert(stakerId.toString() === '3')
      let numStakers = await schelling.numStakers()
      assert(numStakers.toString() === '3')
      let staker = await schelling.stakers(3)
      assert(staker.id.toString() === '3')
      assert(staker.stake.toString() === '800000')
      let staker1 = await schelling.stakers(1)
      let totalStake = await schelling.totalStake()
      assert(totalStake.toString() === '1239000')
      //
      await sch.approve(schelling.address, 600000, { 'from': accounts[4]})
      tx = await schelling.stake(1, 600000, { 'from': accounts[4]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      //
      await sch.approve(schelling.address, 2000, { 'from': accounts[5]})
      tx = await schelling.stake(1, 2000, { 'from': accounts[5]})
      await sch.approve(schelling.address, 700000, { 'from': accounts[6]})
      tx = await schelling.stake(1, 700000, { 'from': accounts[6]})

      await sch.approve(schelling.address, 3000, { 'from': accounts[7]})
      tx = await schelling.stake(1, 3000, { 'from': accounts[7]})

      await sch.approve(schelling.address, 1000, { 'from': accounts[8]})
      tx = await schelling.stake(1, 1000, { 'from': accounts[8]})

      await sch.approve(schelling.address, 5000, { 'from': accounts[9]})
      tx = await schelling.stake(1, 5000, { 'from': accounts[9]})
      await sch.approve(schelling.address, 6000, { 'from': accounts[10]})
      await schelling.stake(1, 6000, { 'from': accounts[10]})
    })

    it('should be able to increase stake', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()

      await sch.approve(schelling.address, 3000, { 'from': accounts[8]})
      let tx = await schelling.stake(1, 3000, { 'from': accounts[8]})
    })
//
    it('should be able to commit', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let tree = merkle('keccak256').sync([100, 200, 300, 400, 500, 600, 700, 800, 900])
      console.log(tree.root())
      let root = tree.root()

      let commitment1 = web3i.utils.soliditySha3(1, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      let tx = await schelling.commit(1, commitment1, { 'from': accounts[1]})
      let solCommitment = await schelling.commitments(1, 1)
      assert(commitment1.toString() === solCommitment.toString())

      // commit from account2
      tree = merkle('keccak256').sync([100, 200, 300, 400, 500, 600, 700, 800, 900])
     // console.log(tree.root())
      root = tree.root()

      let commitment2 = web3i.utils.soliditySha3(1, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      tx = await schelling.commit(1, commitment2, { 'from': accounts[2]})

      tree = merkle('keccak256').sync([120, 220, 320, 420, 520, 620, 720, 820, 920])
     // console.log(tree.root())
      root = tree.root()
      let commitment3 = web3i.utils.soliditySha3(1, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9333')
      tx = await schelling.commit(1, commitment3, { 'from': accounts[3]})

      tree = merkle('keccak256').sync([4, 4, 4, 4, 4, 4, 4, 4, 4 ])
      let commitment4 = web3i.utils.soliditySha3(1, tree.root(), '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9444')
      tx = await schelling.commit(1, commitment4, { 'from': accounts[4]})

      tree = merkle('keccak256').sync([110, 210, 310, 410, 510, 610, 710, 810, 910 ])
      let commitment5 = web3i.utils.soliditySha3(1, tree.root(), '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9555')
      tx = await schelling.commit(1, commitment5, { 'from': accounts[5]})

      //
      // let commitment7 = web3i.utils.soliditySha3(1, tree.root(), '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9777')
      // tx = await schelling.commit(1, commitment7, { 'from': accounts[7]})
      // let commitment8 = web3i.utils.soliditySha3(1, 161, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888')
      // tx = await schelling.commit(1, commitment8, { 'from': accounts[8]})
      // // //
      // let commitment9 = web3i.utils.soliditySha3(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999')
      // tx = await schelling.commit(1, commitment9, { 'from': accounts[9]})
      // // //
      // let commitment10 = web3i.utils.soliditySha3(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      // tx = await schelling.commit(1, commitment10, { 'from': accounts[10]})
    })
    it('should be able to reveal someone elses commitment and get bounty', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let stakerId = await schelling.stakerIds(accounts[2])
      let stakeBefore = await schelling.stakers(stakerId)
      let tree = merkle('keccak256').sync([100, 200, 300, 400, 500, 600, 700, 800, 900])

      let res = await schelling.reveal(1, tree.root(), [0], [['0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111']], '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', accounts[2], { 'from': accounts[19]})
      let stakeAfter = await schelling.stakers(stakerId)
      // assert stake is slashed
      assert(stakeAfter.stake.toString() === '0')
      let bountyHunterBalance = (await sch.balanceOf(accounts[19])).toString()
      assert(Number(bountyHunterBalance) === Math.floor(Number(stakeBefore.stake) / 2))
    })
//
    it('should not be able to reveal incorrectly', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      // console.log(tree.root())
      // console.log(tree.level(1))
      // console.log(tree.level(2))
      let root = tree.root()
      // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
      let proof = []
      for (i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      await schelling.setState(1)
      // await assertRevert(schelling.reveal(1, tree.root(), votes, proof, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
      await assertRevert(schelling.reveal(0, tree.root(), votes, proof, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
      await assertRevert(schelling.reveal(1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', votes, proof, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
      await assertRevert(schelling.reveal(1, tree.root(), [1, 2, 3], proof, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9fff', accounts[1], { 'from': accounts[1]}))
      await assertRevert(schelling.reveal(1, tree.root(), votes, [['0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']], '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
    })

    it('should be able to reveal', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let epoch = Number(await schelling.getEpoch())
      await schelling.setState(1)

      // //console.log('epoch', epoch)
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      console.log(tree.root())
      // console.log(tree.level(1))
      // console.log(tree.level(2))
      let root = tree.root()
      // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
      let proof = []
      for (i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      console.log('proof', proof)
      // console.log(1, tree.root(), [100, 200, 300, 400, 500, 600, 700, 800, 900],
      //           proof,
      //             '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
      //             accounts[1])
      let tx = await schelling.reveal(1, tree.root(),
      [100, 200, 300, 400, 500, 600, 700, 800, 900],
        proof,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
      accounts[1], { 'from': accounts[1]})
      // //console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      votes = [120, 220, 320, 420, 520, 620, 720, 820, 920]
      tree = merkle('keccak256').sync(votes)
      root = tree.root()
      proof = []
      for (i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      tx = await schelling.reveal(1, root, votes, proof, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9333', accounts[3], { 'from': accounts[3]})
      votes = [4, 4, 4, 4, 4, 4, 4, 4, 4 ]
      tree = merkle('keccak256').sync(votes)
      root = tree.root()
      proof = []
      for (i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      tx = await schelling.reveal(1, root, votes, proof, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9444', accounts[4], { 'from': accounts[4]})
      votes = [110, 210, 310, 410, 510, 610, 710, 810, 910 ]

      tree = merkle('keccak256').sync(votes)
      root = tree.root()
      proof = []
      for (i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      tx = await schelling.reveal(1, root, votes, proof, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9555', accounts[5], { 'from': accounts[5]})
      //
      // let commitment8 = web3i.utils.soliditySha3(1, 10, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888')
      // await schelling.reveal(1, 161, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888', accounts[8], { 'from': accounts[8]})
      // let commitment9 = web3i.utils.soliditySha3(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999')
      // await schelling.reveal(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999', accounts[9], { 'from': accounts[9]})
      // let commitment10 = web3i.utils.soliditySha3(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      // await schelling.reveal(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', accounts[10], { 'from': accounts[10]})
    })

    // it('should not be able to reveal again', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   await assertRevert(schelling.reveal(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
    // })

    async function prng (seed, max, blockHashes) {
      let hashh = await prngHash(seed, blockHashes)
      let sum = web3.utils.toBN(hashh)
      max = web3.utils.toBN(max)
      // console.log('sum', sum)
      // console.log('max', max)
      // console.log('sum%max', sum.mod(web3.utils.toBN(max)))
      // console.log('hashh, sum,max,prng', hashh, sum, max, sum.mod(max))
      return (sum.mod(max))
    }

// pseudo random hash generator based on block hashes.
    async function prngHash (seed, blockHashes) {
      // let sum = blockHashes(numBlocks)
      let sum = await web3.utils.soliditySha3(blockHashes, seed)
      // console.log('prngHash', sum)
      return (sum)
    }

    async function getIteration (schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes) {
      let j = 0
      console.log(blockHashes)
      for (let i = 0; i < 10000000000; i++) {
        // console.log('iteration ', i)

        let isElected = await isElectedProposer(random, i, biggestStake, stake, stakerId, numStakers, blockHashes)
        if (isElected) return (i)
      }
    }

    async function isElectedProposer (random, iteration, biggestStake, stake, stakerId, numStakers, blockHashes) {
        // rand = 0 -> totalStake-1
        // add +1 since prng returns 0 to max-1 and staker start from 1
      let seed = await web3.utils.soliditySha3(iteration)
      // console.log('seed', seed)
      if ((Number(await prng(seed, numStakers, blockHashes)) + 1) !== stakerId) return (false)
      let seed2 = await web3.utils.soliditySha3(stakerId, iteration)
      let randHash = await prngHash(seed2, blockHashes)
      let rand = Number((await web3.utils.toBN(randHash)).mod(await web3.utils.toBN(2 ** 32)))
        // let biggestStake = stakers[biggestStake].stake;
      if (rand * (biggestStake) > stake * (2 ** 32)) return (false)
      return (true)
    }

    it('prngHash should work as expected', async function () {
      // let schelling = await Schelling.deployed()
      // let sch = await SimpleToken.deployed()
      let random = await Random.deployed()

      // async function prng (seed, max, blockHashes) {
      let blockHashes = await random.blockHashes(numBlocks)
      let seed = '0x5bb6cbdeb4de92b880424c3f2d6d1f6d50422ca0e12ea3b83aea4e59834aee9b'
      // let max = 100
      let r = await prngHash(seed, blockHashes)
      let rr = await random.prngHash(numBlocks, seed)
      // console.log('rr,r', rr, r)
      assert(rr === r)
      // await schelling.setState(2)
    })

    it('prng should work as expected', async function () {
      // let schelling = await Schelling.deployed()
      // let sch = await SimpleToken.deployed()
      let random = await Random.deployed()

      // async function prng (seed, max, blockHashes) {
      let blockHashes = await random.blockHashes(numBlocks)
      let seed = '0x5bb6cbdeb4de92b880424c3f2d6d1f6d50422ca0e12ea3b83aea4e59834aee9b'
      let max = 100
      let r = Number(await prng(seed, max, blockHashes))
      let rr = Number(await random.prng(numBlocks, max, seed))
      console.log('rr,r', rr, r)
      assert(rr === r)
      // await schelling.setState(2)
    })

    it('should be able to propose', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let random = await Random.deployed()
      await schelling.setState(2)

      let stakerId = Number(await schelling.stakerIds(accounts[1]))
      let staker = await schelling.stakers(stakerId)
      let numStakers = Number(await schelling.numStakers())
      // assert(staker.id.toString() === '3')
      // assert(staker.stake.toString() === '800000')
      // console.log()
      let stake = Number(staker.stake)
      console.log('stake', stake)
      let biggestStake = (await getBiggestStakeAndId(schelling))[0]
      console.log('biggestStake', biggestStake)
      let biggestStakerId = (await getBiggestStakeAndId(schelling))[1]
      console.log('biggestStakerId', biggestStakerId)
      let blockHashes = await random.blockHashes(numBlocks)
      console.log(' biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
      let iteration = await getIteration(schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes)
      console.log('iteration1b', iteration)
      await schelling.propose(1, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[1]})

      // let block = await schelling.proposedBlocks(1, 0)
      let block = await schelling.getBlock(1, 1)
      // console.log(block[0])
      // console.log(block.medians)
      assert.deepEqual([Number(block.medians[0]), Number(block.medians[1])], [100, 200])
      assert(Number(block[0]) === Number(stakerId))
      // assert.deepEqual([Number(block[1][0]), Number(block[1][1])], [200, 301])
    })

    it('should be able to propose multiple blocks', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let random = await Random.deployed()

      // await schelling.setState(2)
      // console.log('biggestStake', biggestStake)
      let stakerId = Number(await schelling.stakerIds(accounts[3]))
      let staker = await schelling.stakers(stakerId)
      let stake = Number(staker.stake)
      let numStakers = Number(await schelling.numStakers())
      // assert(staker.id.toString() === '3')
      // assert(staker.stake.toString() === '800000')
      // console.log()
      // console.log('stake', stake)
      let biggestStake = (await getBiggestStakeAndId(schelling))[0]
      console.log('biggestStake', biggestStake)
      let biggestStakerId = (await getBiggestStakeAndId(schelling))[1]
      console.log('biggestStakerId', biggestStakerId)
      let blockHashes = await random.blockHashes(numBlocks)
      console.log(' biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
      let iteration = Number(await getIteration(schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes))
      // let iteration = await getIteration(schelling, biggestStake, stakerId)
      console.log('iteration2b', (iteration))
      await schelling.propose(1, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[3]})
      let block = await schelling.getBlock(1, 1)
      // console.log('iteration', Number(block[0]))
      // console.log(block.medians)
      // assert.deepEqual([Number(block.medians[0]), Number(block.medians[1])], [200, 300])
      // assert(Number(block[0]) === Number(stakerId))

      let block2 = await schelling.getBlock(1, 2)
      // let block3 = await schelling.getBlock(1, 3)
      // let block4 = await schelling.getBlock(1, 4)
      console.log('iteration1', Number(block[2]))
      console.log('iteration2', Number(block2[2]))
      // console.log('iteration3', Number(block3[2]))
      // console.log('iteration4', Number(block4[2]))

      stakerId = Number(await schelling.stakerIds(accounts[4]))
      staker = await schelling.stakers(stakerId)
      stake = Number(staker.stake)
      blockHashes = await random.blockHashes(numBlocks)
      iteration = await getIteration(schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes)
      console.log('iteration3b', iteration)
      await schelling.propose(1, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[stakerId]})
      block = await schelling.getBlock(1, 1)
      block2 = await schelling.getBlock(1, 2)
      block3 = await schelling.getBlock(1, 3)
      // let block4 = await schelling.getBlock(1, 4)
      console.log('iteration1', Number(block[2]))
      console.log('iteration2', Number(block2[2]))
      console.log('iteration3', Number(block3[2]))
      // console.log('iteration4', Number(block4[2]))

      stakerId = Number(await schelling.stakerIds(accounts[5]))
      staker = await schelling.stakers(stakerId)
      stake = Number(staker.stake)
      blockHashes = await random.blockHashes(numBlocks)
      iteration = await getIteration(schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes)
      // iteration = await getIteration(schelling, biggestStakerId, stakerId)
      console.log('iteration4b', iteration)
      await schelling.propose(1, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[stakerId]})

      // console.log('iteration2b', iteration)
      block = await schelling.getBlock(1, 1)
      block2 = await schelling.getBlock(1, 2)
      block3 = await schelling.getBlock(1, 3)
      block4 = await schelling.getBlock(1, 4)
      console.log('iteration1', Number(block[2]))
      console.log('iteration2', Number(block2[2]))
      console.log('iteration3', Number(block3[2]))
      console.log('iteration4', Number(block4[2]))
      console.log('bb1', Number(block[3]))
      console.log('bb2', Number(block2[3]))
      console.log('bb3', Number(block3[3]))
      console.log('bb4', Number(block4[3]))

      stakerId = Number(await schelling.stakerIds(accounts[6]))
      // stakerId = await schelling.stakerIds(accounts[3])
      staker = await schelling.stakers(stakerId)
      stake = Number(staker.stake)
      blockHashes = await random.blockHashes(numBlocks)
      iteration = await getIteration(schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes)
      // iteration = await getIteration(schelling, biggestStakerId, stakerId)
      console.log('iteration5b', iteration)
      await schelling.propose(1, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[stakerId]})

      block = await schelling.getBlock(1, 1)
      block2 = await schelling.getBlock(1, 2)
      block3 = await schelling.getBlock(1, 3)
      block4 = await schelling.getBlock(1, 4)
      block5 = await schelling.getBlock(1, 5)
      console.log('iteration1', Number(block[2]))
      console.log('iteration2', Number(block2[2]))
      console.log('iteration3', Number(block3[2]))
      console.log('iteration4', Number(block4[2]))
      console.log('iteration5', Number(block5[2]))
      console.log('bb1', Number(block[3]))
      console.log('bb2', Number(block2[3]))
      console.log('bb3', Number(block3[3]))
      console.log('bb4', Number(block4[3]))
      console.log('bb5', Number(block5[3]))

      stakerId = Number(await schelling.stakerIds(accounts[7]))
      // stakerId = await schelling.stakerIds(accounts[3])
      staker = await schelling.stakers(stakerId)
      stake = Number(staker.stake)
      blockHashes = await random.blockHashes(numBlocks)
      iteration = await getIteration(schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes)
      // iteration = await getIteration(schelling, biggestStakerId, stakerId)
      console.log('iteration6b', iteration)
      await schelling.propose(1, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[stakerId]})

      block = await schelling.getBlock(1, 1)
      block2 = await schelling.getBlock(1, 2)
      block3 = await schelling.getBlock(1, 3)
      block4 = await schelling.getBlock(1, 4)
      block5 = await schelling.getBlock(1, 5)
      block6 = await schelling.getBlock(1, 6)
      console.log('iteration1', Number(block[2]))
      console.log('iteration2', Number(block2[2]))
      console.log('iteration3', Number(block3[2]))
      console.log('iteration4', Number(block4[2]))
      console.log('iteration5', Number(block5[2]))
      console.log('iteration6', Number(block6[2]))
      console.log('bb1', Number(block[3]))
      console.log('bb2', Number(block2[3]))
      console.log('bb3', Number(block3[3]))
      console.log('bb4', Number(block4[3]))
      console.log('bb5', Number(block5[3]))
      console.log('bb6', Number(block6[3]))

      // console.log(block.medians)
      // assert.deepEqual([Number(block.medians[0]), Number(block.medians[1])], [200, 306])
      // assert(Number(block[0]) === Number(stakerId))

      // stakerId = await schelling.stakerIds(accounts[3])
      // iteration = await getIteration(schelling, biggestStakerId, stakerId)
      // await schelling.propose(1, [200, 305], iteration, biggestStakerId, { 'from': accounts[electedProposer]})
      // stakerId = await schelling.stakerIds(accounts[4])
      // iteration = await getIteration(schelling, biggestStakerId, stakerId)
      // await schelling.propose(1, [2000, 301], iteration, biggestStakerId, { 'from': accounts[electedProposer]})

      // let block = await schelling.proposedBlocks(1, 0)
      // console.log(block)
      // let block = await schelling.getBlock(1, 1)
      // console.log(block.medians)
      // assert.deepEqual([Number(block.medians[0]), Number(block.medians[1])], [200, 301])
      // assert(Number(block[0]) === electedProposer)
      // assert.deepEqual([Number(block[1][0]), Number(block[1][1])], [200, 301])
    })
    //
    it('should be able to giveSortedVotes', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await schelling.setState(3)

      // TODO check acutal weights from con tract
      let sortedVotes = [4, 100, 110, 120]
      let weights = [600000, 420000, 5000, 800000]

      let totalStakeRevealed = Number(await schelling.totalStakeRevealed(1, 1))
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

      await schelling.giveSorted(1, 0, sortedVotes, { 'from': accounts[20]})
      console.log('median', median)
      console.log('median contract', Number((await schelling.disputes(1, accounts[20])).median))
      assert(Number((await schelling.disputes(1, accounts[20])).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching')
      assert(Number((await schelling.disputes(1, accounts[20])).median) === median, 'median not matching')
      assert(Number((await schelling.disputes(1, accounts[20])).lastVisited) === sortedVotes[sortedVotes.length - 1], 'lastVisited not matching')
    })
// //
//     it('should be able to giveSortedVotes in batches', async function () {
//       let schelling = await Schelling.deployed()
//       let sch = await SimpleToken.deployed()
//
//       let sortedVotes = [1, 4, 160, 161, 168, 1000000]
//       let weights = [5000, 600000, 420000, 4000, 800000, 6000]
//       let totalStakeRevealed = Number(await schelling.totalStakeRevealed(1))
//       let medianWeight = totalStakeRevealed / 2
//       let i = 0
//       let median = 0
//       let weight = 0
//       for (i = 0; i < sortedVotes.length; i++) {
//         weight += weights[i]
//
//         if (weight > medianWeight && median === 0) median = sortedVotes[i]
//       }
//       // //console.log('totalStakeRevealed', totalStakeRevealed)
//       // //console.log('medianWeight', medianWeight)
//       // //console.log('twoFiveWeight', twoFiveWeight)
//       // //console.log('sevenFiveWeight', sevenFiveWeight)
//       // //console.log('twofive', twoFive)
//       // //console.log('median', median)
//       // //console.log('sevenFive', sevenFive)
//       // //console.log('---------------------------')
//
//       let tx = await schelling.giveSorted(1, sortedVotes.slice(0, 2), { 'from': accounts[21]})
//       tx = await schelling.giveSorted(1, sortedVotes.slice(2, 4), { 'from': accounts[21]})
//       // //console.log('gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
//
//       tx = await schelling.giveSorted(1, sortedVotes.slice(4, 6), { 'from': accounts[21]})
//       assert(Number((await schelling.disputes(1, accounts[21])).accWeight) === totalStakeRevealed)
//       assert(Number((await schelling.disputes(1, accounts[21])).median) === median)
//
//       assert(Number((await schelling.disputes(1, accounts[21])).lastVisited) === sortedVotes[sortedVotes.length - 1])
//     })
//
//     it('should get reward for correct proposeAlt', async function () {
//       let schelling = await Schelling.deployed()
//       let sch = await SimpleToken.deployed()
//       let proposerId = Number((await schelling.blocks(1)).proposerId)
//       let proposerStake = Number((await schelling.stakers(proposerId)).stake)
//       let totalStake = Number(await schelling.totalStake())
//
//       await schelling.proposeAlt(1, { 'from': accounts[21]})
//       let proposerStakeAfter = Number((await schelling.stakers(proposerId)).stake)
//       let altProposerStakeAfter = Number((await schelling.stakers(11)).stake)
//       totalStake = Number(await schelling.totalStake())
//       assert(Number(proposerStakeAfter) === 0)
//
//       assert(Number(await sch.balanceOf(accounts[21])) === Math.floor(proposerStake / 2))
//       let block = await schelling.blocks(1)
//       assert(Number(block.proposerId) === 0)
//       assert(Number(block.median) === 160)
//     })
//
    it('should be able to commit and get penalties in next epoch', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setEpoch(2)
      await schelling.setState(0)

      // let medianLastEpoch = Number((await schelling.blocks(1)).median)
      // console.log('medianLastEpoch', medianLastEpoch)
      let stakerId = Number(await schelling.stakerIds(accounts[1]))
      console.log('stakerId', stakerId)
      // let voteLastEpoch = Number((await schelling.votes(1, stakerId)).value)
      // console.log('voteLastEpoch', voteLastEpoch)
      let stakeBefore = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)

      tree = merkle('keccak256').sync([100, 200, 300, 400, 500, 600, 700, 800, 900])
     // console.log(tree.root())
      root = tree.root()

      let commitment = web3i.utils.soliditySha3(2, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      tx = await schelling.commit(2, commitment, { 'from': accounts[1]})

      // let commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
      // let tx = await schelling.commit(2, commitment1, { 'from': accounts[1]})
      // console.log(Number(tx.logs[0].args.y))
      let stakeAfter = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
      // if (voteLastEpoch < Math.floor(medianLastEpoch * 0.99) || voteLastEpoch > Math.floor(medianLastEpoch * 1.01)) {
      //   let expectedStakeAfer = stakeBefore - Math.floor((((medianLastEpoch - voteLastEpoch) ** 2 / medianLastEpoch ** 2) - 0.0001) * stakeBefore)
      //   console.log('expectedStakeAfer', expectedStakeAfer)

      // no penalty. good boy
      let block = await schelling.getBlock(1, 0)
      for (i = 0; i < block.medians.length; i++) {
        console.log('block', Number(block.medians[i]))
      }

      // }
      let rewardPool = Number(await schelling.rewardPool())

      console.log('rewardPool', rewardPool)
      let stakeGettingReward = Number(await schelling.stakeGettingReward())
      console.log('stakeGettingReward', stakeGettingReward)
      // assert(rewardPool ===(stakeBefore-stakeAfter))
      assert(stakeBefore === stakeAfter)

      stakerId = Number(await schelling.stakerIds(accounts[3]))
      console.log('stakerId', stakerId)
      // voteLastEpoch = Number((await schelling.votes(1, stakerId)).value)
      // console.log('voteLastEpoch', voteLastEpoch)
      stakeBefore = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)
      // commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
      tx = await schelling.commit(2, commitment, { 'from': accounts[3]})
      // console.log('y', Number(tx.logs[0].args.y))
      stakeAfter = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
      // if (voteLastEpoch < Math.floor(medianLastEpoch * 0.99) || voteLastEpoch > Math.floor(medianLastEpoch * 1.01)) {
        // let expectedStakeAfer = stakeBefore - Math.floor(((Math.floor((10000 * (medianLastEpoch - voteLastEpoch) ** 2) / medianLastEpoch ** 2) - 1) * stakeBefore) / 10000)
        // console.log('expectedStakeAfer', expectedStakeAfer)
        // assert(expectedStakeAfer === stakeAfter)
      // }
      rewardPool = Number(await schelling.rewardPool())
      console.log('rewardPool', rewardPool)
      stakeGettingReward = Number(await schelling.stakeGettingReward())
      console.log('stakeGettingReward', stakeGettingReward)
      assert(rewardPool === (stakeBefore - stakeAfter))

      stakerId = Number(await schelling.stakerIds(accounts[4]))
      console.log('stakerId', stakerId)
      // voteLastEpoch = Number((await schelling.votes(1, stakerId)).value)
      // console.log('voteLastEpoch', voteLastEpoch)
      stakeBefore = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)
      let rewardPoolBefore = Number(await schelling.rewardPool())
      console.log('rewardPoolBefore', rewardPoolBefore)

      // commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
      tx = await schelling.commit(2, commitment, { 'from': accounts[4]})
      // console.log(Number(tx.logs[0].args.y))
      stakeAfter = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
      // if (voteLastEpoch > medianLastEpoch * 2) {
        // let expectedStakeAfer = 0
        // console.log('expectedStakeAfer', expectedStakeAfer)
        // assert(expectedStakeAfer === stakeAfter)
      // } else if (voteLastEpoch < Math.floor(medianLastEpoch * 0.99) || voteLastEpoch > Math.floor(medianLastEpoch * 1.01)) {
        // let expectedStakeAfer = stakeBefore - Math.floor(((Math.floor((10000 * (medianLastEpoch - voteLastEpoch) ** 2) / medianLastEpoch ** 2) - 1) * stakeBefore) / 10000)
        // console.log('expectedStakeAfer', expectedStakeAfer)
        // assert(expectedStakeAfer === stakeAfter)
      // }
      rewardPool = Number(await schelling.rewardPool())
      console.log('rewardPool', rewardPool)
      // assert(rewardPool === rewardPoolBefore + (stakeBefore - stakeAfter))
    })
//
    it('should get rewards when revealed', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setState(1)
      let stakerId = Number(await schelling.stakerIds(accounts[1]))
      console.log('stakerId', stakerId)
      let stakeBefore = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)
      let votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]
      let tree = merkle('keccak256').sync(votes)
      console.log(tree.root())
      let root = tree.root()
      let proof = []
      for (i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true))
      }
      console.log('proof', proof)

      let tx = await schelling.reveal(2, tree.root(),
      [100, 200, 300, 400, 500, 600, 700, 800, 900],
        proof,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111',
      accounts[1], { 'from': accounts[1]})

      // let res = await schelling.reveal(2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', [0], [['0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111']], '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', accounts[8], { 'from': accounts[8]})
      let stakeAfter = Number((await schelling.stakers(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
      // assert(false)
    })
    it('should get price last epoch', async function () {
      let schelling = await Schelling.deployed()
      let price = Number(await schelling.getPrice(0))
      console.log('price', price)
    })

    it('should be able to unstake in next epoch', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setEpoch(3)
      await schelling.setState(0)

      tx = await schelling.unstake(3, { 'from': accounts[5]})
    })

    it('should not be able to withdraw in same epoch', async function () {
      let sch = await SimpleToken.deployed()
      let schelling = await Schelling.deployed()

      await assertRevert(schelling.withdraw(3, { 'from': accounts[5]}))
    })

    it('should not be able to withdraw if didnt reveal last epoch', async function () {
      let sch = await SimpleToken.deployed()
      let schelling = await Schelling.deployed()
      await schelling.setEpoch(3)
      await schelling.setState(0)

      await assertRevert(schelling.withdraw(3, { 'from': accounts[5]}))
    })

    // it('should be able to withdraw in next epoch if revealed last epoch', async function () {
    //   let sch = await SimpleToken.deployed()
    //   let schelling = await Schelling.deployed()
    //   let random = await Random.deployed()
    //   tree = merkle('keccak256').sync([100, 200, 300, 400, 500, 600, 700, 800, 900])
    //  // console.log(tree.root())
    //   root = tree.root()

    //   let commitment = web3i.utils.soliditySha3(3, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
    //   tx = await schelling.commit(3, commitment, { 'from': accounts[5]})

    //   await schelling.setState(2)

    //   let stake = Number(staker.stake)
    //   console.log('stake', stake)
    //   let biggestStake = (await getBiggestStakeAndId(schelling))[0]
    //   console.log('biggestStake', biggestStake)
    //   let biggestStakerId = (await getBiggestStakeAndId(schelling))[1]
    //   console.log('biggestStakerId', biggestStakerId)
    //   let blockHashes = await random.blockHashes(numBlocks)
    //   console.log('biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
    //   let iteration = await getIteration(schelling, random, biggestStake, stake, stakerId, numStakers, blockHashes)
    //   console.log('iteration1b', iteration)
    //   await schelling.propose(1, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[1]})

    //   // let commitment1 = web3i.utils.soliditySha3(3, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
    //   // let tx = await schelling.commit(3, commitment1, { 'from': accounts[5]})
    //   await schelling.setState(1)
    //   let res = await schelling.reveal(3, tree.root(), [0], [['0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111']], '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', accounts[5], { 'from': accounts[5]})
    //   // await schelling.setEpoch(4)
    //   // await schelling.setState(0)
    //   // await schelling.setEpoch(5)
    //   //
    //   // await schelling.withdraw(4, { 'from': accounts[5]})
    // })

    //
    // it('should be able to commit in next epoch', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   await schelling.setEpoch(2)
    //
    //   // let maxStakers = Number(await schelling.maxStakers())
    //   // for (let i = 0; i < maxStakers; i++) {
    //     // ////console.log('activeStakers ', i, Number(await schelling.activeStakers(i)))
    //   // }
    //   let commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
    //   let tx = await schelling.commit(2, commitment1, { 'from': accounts[6]})
    //   // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
    //   // ////console.log('c', commitment)
    //
    //   // stake6 = (await schelling.stakers(6)).stake
    //   // ////console.log('stake6', Number(stake6))
    //   // let commitment6 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
    //   await schelling.commit(2, commitment1, { 'from': accounts[4]})
    //   await schelling.commit(2, commitment1, { 'from': accounts[3]})
    //   await schelling.commit(2, commitment1, { 'from': accounts[7]})
    //   await schelling.commit(2, commitment1, { 'from': accounts[8]})
    //   await schelling.commit(2, commitment1, { 'from': accounts[9]})
    //   await schelling.commit(2, commitment1, { 'from': accounts[10]})
    //
    //   let solCommitment = await schelling.commitments(2, 6)
    //   // ////console.log('sc', solCommitment)
    //   assert(commitment1.toString() === solCommitment.toString())
    // })
    //
    // it('should be able to reveal in next epoch', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   // let commitment = web3i.utils.soliditySha3(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
    //   let staker = await schelling.stakers(6)
    //   // //console.log('epochLastRevealed', staker.epochLastRevealed.toString())// === '42000')
    //   staker = await schelling.stakers(6)
    //   // //console.log('stake6', staker.stake.toString())// === '42000')
    //   // //console.log('currentEpoch', Number((await schelling.c()).EPOCH))// === '42000')
    //   let tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[6], { 'from': accounts[6]})
    //   // ////console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
    //   staker = await schelling.stakers(6)
    //   // //console.log('stake6', staker.stake.toString())// === '42000')
    //   staker = await schelling.stakers(4)
    //   // //console.log('stake4', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[4], { 'from': accounts[4]})
    //   // ////console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
    //   staker = await schelling.stakers(4)
    //   // //console.log('stake4', staker.stake.toString())
    //
    //   staker = await schelling.stakers(3)
    //   // //console.log('stake3', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[3], { 'from': accounts[3]})
    //   staker = await schelling.stakers(3)
    //   // //console.log('stake3', staker.stake.toString())
    //
    //   staker = await schelling.stakers(7)
    //   // //console.log('stake7', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[7], { 'from': accounts[7]})
    //   staker = await schelling.stakers(7)
    //   // //console.log('stake7', staker.stake.toString())
    //
    //   staker = await schelling.stakers(8)
    //   // //console.log('stake8', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[8], { 'from': accounts[8]})
    //   staker = await schelling.stakers(8)
    //   // //console.log('stake8', staker.stake.toString())
    //
    //   staker = await schelling.stakers(9)
    //   // //console.log('stake9', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[9], { 'from': accounts[9]})
    //   staker = await schelling.stakers(9)
    //   // //console.log('stake9', staker.stake.toString())
    //
    //   staker = await schelling.stakers(10)
    //   // //console.log('stake10', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[10], { 'from': accounts[10]})
    //   staker = await schelling.stakers(10)
    //   // //console.log('stake10', staker.stake.toString())
    //   // assert(staker.stake.toString() === '42000')
    //
    //   // //console.log('stakeGettingPenalty', Number((await schelling.blocks(1)).stakeGettingPenalty))
//     //   // //console.log('stakeGettingReward', Number((await schelling.blocks(1)).stakeGettingReward))
    // })
  })
})
// })
