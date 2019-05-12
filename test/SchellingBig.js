/* global contract, it, artifacts, assert, web3 */
// / result: for 999 votes, gas used, usd cost 4315032 2.8945234656

const { assertRevert } = require('./helpers/assertRevert')
let Schelling = artifacts.require('./Schelling.sol')
let SimpleToken = artifacts.require('./SimpleToken.sol')
let Web3 = require('web3')
let web3 = new Web3(Web3.givenProvider || 'ws://localhost:8546', null, {})
// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// let gasPrice = new web3.utils.BN(20000000000)
let dollarPerGas = 6.708e-7

// ether
const PRICE = 0
const STAKE = 1

let gVotes = []

// let gWeights
let totalVotes = 999
let meanVote = 1600000
let meanWeight = 20000000
let i = 2000000
let contender
while (gVotes.length < totalVotes) {
  // contender = [Math.floor(meanVote + (Math.random() * 100) - 50), Math.floor(meanWeight + (Math.random() * 100) - 500)]
  // if (gVotes.length > 1 && contender[STAKE] === gVotes[gVotes.length - 1]) continue
  // gVotes.push([Math.floor(meanVote + (Math.random() * 100) - 50), Math.floor(meanWeight + (Math.random() * 100) - 500)])
  gVotes.push([i - 1800, i - 1])
  i--
}
// console.log(gVotes)
// gVotes.sort(function (a, b) { return b[STAKE] - a[STAKE] })
// console.log(gVotes)
contract('Schelling', function (accounts) {
  contract('SimpleToken', function () {
    it('should be able to stake', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await schelling.setEpoch(1, { 'from': accounts[1]})
      for (i = 0; i < gVotes.length; i++) {
        // let prev = ((i > 0) ? (i - 1) : 0)
        await sch.transfer(accounts[i + 1], gVotes[i][STAKE], { 'from': accounts[0]})
        await sch.approve(schelling.address, gVotes[i][STAKE], { 'from': accounts[i + 1]})
        // let tx = await schelling.stake(1, 19000, { 'from': accounts[2]})

        await schelling.stake(1, gVotes[i][STAKE], { 'from': accounts[i + 1]})
      }
      console.log('staked', i)
    })

    // it('should form the linked list of stakers correctly', async function () {
    //   let schelling = await Schelling.deployed()
    //   let sch = await SimpleToken.deployed()
    //   let id
    //   console.log('lets verify id list')
    //   for (let i = 0; i < 10; i++) {
    //     id = await schelling.stakers(i)
    //     console.log(i, String(id.id), String(id.stake), String(id.nextStakerId))
    //   }
    // })
//
    it('should be able to commit', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      for (i = 0; i < gVotes.length; i++) {
        // console.log(1, web3.utils.soliditySha3(0, gVotes[i][PRICE], web3.utils.soliditySha3(i)))
        await schelling.commit(1, web3.utils.soliditySha3(1, gVotes[i][PRICE], web3.utils.soliditySha3(i)), { 'from': accounts[i + 1]})
      }
      console.log('commited', i)
      // console.log('c', commitment)
    })
//
    it('should be able to reveal', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await schelling.setState(1, { 'from': accounts[1]})

      // let commitment = web3.utils.soliditySha3(0, 160, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      for (i = 0; i < gVotes.length; i++) {
        // console.log(1, gVotes[i][PRICE], web3.utils.soliditySha3(i), accounts[i + 1])
        await schelling.reveal(1, gVotes[i][PRICE], web3.utils.soliditySha3(i), accounts[i + 1], { 'from': accounts[i + 1]})
      }
      console.log('revealed', i)
    })

//     it('should be able to elect random proposer', async function () {
//       let schelling = await Schelling.deployed()
//       let sch = await SimpleToken.deployed()
//       let res = {}
//       let electedProposer
//       let val
//       let totalStake = await schelling.totalStake()
//       console.log('totalStake', Number(totalStake))
//       for (let i = 0; i < 10; i++) {
//         electedProposer = await schelling.electedProposer()
//         await schelling.dum({'from': accounts[1]})
//         // if (Number(electedProposer[2]) === 5) {
//           // console.log('originalRand, rand,nextStakerId, nextStakerId.stake', Number(electedProposer[0]), Number(electedProposer[1]), Number(electedProposer[2]), Number(electedProposer[3]), Number(electedProposer[4]))
//         // }
//         if (!res[electedProposer]) {
//           res[electedProposer] = 0
//         }
//         res[electedProposer] = res[electedProposer] + 1
//       }
//       console.log('proposer distribution:')
//
//       for (var key in res) {
//         val = res[key]
//         console.log(key, val)
//       }
//     })
//
//     it('should be able to propose if elected', async function () {
//       let schelling = await Schelling.deployed()
//       let sch = await SimpleToken.deployed()
//       let electedProposer = Number(await schelling.electedProposer())
//       console.log('electedProposer', electedProposer)
//       await schelling.propose(0, 170, 160, 180, { 'from': accounts[electedProposer]})
//       let block = await schelling.blocks(0)
//       assert(Number(block.proposerId) === electedProposer)
//       assert(Number(block.median) === 170)
//       assert(Number(block.twoFive) === 160)
//       assert(Number(block.sevenFive) === 180)
//     })
//
    it('should be able to giveSortedVotes', async function () {
      let schelling = await Schelling.deployed()
      let sch = await SimpleToken.deployed()
      await schelling.setState(3, { 'from': accounts[1]})

      // sortedVotes = [4, 160, 168, 170, 2000]
      // weights = [600, 420, 800, 19, 2]
      let totalStake = Number(await schelling.totalStakeRevealed(1))
      let medianWeight = totalStake / 2
      let twoFiveWeight = totalStake / 4
      let sevenFiveWeight = totalStake * 3 / 4
      let i = 0
      let twoFive = 0
      let sevenFive = 0
      let median = 0
      let weight = 0
      let sortedVotes = []
      let sortedWeights = []
      for (let i = 0; i < gVotes.length; i++) {
        sortedVotes.unshift(gVotes[i][PRICE])
        sortedWeights.unshift(gVotes[i][STAKE])
      }

      for (i = 0; i < sortedVotes.length; i++) {
        weight += sortedWeights[i]

        if (weight > twoFiveWeight && twoFive === 0) twoFive = sortedVotes[i]
        if (weight > medianWeight && median === 0) median = sortedVotes[i]
        if (weight > sevenFiveWeight && sevenFive === 0) sevenFive = sortedVotes[i]
      }
      console.log('totalStake', totalStake)
      console.log('medianWeight', medianWeight)
      console.log('twoFiveWeight', twoFiveWeight)
      console.log('sevenFiveWeight', sevenFiveWeight)
      console.log('twofive', twoFive)
      console.log('median', median)
      console.log('sevenFive', sevenFive)
      console.log('---------------------------')
// giveSorted(uint256 epoch, uint256[] memory sorted) public {

      // console.log('sortedVotes', sortedVotes)
      let tx
      let cursor
      let to
      while (Number((await schelling.disputes(1, accounts[5])).accWeight) < totalStake) {
        cursor = sortedVotes.indexOf(Number((await schelling.disputes(1, accounts[5])).lastVisited)) + 1
        if (cursor + 1000 > sortedVotes.length) {
          to = sortedVotes.length
        } else {
          to = cursor + 1000
        }
        tx = await schelling.giveSorted(1, sortedVotes.slice(cursor, to), { 'from': accounts[5]})
        console.log('gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)
      }

      // console.log('dispute', await schelling.disputes(0, accounts[5]))
      assert(Number((await schelling.disputes(1, accounts[5])).accWeight) === totalStake)
      assert(Number((await schelling.disputes(1, accounts[5])).twoFive) === twoFive)
      assert(Number((await schelling.disputes(1, accounts[5])).median) === median)
      assert('sevenFive', Number((await schelling.disputes(1, accounts[5])).sevenFive) === sevenFive)
      assert(Number((await schelling.disputes(1, accounts[5])).lastVisited) === sortedVotes[sortedVotes.length - 1])

      // let electedProposer = Number(await schelling.electedProposer())
      // console.log('electedProposer', electedProposer)
      // await schelling.propose(0, 170, 160, 180, { 'from': accounts[electedProposer]})
      // let block = await schelling.blocks(0)
      // assert(Number(block.median) === 170)
      // assert(Number(block.twoFive) === 160)
      // assert(Number(block.sevenFive) === 180)
    })
//
//     it('should get reward for correct proposeAlt', async function () {
//       let schelling = await Schelling.deployed()
//       let sch = await SimpleToken.deployed()
//       let proposerId = Number((await schelling.blocks(0)).proposerId)
//       console.log('proposerId', proposerId)
//       let proposerStake = Number((await schelling.stakers(proposerId)).stake)
//       console.log('proposerStake', proposerStake)
//
//       await schelling.proposeAlt(0, { 'from': accounts[5]})
//       let proposerStakeAfter = Number((await schelling.stakers(proposerId)).stake)
//
//       console.log('Number(proposerStakeAfter)', Number(proposerStakeAfter))
//       console.log('await sch.balanceOf(accounts[5]))', Number(await sch.balanceOf(accounts[5])))
//       assert(Number(proposerStakeAfter) === 0)
//       assert(Number(await sch.balanceOf(accounts[5])) === Math.floor(proposerStake / 2))
//       let block = await schelling.blocks(0)
//       assert(Number(block.proposerId) === 5)
//       assert(Number(block.median) === 160)
//       assert(Number(block.twoFive) === 4)
//       assert(Number(block.sevenFive) === 168)
//     })
  })
})
