const { BigNumber } = require('ethers');

const epochLength = BigNumber.from(40);
const numStates = BigNumber.from(4);
const stateLength = BigNumber.from(10);

const send = (payload) => {
  if (!payload.jsonrpc) payload.jsonrpc = '2.0';
  if (!payload.id) payload.id = new Date().getTime();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send(payload, (error, result) => {
      if (error) return reject(error);

      return resolve(result);
    });
  });
};

const getBiggestStakeAndId = async (schelling) => {
  const numStakers = await schelling.numStakers();
  let biggestStake = 0;
  let biggestStakerId = 0;
  for (let i = 1; i <= numStakers; i++) {
    const stake = Number((await schelling.stakers(i)).stake);
    if (stake > biggestStake) {
      biggestStake = stake;
      biggestStakerId = i;
    }
  }
  return ([biggestStake, biggestStakerId]);
};

// pseudo random hash generator based on block hashes.
const prngHash = async (seed, blockHashes) => {
  const sum = await web3.utils.soliditySha3(blockHashes, seed);
  return (sum);
};

const prng = async (seed, max, blockHashes) => {
  const hash = await prngHash(seed, blockHashes);
  const sum = BigNumber.from(hash);
  max = BigNumber.from(max);
  return (sum.mod(max));
};

const isElectedProposer = async (random, iteration, biggestStake, stake, stakerId, numStakers, blockHashes) => {
  // rand = 0 -> totalStake-1
  // add +1 since prng returns 0 to max-1 and staker start from 1
  const seed = await web3.utils.soliditySha3(iteration);
  // console.log('seed', seed)
  if ((Number(await prng(seed, numStakers, blockHashes)) + 1) !== stakerId) return (false);
  const seed2 = await web3.utils.soliditySha3(stakerId, iteration);
  const randHash = await prngHash(seed2, blockHashes);
  const rand = Number((BigNumber.from(randHash)).mod(BigNumber.from(2).pow(BigNumber.from(32))));
  // let biggestStake = stakers[biggestStake].stake;
  if (rand * (biggestStake) > stake * (2 ** 32)) return (false);
  return (true);
};

const getIteration = async (random, biggestStake, stake, stakerId, numStakers, blockHashes) => {
  for (let i = 0; i < 10000000000; i++) {
    const isElected = await isElectedProposer(random, i, biggestStake, stake, stakerId, numStakers, blockHashes);
    if (isElected) return (i);
  }
  return 0;
};

const waitNBlocks = async (n) => {
  await Promise.all(
    [...Array(n).keys()].map((i) => send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: i,
    }))
  );
};

const getEpoch = async () => {
  const blockNumber = BigNumber.from(await web3.eth.getBlockNumber());
  return blockNumber.div(epochLength).toNumber();
};

const getState = async () => {
  const blockNumber = BigNumber.from(await web3.eth.getBlockNumber());
  const state = blockNumber.div(epochLength.div(numStates));
  return state.mod(numStates).toNumber();
};

const mineAdvance = async (n) => {
  n = BigNumber.from(n);
  const blockNumber = BigNumber.from(await web3.eth.getBlockNumber());
  if (n.gt(blockNumber)) {
    const diff = n.sub(blockNumber);
    await waitNBlocks(diff.toNumber());
  }
};

// Mines to the next Epoch from which ever block it is in the current Epoch
const mineToNextEpoch = async () => {
  const currentBlockNumber = await web3.eth.getBlockNumber();
  const currentEpoch = await getEpoch();
  const nextEpochBlockNum = (currentEpoch + 1) * epochLength.toNumber();
  const diff = nextEpochBlockNum - currentBlockNumber;
  await waitNBlocks(diff);
};

// Mines to the next state in the current epoch
const mineToNextState = async () => {
  const currentBlockNumber = BigNumber.from(await web3.eth.getBlockNumber());
  const temp = currentBlockNumber.div(stateLength).add(1);
  const nextStateBlockNum = temp.mul(stateLength);
  const diff = nextStateBlockNum.sub(currentBlockNumber);
  await waitNBlocks(diff.toNumber());
};

const takeSnapshot = async () => {
  const id = await send({
    jsonrpc: '2.0',
    method: 'evm_snapshot',
  });

  await send({
    jsonrpc: '2.0',
    method: 'evm_mine',
    id: 0,
  });

  return id;
};

const restoreSnapshot = async (id) => {
  await send({
    jsonrpc: '2.0',
    method: 'evm_revert',
    params: [id],
  });
};

module.exports = {
  getBiggestStakeAndId,
  prng,
  prngHash,
  getIteration,
  isElectedProposer,
  waitNBlocks,
  getEpoch,
  getState,
  mineAdvance,
  mineToNextEpoch,
  mineToNextState,
  takeSnapshot,
  restoreSnapshot,
};
