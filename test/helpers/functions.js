const { promisify } = require("util");
let Web3 = require('web3')

let web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
const BN = require("bn.js");
const epochLength = new BN(40);
const numStates = new BN(4);
const stateLength = new BN(10);

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

async function getIteration (random, biggestStake, stake, stakerId, numStakers, blockHashes) {
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

const waitNBlocks = async n => {
  const sendAsync = promisify(web3.currentProvider.send);
  await Promise.all(
    [...Array(n).keys()].map(i =>
      sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: i
      })
    )
  );
};

const getEpoch = async () => {
  let blockNumber = new BN(await web3.eth.getBlockNumber());
  return blockNumber.div(epochLength).toNumber();
};

const getState = async () => {
  let blockNumber = new BN(await web3.eth.getBlockNumber());
  let state = blockNumber.div(epochLength.div(numStates));
  return state.mod(numStates).toNumber();
};

const mineAdvance = async n => {
  n = new BN(n);
  let blockNumber = new BN(await web3.eth.getBlockNumber());
  if (n.gt(blockNumber)) {
    let diff = n.sub(blockNumber);
    await waitNBlocks(diff.toNumber());
  }
};

// Mines to the next Epoch from which ever block it is in the current Epoch
const mineToNextEpoch = async () => {
  let currentBlockNumber = await web3.eth.getBlockNumber();
  let currentEpoch = await getEpoch();
  let nextEpochBlockNum = (currentEpoch + 1) * epochLength.toNumber();
  let diff = nextEpochBlockNum - currentBlockNumber;
  await waitNBlocks(diff);
};

// Mines to the next state in the current epoch
const mineToNextState = async () => {
  let currentBlockNumber = new BN(await web3.eth.getBlockNumber());
  let temp = currentBlockNumber.div(stateLength);
  temp = temp.add(new BN(1));
  let nextStateBlockNum = temp.mul(stateLength);
  let diff = nextStateBlockNum.sub(currentBlockNumber);
  await waitNBlocks(diff.toNumber());
}

module.exports = {
  getBiggestStakeAndId: getBiggestStakeAndId,
  prng: prng,
  prngHash: prngHash,
  getIteration: getIteration,
  isElectedProposer: isElectedProposer,
  waitNBlocks: waitNBlocks,
  getEpoch: getEpoch,
  getState: getState,
  mineAdvance: mineAdvance,
  mineToNextEpoch: mineToNextEpoch,
  mineToNextState: mineToNextState
}
