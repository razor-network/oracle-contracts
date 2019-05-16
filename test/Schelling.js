/* global contract, it, artifacts, assert, web3 */
/* jshint esversion: 8 */

// // TODO:
// // test same vote values, stakes
// // test kicking out when smallest stake is not original
// // add events
const { assertRevert } = require('./helpers/assertRevert')
let Schelling = artifacts.require('./Schelling.sol')
let SimpleToken = artifacts.require('./SimpleToken.sol')
let Web3 = require('web3')
let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8546', null, {})
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

async function printList (ll) {
  // //console.log('letsloop ---------------------------------------------')
  let rootNodeId = Number(await ll.rootNodeId())
  // //console.log('rootNodeId', rootNodeId)
  let i = rootNodeId
  while (true) {
    // //console.log('id', Number((await ll.nodes(i)).id))
    // //console.log('stake', Number((await ll.nodes(i)).stake))
    // //console.log('epochLastCommitted', Number((await ll.nodes(i)).epochLastCommitted))
    // //console.log('epochLastRevealed', Number((await ll.nodes(i)).epochLastRevealed))
    // //console.log('previousNodeId', Number((await ll.nodes(i)).previousNodeId))
    // //console.log('nextNodeId', Number((await ll.nodes(i)).nextNodeId))
    // //console.log('activeNodesArrayId', Number((await ll.nodes(i)).activeNodesArrayId))
    if (Number((await ll.nodes(i)).nextNodeId) === 0) break
    i = Number((await ll.nodes(i)).nextNodeId)
  }
  // //console.log('------------------------------------------')
}

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
      // //console.log(nodeId.toString())
      assert(nodeId.toString() === '1')
      let numStakers = await schelling.numNodes()
      // ////console.log(numStakers.toString())
      assert(numStakers.toString() === '1')
      let staker = await schelling.nodes(1)
      // ////console.log('lol', staker.id.toString())
      assert(staker.id.toString() === '1')
      assert(staker.stake.toString() === '420000')
      // assert(staker.nextNodeId.toString() === '0')
      // let rootNodeId = await schelling.rootNodeId()
      // assert(rootNodeId.toString() === staker.id.toString())
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
      // ////console.log(stakerId.toString())
      assert(stakerId.toString() === '2')
      let numStakers = await schelling.numNodes()
      // ////console.log(numStakers.toString())
      assert(numStakers.toString() === '2')
      let staker = await schelling.nodes(2)
      // ////console.log('lol', staker.id.toString())
      assert(staker.id.toString() === '2')
      assert(staker.stake.toString() === '19000')
      // assert(staker.nextNodeId.toString() === '0')
      // let rootNodeId = await schelling.rootNodeId()
      // assert(rootNodeId.toString() === '1')
      let totalStake = await schelling.totalStake()
      assert(totalStake.toString() === '439000')
      // let staker1 = await schelling.nodes(1)
      // assert(staker1.nextNodeId.toString() === '2')
    })
    //
    // it('should revert if incorrect previousStakerId given by new biggest staker', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   await sch.approve(schelling.address, 800000, { 'from': accounts[3]})
    //   await assertRevert(schelling.stake(2, 800000, { 'from': accounts[3]}))
    //   // await assertRevert(schelling.stake(1, 800000, { 'from': accounts[3]}))
    //   // await assertRevert(schelling.stake(1, 800000, { 'from': accounts[3]}))
    //   // await assertRevert(schelling.stake(1, 800000, { 'from': accounts[3]}))
    //   // await assertRevert(schelling.stake(1, 800000, { 'from': accounts[3]}))
    //   let totalStake = await schelling.totalStake()
    //   assert(totalStake.toString() === '439000')
    // })

    // it('should revert if incorrect previousStakerId given by non biggest staker', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   // await sch.approve(schelling.address, 800000, { 'from': accounts[3]})
    //   await assertRevert(schelling.stake(1, 20, 300000, { 'from': accounts[3]}))
    //   await assertRevert(schelling.stake(1, 0, 300000, { 'from': accounts[3]}))
    //   await assertRevert(schelling.stake(1, 2, 300000, { 'from': accounts[3]}))
    //   await assertRevert(schelling.stake(1, 3, 300000, { 'from': accounts[3]}))
    //   await assertRevert(schelling.stake(1, 4, 300000, { 'from': accounts[3]}))
    //   let totalStake = await schelling.totalStake()
    //   assert(totalStake.toString() === '439000')
    //   // printList(schelling)
    // })
//
    it('should handle other stakers correctly', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await sch.approve(schelling.address, 800000, { 'from': accounts[3]})
      let tx = await schelling.stake(1, 800000, { 'from': accounts[3]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      let stakerId = await schelling.nodeIds(accounts[3])

      // ////console.log(stakerId.toString())
      assert(stakerId.toString() === '3')
      let numStakers = await schelling.numNodes()
      // ////console.log(numStakers.toString())
      assert(numStakers.toString() === '3')
      let staker = await schelling.nodes(3)
      // ////console.log('lol', staker.id.toString())
      // ////console.log('rootNodeId', Number(await schelling.rootNodeId()))
      assert(staker.id.toString() === '3')
      assert(staker.stake.toString() === '800000')
      // assert(staker.nextNodeId.toString() === '1')
      // let rootNodeId = await schelling.rootNodeId()
      // assert(rootNodeId.toString() === '3')
      let staker1 = await schelling.nodes(1)
      // ////console.log('lmao', staker1.nextNodeId.toString())
      // assert(staker1.nextNodeId.toString() === '2')
      let totalStake = await schelling.totalStake()
      // ////console.log(totalStake.toString())
      assert(totalStake.toString() === '1239000')
      //
      await sch.approve(schelling.address, 600000, { 'from': accounts[4]})
      tx = await schelling.stake(1, 600000, { 'from': accounts[4]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      //
      await sch.approve(schelling.address, 2000, { 'from': accounts[5]})
      tx = await schelling.stake(1, 2000, { 'from': accounts[5]})
      // //console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      await sch.approve(schelling.address, 700000, { 'from': accounts[6]})
      tx = await schelling.stake(1, 700000, { 'from': accounts[6]})
      // // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      await sch.approve(schelling.address, 3000, { 'from': accounts[7]})
      tx = await schelling.stake(1, 3000, { 'from': accounts[7]})

      await sch.approve(schelling.address, 1000, { 'from': accounts[8]})
      tx = await schelling.stake(1, 1000, { 'from': accounts[8]})

      await sch.approve(schelling.address, 5000, { 'from': accounts[9]})
      tx = await schelling.stake(1, 5000, { 'from': accounts[9]})
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      // await printList(schelling)
      // //console.log('totalStake', Number(await schelling.totalStake()))

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
      // ////console.log('epoch is', Number(await schelling.EPOCH()))
      let commitment1 = web3i.utils.soliditySha3(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      let tx = await schelling.commit(1, commitment1, { 'from': accounts[1]})
      // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      // ////console.log('c', commitment)
      let solCommitment = await schelling.commitments(1, 1)
      // ////console.log('sc', solCommitment)
      assert(commitment1.toString() === solCommitment.toString())

      // commit from account2
      let commitment2 = web3i.utils.soliditySha3(1, 170, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      tx = await schelling.commit(1, commitment2, { 'from': accounts[2]})
      // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      //
      let commitment3 = web3i.utils.soliditySha3(1, 168, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9333')
      tx = await schelling.commit(1, commitment3, { 'from': accounts[3]})
      // // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      // //
      let commitment4 = web3i.utils.soliditySha3(1, 4, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9444')
      tx = await schelling.commit(1, commitment4, { 'from': accounts[4]})
      // // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      //
      let commitment7 = web3i.utils.soliditySha3(1, 169, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9777')
      tx = await schelling.commit(1, commitment7, { 'from': accounts[7]})
      // // // ////console.log('commit gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      // //
      let commitment8 = web3i.utils.soliditySha3(1, 10, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888')
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
      // let commitment = web3i.utils.soliditySha3(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
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
      // ////console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      tx = await schelling.reveal(1, 4, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9444', accounts[4], { 'from': accounts[4]})
      // ////console.log('reveal gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      let commitment8 = web3i.utils.soliditySha3(1, 10, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888')
      await schelling.reveal(1, 10, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9888', accounts[8], { 'from': accounts[8]})
      let commitment9 = web3i.utils.soliditySha3(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999')
      await schelling.reveal(1, 1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9999', accounts[9], { 'from': accounts[9]})
      let commitment10 = web3i.utils.soliditySha3(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111')
      await schelling.reveal(1, 1000000, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9111', accounts[10], { 'from': accounts[10]})
    })
//
    it('should not be able to reveal again', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await assertRevert(schelling.reveal(1, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', accounts[1], { 'from': accounts[1]}))
    })

// // //
// // //     it('should be able to give proper random number', async function () {
// // //       let schelling = await Schelling.deployed()
// // //       let sch = await SimpleToken.deployed()
// // //       let res = {}
// // //       let prng
// // //       let val
// // //       for (let i = 0; i < 10; i++) {
// // //         prng = Number(await schelling.prng(10, 100))
// // //         // ////console.log('prng', prng)
// // //         await schelling.dum({'from': accounts[1]})
// // //         if (!res[prng]) {
// // //           res[prng] = 0
// // //         }
// // //         res[prng] = res[prng] + 1
// // //       }
// // //       // ////console.log('rand distribution:')
// // //       for (var key in res) {
// // //         val = res[key]
// // //         // ////console.log(key, val)
// // //       }
// // //     })
// //

    it('should be able to elect random proposer', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setState(2)
      // let sch = await SimpleToken.deployed()
      let res = {}
      // let totalStake = await schelling.totalStake()
      let val
      biggestStakerId = await getBiggestStakerId(schelling)
      // //console.log('biggestStakerId', Number(biggestStakerId))
      for (let i = 0; i < 10; i++) { // sample no
        await schelling.dum()

        let isElectedProposer
        // ////console.log('i', i)
        for (let j = 0; ; j++) { // iternation
          // ////console.log('j', j)

          for (let k = 1; k < 10; k++) { // node
            isElectedProposer = await schelling.isElectedProposer(j, biggestStakerId, k)
            // //console.log('isElectedProposer', isElectedProposer)
            if (isElectedProposer) {
              let node = await schelling.nodes(k)
              iteration = j
              electedProposer = k
              // console.log('i,j,electedProposer,nodeId, stake', i, j, electedProposer, Number(node.id), Number(node.stake))
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
      // //console.log('proposer distribution:')

      for (var key in res) {
        val = res[key]
        // //console.log(key, val)
      }
    })
//
//     // it('should not be able to propose if not elected', async function () {
//     //   let schelling = await Schelling.deployed()
//     //   let sch = await SimpleToken.deployed()
//     //   let electedProposer = 2
//     //   // let electedProposer = Number(await schelling.electedProposer())
//     //   // ////console.log('electedProposer', electedProposer)
//     //   let i = 1
//     //   for (i = 1; i < 6; i++) {
//     //     if (i != electedProposer) break
//     //   }
//     //   await assertRevert(schelling.propose(1, 170, 160, 180, 20, 50, { 'from': accounts[2]})) //TODO i
//     // })
//
    it('should be able to propose if elected', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()

      // let electedProposer = 1 // Number(await schelling.electedProposer())
      // //console.log('electedProposer', electedProposer)
      // await schelling.propose(1, 170, 160, 180, 20, 50, { 'from': accounts[electedProposer]})
      // function propose (uint256 epoch,
      //                 uint256 median,
      //                 uint256 twoFive,
      //                 uint256 sevenFive,
      //                 uint256 stakeGettingPenalty,
      //                 uint256 stakeGettingReward,
      //                 uint256 iteration,
      //                 uint256 biggestStakerId) public {
      await schelling.propose(1, 170, 160, 180, 20, 50, iteration, biggestStakerId, { 'from': accounts[electedProposer]})
      let block = await schelling.blocks(1)
      // //console.log('(Number(block.proposerId)', Number(block.proposerId))
      // //console.log('Number(block.median)', Number(block.median))
      // //console.log('Number(block.twoFive)', Number(block.twoFive))
      // //console.log('Number(block.sevenFive', Number(block.sevenFive))
      assert(Number(block.proposerId) === electedProposer)
      assert(Number(block.median) === 170)
      assert(Number(block.twoFive) === 160)
      assert(Number(block.sevenFive) === 180)
    })

    it('should be able to giveSortedVotes', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await schelling.setState(3)

      // TODO check acutal weights from con tract
      let sortedVotes = [1, 4, 10, 160, 168, 1000000]
      let weights = [5000, 600000, 4000, 420000, 800000, 6000]
      // ////console.log(Number(await schelling.voteWeights(1, 4)),
      // Number(await schelling.voteWeights(1, 10)),
      // Number(await schelling.voteWeights(1, 160)),
      // Number(await schelling.voteWeights(1, 168)))

      let totalStakeRevealed = Number(await schelling.totalStakeRevealed(1))
      let medianWeight = totalStakeRevealed / 2
      let twoFiveWeight = totalStakeRevealed / 4
      let sevenFiveWeight = totalStakeRevealed * 3 / 4
      let i = 0
      let twoFive = 0
      let sevenFive = 0
      let median = 0
      let weight = 0
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i]

        if (weight > twoFiveWeight && twoFive === 0) twoFive = sortedVotes[i]
        if (weight > medianWeight && median === 0) median = sortedVotes[i]
        if (weight > sevenFiveWeight && sevenFive === 0) sevenFive = sortedVotes[i]
      }
      // //console.log('totalStakeRevealed', totalStakeRevealed)
      // //console.log('medianWeight', medianWeight)
      // //console.log('twoFiveWeight', twoFiveWeight)
      // //console.log('sevenFiveWeight', sevenFiveWeight)
      // //console.log('twofive', twoFive)
      // //console.log('median', median)
      // //console.log('sevenFive', sevenFive)
      // //console.log('---------------------------')
// giveSorted(uint256 epoch, uint256[] memory sorted) public {

      await schelling.giveSorted(1, sortedVotes, { 'from': accounts[20]})
      // ////console.log('dispute', await schelling.disputes(1, accounts[20]))
      // //console.log('Number((await schelling.disputes(1, accounts[20])).twoFive)', Number((await schelling.disputes(1, accounts[20])).twoFive))
      // //console.log('accweight', Number((await schelling.disputes(1, accounts[20])).accWeight))
      assert(Number((await schelling.disputes(1, accounts[20])).accWeight) === totalStakeRevealed)
      assert(Number((await schelling.disputes(1, accounts[20])).twoFive) === twoFive)
      assert(Number((await schelling.disputes(1, accounts[20])).median) === median)
      assert('sevenFive', Number((await schelling.disputes(1, accounts[20])).sevenFive) === sevenFive)
      assert(Number((await schelling.disputes(1, accounts[20])).lastVisited) === sortedVotes[sortedVotes.length - 1])
      // let electedProposer = Number(await schelling.electedProposer())
      // ////console.log('electedProposer', electedProposer)
      // await schelling.propose(1, 170, 160, 180, { 'from': accounts[electedProposer]})
      // let block = await schelling.blocks(1)
      // assert(Number(block.median) === 170)
      // assert(Number(block.twoFive) === 160)
      // assert(Number(block.sevenFive) === 180)
    })
//
    it('should be able to giveSortedVotes in batches', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()

      let sortedVotes = [1, 4, 10, 160, 168, 1000000]
      let weights = [5000, 600000, 4000, 420000, 800000, 6000]
      let totalStakeRevealed = Number(await schelling.totalStakeRevealed(1))
      let medianWeight = totalStakeRevealed / 2
      let twoFiveWeight = totalStakeRevealed / 4
      let sevenFiveWeight = totalStakeRevealed * 3 / 4
      let i = 0
      let twoFive = 0
      let sevenFive = 0
      let median = 0
      let weight = 0
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i]

        if (weight >= twoFiveWeight && twoFive === 0) twoFive = sortedVotes[i]
        if (weight > medianWeight && median === 0) median = sortedVotes[i]
        if (weight > sevenFiveWeight && sevenFive === 0) sevenFive = sortedVotes[i]
      }
      // //console.log('totalStakeRevealed', totalStakeRevealed)
      // //console.log('medianWeight', medianWeight)
      // //console.log('twoFiveWeight', twoFiveWeight)
      // //console.log('sevenFiveWeight', sevenFiveWeight)
      // //console.log('twofive', twoFive)
      // //console.log('median', median)
      // //console.log('sevenFive', sevenFive)
      // //console.log('---------------------------')
    // giveSorted(uint256 epoch, uint256[] memory sorted) public {

      let tx = await schelling.giveSorted(1, sortedVotes.slice(0, 2), { 'from': accounts[21]})
      // //console.log(Number((await schelling.disputes(1, accounts[21])).accWeight))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).twoFive))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).median))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).stakeGettingReward))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).stakeGettingPenalty))
      // //console.log('gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      tx = await schelling.giveSorted(1, sortedVotes.slice(2, 4), { 'from': accounts[21]})
      // //console.log(Number((await schelling.disputes(1, accounts[21])).accWeight))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).twoFive))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).median))

      // //console.log(Number((await schelling.disputes(1, accounts[21])).stakeGettingReward))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).stakeGettingPenalty))
      // //console.log('gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      tx = await schelling.giveSorted(1, sortedVotes.slice(4, 6), { 'from': accounts[21]})
      // //console.log(Number((await schelling.disputes(1, accounts[21])).accWeight))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).twoFive))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).median))

      // //console.log(Number((await schelling.disputes(1, accounts[21])).stakeGettingReward))
      // //console.log(Number((await schelling.disputes(1, accounts[21])).stakeGettingPenalty))
      // //console.log('gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

          // ////console.log('dispute', await schelling.disputes(1, accounts[20]))
      assert(Number((await schelling.disputes(1, accounts[21])).accWeight) === totalStakeRevealed)
      assert(Number((await schelling.disputes(1, accounts[21])).twoFive) === twoFive)
      assert(Number((await schelling.disputes(1, accounts[21])).median) === median)
      assert('sevenFive', Number((await schelling.disputes(1, accounts[21])).sevenFive) === sevenFive)

      assert(Number((await schelling.disputes(1, accounts[21])).lastVisited) === sortedVotes[sortedVotes.length - 1])
          // let electedProposer = Number(await schelling.electedProposer())
          // ////console.log('electedProposer', electedProposer)
          // await schelling.propose(1, 170, 160, 180, { 'from': accounts[electedProposer]})
          // let block = await schelling.blocks(1)
          // assert(Number(block.median) === 170)
          // assert(Number(block.twoFive) === 160)
          // assert(Number(block.sevenFive) === 180)
    })
//
    it('should get reward for correct proposeAlt', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      let proposerId = Number((await schelling.blocks(1)).proposerId)
      // ////console.log('proposerId', proposerId)
      let proposerStake = Number((await schelling.nodes(proposerId)).stake)
      // //console.log('proposerStake', proposerStake)

      await schelling.proposeAlt(1, { 'from': accounts[21]})
      let proposerStakeAfter = Number((await schelling.nodes(proposerId)).stake)
      // //console.log('proposerStakeAfter', Number(proposerStakeAfter))
      let altProposerStakeAfter = Number((await schelling.nodes(11)).stake)
      // //console.log('altProposerStakeAfter', Number(altProposerStakeAfter))

      // //console.log('balanceOf alt proposer', Number(await sch.balanceOf(accounts[21])))
      assert(Number(proposerStakeAfter) === 0)

      assert(Number(await sch.balanceOf(accounts[21])) === Math.floor(proposerStake / 2))
      let block = await schelling.blocks(1)
      assert(Number(block.proposerId) === 0)
      assert(Number(block.median) === 160)
      assert(Number(block.twoFive) === 4)
      assert(Number(block.sevenFive) === 168)
    })

    it('should be able to unstake in next epoch', async function () {
      let schelling = await Schelling.deployed()
      await schelling.setEpoch(3)
      tx = await schelling.unstake(3, { 'from': accounts[5]})
    })

    it('should be able to withdraw', async function () {
      let sch = await SimpleToken.deployed()
      let schelling = await Schelling.deployed()
      await schelling.setEpoch(5)
      await schelling.setState(0)

      let commitment1 = web3i.utils.soliditySha3(5, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000')

      await schelling.commit(5, commitment1, { 'from': accounts[5]})
      await schelling.setState(1)

      tx = await schelling.reveal(5,
                                160,
                                '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9000',
                                accounts[5],
                                { 'from': accounts[5]})

      // console.log('balanceBeforeWIthdrawal', Number(await sch.balanceOf(accounts[5])))
      // console.log('stakeBeforeWIthdrawal', Number((await schelling.nodes(5)).stake))
      tx = await schelling.withdraw(5, { 'from': accounts[5]})
      // console.log('balanceAfterWIthdrawal', Number(await sch.balanceOf(accounts[5])))
      // console.log('stakeAfterWIthdrawal', Number((await schelling.nodes(5)).stake))
    })

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
    //   // //console.log('stakeGettingReward', Number((await schelling.blocks(1)).stakeGettingReward))
    // })
  })
})
