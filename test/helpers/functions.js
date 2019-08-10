
let Web3 = require('web3')

let web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})

async function getBiggestStakeAndId (schelling) {
// async function getBiggestStakeAndId (schelling) {
  let numStakers = await schelling.numStakers()
  let biggestStake = 0
  let biggestStakerId = 0
  for (let i = 1; i <= numStakers; i++) {
    let stake = Number((await schelling.stakers(i)).stake)
    if (stake > biggestStake) {
      biggestStake = stake
      biggestStakerId = i
    }
  }
  return ([biggestStake, biggestStakerId])
}

async function prng (seed, max, blockHashes) {
  let hashh = await prngHash(seed, blockHashes)
  let sum = web3.utils.toBN(hashh)
  max = web3.utils.toBN(max)
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

