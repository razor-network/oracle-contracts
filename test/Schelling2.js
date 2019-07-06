/* global contract, it, artifacts, assert, web3 */
/* jshint esversion: 8 */

// // TODO:
// // test same vote values, stakes
// test penalizeEpochs
const { assertRevert } = require('./helpers/assertRevert')
let Schelling = artifacts.require('./Schelling2.sol')
let SimpleToken = artifacts.require('./SimpleToken.sol')
let Web3 = require('web3')

let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
let gasPrice = 3.9 // gwei
let ethPrice = 172
// let dollarPerGas = ethUsd * gasPrice * 10 ** 9 = 6.708e-7
let dollarPerGas = 6.708e-7
let electedProposer
let iteration
let biggestStakerId
// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// let gasPrice = new web3i.utils.BN(20000000000)

// stories:
// epoch 0
// accounts[0] transfers tokens to other accounts; does nothing
// 1 stakes 42000; commit 160; reveal 160
// 2 stakes 19000; commit 170; reveal 170
// 3 stakes 800000; commit 168; reveal 168;
// 4 stakes 600000; commit 4; reveal 4;
// 5 stakes 2000; gets kicked; tries to commit 2000, fails
// 6 stakes 700000, doesnt commit; doesnt reveal;
// 7 stake 3000; commit 169; doesnt reveal
// 8 stake 4000, kicks [5]; commit 10; reveal 10;
// 20 doesnt stake; doesnt commit; doesnt reveal; giveSorted()

// epoch 1
// 1 commit 170; reveal 170;
// 6 commit reveal; gets penalty
// block proposer is selected randomly weighted by median

// / TODO:
// test unstake and withdraw
// test cases where nobody votes, too low stake (1-4)

async function getBiggestStakerId (schelling) {
  let numStakers = await schelling.numNodes()
  let biggestStake = 0
  let biggestStakerId = 0
  for (let i = 1; i <= numStakers; i++) {
    let stake = Number((await schelling.nodes(i)).stake)
    if (stake > biggestStake) {
      biggestStake = stake
      biggestStakerId = i
    }
  }
  return biggestStakerId
}

contract('Schelling', function (accounts) {
  contract('SimpleToken', function () {
    it('should be able to stake', async function () {
      // console.log(web3i.eth.accounts)

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

      await sch.approve(schelling.address, 420000, { 'from': accounts[1]})
      let tx = await schelling.stake(1, 420000, {'from': accounts[1]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      let nodeId = await schelling.nodeIds(accounts[1])
      assert(nodeId.toString() === '1')
      let numStakers = await schelling.numNodes()
      assert(numStakers.toString() === '1')
      let staker = await schelling.nodes(1)
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

      let stakerId = await schelling.nodeIds(accounts[2])
      assert(stakerId.toString() === '2')
      let numStakers = await schelling.numNodes()
      assert(numStakers.toString() === '2')
      let staker = await schelling.nodes(2)
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

      let stakerId = await schelling.nodeIds(accounts[3])

      assert(stakerId.toString() === '3')
      let numStakers = await schelling.numNodes()
      assert(numStakers.toString() === '3')
      let staker = await schelling.nodes(3)
      assert(staker.id.toString() === '3')
      assert(staker.stake.toString() === '800000')
      let staker1 = await schelling.nodes(1)
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

    it('should be able to commit', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let commitment1 = web3i.utils.soliditySha3(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      let tx = await schelling.commit(1, commitment1, { 'from': accounts[1]})
      let solCommitment = await schelling.commitments(1, 1)
      assert(commitment1.toString() === solCommitment.toString())

      // commit from account2
      let commitment2 = web3i.utils.soliditySha3(1, 170, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      tx = await schelling.commit(1, commitment2, { 'from': accounts[2]})
      let commitment3 = web3i.utils.soliditySha3(1, 168, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9333')
      tx = await schelling.commit(1, commitment3, { 'from': accounts[3]})
      // // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      // //
      let commitment4 = web3i.utils.soliditySha3(1, 4, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9444')
      tx = await schelling.commit(1, commitment4, { 'from': accounts[4]})
      let commitment7 = web3i.utils.soliditySha3(1, 169, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9777')
      tx = await schelling.commit(1, commitment7, { 'from': accounts[7]})
      let commitment8 = web3i.utils.soliditySha3(1, 161, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888')
      tx = await schelling.commit(1, commitment8, { 'from': accounts[8]})
      // //
      let commitment9 = web3i.utils.soliditySha3(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999')
      tx = await schelling.commit(1, commitment9, { 'from': accounts[9]})
      // //
      let commitment10 = web3i.utils.soliditySha3(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      tx = await schelling.commit(1, commitment10, { 'from': accounts[10]})
    })

    it('should be able to reveal someone elses commitment and get bounty', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let stakerId = await schelling.nodeIds(accounts[2])
      let stakeBefore = await schelling.nodes(stakerId)
      let res = await schelling.reveal(1, 170, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', accounts[2], { 'from': accounts[19]})
      let stakeAfter = await schelling.nodes(stakerId)
      // assert stake is slashed
      assert(stakeAfter.stake.toString() === '0')
      let bountyHunterBalance = (await sch.balanceOf(accounts[19])).toString()
      assert(Number(bountyHunterBalance) === Math.floor(Number(stakeBefore.stake) / 2))
    })

    it('should not be able to reveal incorrectly', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await assertRevert(schelling.reveal(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
      await schelling.setState(1)
      await assertRevert(schelling.reveal(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9fff', accounts[1], { 'from': accounts[1]}))
      await assertRevert(schelling.reveal(0, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
      await assertRevert(schelling.reveal(1, 161, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
    })

    it('should be able to reveal', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let epoch = Number(await schelling.getEpoch())
      // //console.log('epoch', epoch)
      let tx = await schelling.reveal(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]})
      // //console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      tx = await schelling.reveal(1, 168, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9333', accounts[3], { 'from': accounts[3]})

      tx = await schelling.reveal(1, 4, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9444', accounts[4], { 'from': accounts[4]})

      let commitment8 = web3i.utils.soliditySha3(1, 10, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888')
      await schelling.reveal(1, 161, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888', accounts[8], { 'from': accounts[8]})
      let commitment9 = web3i.utils.soliditySha3(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999')
      await schelling.reveal(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999', accounts[9], { 'from': accounts[9]})
      let commitment10 = web3i.utils.soliditySha3(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      await schelling.reveal(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', accounts[10], { 'from': accounts[10]})
    })

    it('should not be able to reveal again', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await assertRevert(schelling.reveal(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
    })

    //
    // it('should be able to give proper random number', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   let res = {}
    //   let prng
    //   let val
    //   for (let i = 0; i < 10; i++) {
    //     prng = Number(await schelling.prng(10, 100))
    //     // ////console.log('prng', prng)
    //     await schelling.dum({'from': accounts[1]})
    //     if (!res[prng]) {
    //       res[prng] = 0
    //     }
    //     res[prng] = res[prng] + 1
    //   }
    //   // ////console.log('rand distribution:')
    //   for (var key in res) {
    //     val = res[key]
    //     // ////console.log(key, val)
    //   }
    // })

    it('should be able to elect random proposer', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setState(2)
      let res = {}
      let val
      biggestStakerId = await getBiggestStakerId(schelling)
      for (let i = 0; i < 10; i++) { // sample no
        await schelling.dum()

        let isElectedProposer
        for (let j = 0; ; j++) {
 // iternation

          for (let k = 1; k < 10; k++) { // node
            isElectedProposer = await schelling.isElectedProposer(j, biggestStakerId, k)
            if (isElectedProposer) {
              let node = await schelling.nodes(k)
              iteration = j
              electedProposer = k
              break
            }
          }
          if (isElectedProposer) break
        }

        if (!res[electedProposer]) {
          res[electedProposer] = 0
        }
        res[electedProposer] = res[electedProposer] + 1
      }

      for (var key in res) {
        val = res[key]
      }
    })

    it('should be able to propose if elected', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()

      await schelling.propose(1, 170, iteration, biggestStakerId, { 'from': accounts[electedProposer]})
      let block = await schelling.blocks(1)
      assert(Number(block.proposerId) === electedProposer)
      assert(Number(block.median) === 170)
    })

    it('should be able to giveSortedVotes', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await schelling.setState(3)

      // TODO check acutal weights from con tract
      let sortedVotes = [1, 4, 160, 161, 168, 1000000]
      let weights = [5000, 600000, 420000, 4000, 800000, 6000]

      let totalStakeRevealed = Number(await schelling.totalStakeRevealed(1))
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

      await schelling.giveSorted(1, sortedVotes, { 'from': accounts[20]})
      console.log('median', median)
      console.log('median contract', Number((await schelling.disputes(1, accounts[20])).median))
      assert(Number((await schelling.disputes(1, accounts[20])).accWeight) === totalStakeRevealed)
      assert(Number((await schelling.disputes(1, accounts[20])).median) === median)
      assert(Number((await schelling.disputes(1, accounts[20])).lastVisited) === sortedVotes[sortedVotes.length - 1])
    })
//
    it('should be able to giveSortedVotes in batches', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()

      let sortedVotes = [1, 4, 160, 161, 168, 1000000]
      let weights = [5000, 600000, 420000, 4000, 800000, 6000]
      let totalStakeRevealed = Number(await schelling.totalStakeRevealed(1))
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
      // //console.log('median', median)
      // //console.log('sevenFive', sevenFive)
      // //console.log('---------------------------')

      let tx = await schelling.giveSorted(1, sortedVotes.slice(0, 2), { 'from': accounts[21]})
      tx = await schelling.giveSorted(1, sortedVotes.slice(2, 4), { 'from': accounts[21]})
      // //console.log('gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      tx = await schelling.giveSorted(1, sortedVotes.slice(4, 6), { 'from': accounts[21]})
      assert(Number((await schelling.disputes(1, accounts[21])).accWeight) === totalStakeRevealed)
      assert(Number((await schelling.disputes(1, accounts[21])).median) === median)

      assert(Number((await schelling.disputes(1, accounts[21])).lastVisited) === sortedVotes[sortedVotes.length - 1])
    })

    it('should get reward for correct proposeAlt', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let proposerId = Number((await schelling.blocks(1)).proposerId)
      let proposerStake = Number((await schelling.nodes(proposerId)).stake)
      let totalStake = Number(await schelling.totalStake())

      await schelling.proposeAlt(1, { 'from': accounts[21]})
      let proposerStakeAfter = Number((await schelling.nodes(proposerId)).stake)
      let altProposerStakeAfter = Number((await schelling.nodes(11)).stake)
      totalStake = Number(await schelling.totalStake())
      assert(Number(proposerStakeAfter) === 0)

      assert(Number(await sch.balanceOf(accounts[21])) === Math.floor(proposerStake / 2))
      let block = await schelling.blocks(1)
      assert(Number(block.proposerId) === 0)
      assert(Number(block.median) === 160)
    })

    it('should be able to commit and get penalties in next epoch', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setEpoch(2)
      await schelling.setState(0)

      let medianLastEpoch = Number((await schelling.blocks(1)).median)
      console.log('medianLastEpoch', medianLastEpoch)
      let stakerId = Number(await schelling.nodeIds(accounts[8]))
      console.log('stakerId', stakerId)
      let voteLastEpoch = Number((await schelling.votes(1, stakerId)).value)
      console.log('voteLastEpoch', voteLastEpoch)
      let stakeBefore = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)
      let commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
      let tx = await schelling.commit(2, commitment1, { 'from': accounts[8]})
      console.log(Number(tx.logs[0].args.y))
      let stakeAfter = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
      if (voteLastEpoch < Math.floor(medianLastEpoch * 0.99) || voteLastEpoch > Math.floor(medianLastEpoch * 1.01)) {
        let expectedStakeAfer = stakeBefore - Math.floor((((medianLastEpoch - voteLastEpoch) ** 2 / medianLastEpoch ** 2) - 0.0001) * stakeBefore)
        console.log('expectedStakeAfer', expectedStakeAfer)
        assert(expectedStakeAfer === stakeAfter)
      }
      let rewardPool = Number(await schelling.rewardPool())

      console.log('rewardPool', rewardPool)
      let stakeGettingReward = Number(await schelling.stakeGettingReward())
      console.log('stakeGettingReward', stakeGettingReward)
      // assert(rewardPool ===(stakeBefore-stakeAfter))

      stakerId = Number(await schelling.nodeIds(accounts[4]))
      console.log('stakerId', stakerId)
      voteLastEpoch = Number((await schelling.votes(1, stakerId)).value)
      console.log('voteLastEpoch', voteLastEpoch)
      stakeBefore = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)
      commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
      tx = await schelling.commit(2, commitment1, { 'from': accounts[4]})
      console.log('y', Number(tx.logs[0].args.y))
      stakeAfter = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
      if (voteLastEpoch < Math.floor(medianLastEpoch * 0.99) || voteLastEpoch > Math.floor(medianLastEpoch * 1.01)) {
        let expectedStakeAfer = stakeBefore - Math.floor(((Math.floor((10000 * (medianLastEpoch - voteLastEpoch) ** 2) / medianLastEpoch ** 2) - 1) * stakeBefore) / 10000)
        console.log('expectedStakeAfer', expectedStakeAfer)
        assert(expectedStakeAfer === stakeAfter)
      }
      rewardPool = Number(await schelling.rewardPool())
      console.log('rewardPool', rewardPool)
      stakeGettingReward = Number(await schelling.stakeGettingReward())
      console.log('stakeGettingReward', stakeGettingReward)
      assert(rewardPool === (stakeBefore - stakeAfter))

      stakerId = Number(await schelling.nodeIds(accounts[10]))
      console.log('stakerId', stakerId)
      voteLastEpoch = Number((await schelling.votes(1, stakerId)).value)
      console.log('voteLastEpoch', voteLastEpoch)
      stakeBefore = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)
      let rewardPoolBefore = Number(await schelling.rewardPool())
      console.log('rewardPoolBefore', rewardPoolBefore)

      commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
      tx = await schelling.commit(2, commitment1, { 'from': accounts[10]})
      console.log(Number(tx.logs[0].args.y))
      stakeAfter = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
      if (voteLastEpoch > medianLastEpoch * 2) {
        let expectedStakeAfer = 0
        console.log('expectedStakeAfer', expectedStakeAfer)
        assert(expectedStakeAfer === stakeAfter)
      } else if (voteLastEpoch < Math.floor(medianLastEpoch * 0.99) || voteLastEpoch > Math.floor(medianLastEpoch * 1.01)) {
        let expectedStakeAfer = stakeBefore - Math.floor(((Math.floor((10000 * (medianLastEpoch - voteLastEpoch) ** 2) / medianLastEpoch ** 2) - 1) * stakeBefore) / 10000)
        console.log('expectedStakeAfer', expectedStakeAfer)
        assert(expectedStakeAfer === stakeAfter)
      }
      rewardPool = Number(await schelling.rewardPool())
      console.log('rewardPool', rewardPool)
      assert(rewardPool === rewardPoolBefore + (stakeBefore - stakeAfter))
    })

    it('should get rewards when revealed', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setState(1)
      let stakerId = Number(await schelling.nodeIds(accounts[8]))
      console.log('stakerId', stakerId)
      let stakeBefore = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeBefore', stakeBefore)
      tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[8], { 'from': accounts[8]})
      let stakeAfter = Number((await schelling.nodes(stakerId)).stake)
      console.log('stakeAfter', stakeAfter)
    })
    it('should get price last epoch', async function () {
      let schelling = await Schelling.deployed()
      let price = Number(await schelling.getPrice())
      console.log('price', price)
    })

    // it('should be able to unstake in next epoch', async function () {
    //   let schelling = await Schelling.deployed()
    //
    //   tx = await schelling.unstake(3, { 'from': accounts[5]})
    // })
    //
    // it('should not be able to withdraw in same epoch', async function () {
    //   let sch = await SimpleToken.deployed()
    //   let schelling = await Schelling.deployed()
    //
    //   await assertRevert(schelling.withdraw(3, { 'from': accounts[5]}))
    // })
    //
    // it('should not be able to withdraw if didnt reveal last epoch', async function () {
    //   let sch = await SimpleToken.deployed()
    //   let schelling = await Schelling.deployed()
    //   await schelling.setEpoch(4)
    //   await schelling.setState(0)
    //
    //   await assertRevert(schelling.withdraw(4, { 'from': accounts[5]}))
    // })

    // it('should be able to withdraw in next epoch if revealed last epoch', async function () {
    //   let sch = await SimpleToken.deployed()
    //   let schelling = await Schelling.deployed()
    //
    //   let commitment1 = web3i.utils.soliditySha3(4, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
    //   let tx = await schelling.commit(4, commitment1, { 'from': accounts[5]})
    //   // await schelling.setState(1)
    //   // tx = await schelling.reveal(4, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[5], { 'from': accounts[5]})
    //   // await schelling.setEpoch(5)
    //   //
    //   // await schelling.withdraw(5, { 'from': accounts[5]})
    // })

    //
    // it('should be able to commit in next epoch', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   await schelling.setEpoch(2)
    //
    //   // let maxStakers = Number(await schelling.maxNodes())
    //   // for (let i = 0; i < maxStakers; i++) {
    //     // ////console.log('activeNodes ', i, Number(await schelling.activeNodes(i)))
    //   // }
    //   let commitment1 = web3i.utils.soliditySha3(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')
    //   let tx = await schelling.commit(2, commitment1, { 'from': accounts[6]})
    //   // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
    //   // ////console.log('c', commitment)
    //
    //   // stake6 = (await schelling.nodes(6)).stake
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
    //   let staker = await schelling.nodes(6)
    //   // //console.log('epochLastRevealed', staker.epochLastRevealed.toString())// === '42000')
    //   staker = await schelling.nodes(6)
    //   // //console.log('stake6', staker.stake.toString())// === '42000')
    //   // //console.log('currentEpoch', Number((await schelling.c()).EPOCH))// === '42000')
    //   let tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[6], { 'from': accounts[6]})
    //   // ////console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
    //   staker = await schelling.nodes(6)
    //   // //console.log('stake6', staker.stake.toString())// === '42000')
    //   staker = await schelling.nodes(4)
    //   // //console.log('stake4', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[4], { 'from': accounts[4]})
    //   // ////console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
    //   staker = await schelling.nodes(4)
    //   // //console.log('stake4', staker.stake.toString())
    //
    //   staker = await schelling.nodes(3)
    //   // //console.log('stake3', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[3], { 'from': accounts[3]})
    //   staker = await schelling.nodes(3)
    //   // //console.log('stake3', staker.stake.toString())
    //
    //   staker = await schelling.nodes(7)
    //   // //console.log('stake7', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[7], { 'from': accounts[7]})
    //   staker = await schelling.nodes(7)
    //   // //console.log('stake7', staker.stake.toString())
    //
    //   staker = await schelling.nodes(8)
    //   // //console.log('stake8', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[8], { 'from': accounts[8]})
    //   staker = await schelling.nodes(8)
    //   // //console.log('stake8', staker.stake.toString())
    //
    //   staker = await schelling.nodes(9)
    //   // //console.log('stake9', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[9], { 'from': accounts[9]})
    //   staker = await schelling.nodes(9)
    //   // //console.log('stake9', staker.stake.toString())
    //
    //   staker = await schelling.nodes(10)
    //   // //console.log('stake10', staker.stake.toString())
    //   tx = await schelling.reveal(2, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000', accounts[10], { 'from': accounts[10]})
    //   staker = await schelling.nodes(10)
    //   // //console.log('stake10', staker.stake.toString())
    //   // assert(staker.stake.toString() === '42000')
    //
    //   // //console.log('stakeGettingPenalty', Number((await schelling.blocks(1)).stakeGettingPenalty))
//     //   // //console.log('stakeGettingReward', Number((await schelling.blocks(1)).stakeGettingReward))
    // })
  })
})
