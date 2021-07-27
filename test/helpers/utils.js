const { BigNumber } = ethers;
const {
  ONE_ETHER, EPOCH_LENGTH, NUM_STATES, MATURITIES,
} = require('./constants');

const toBigNumber = (value) => BigNumber.from(value);
const tokenAmount = (value) => toBigNumber(value).mul(ONE_ETHER);

const calculateDisputesData = async (voteManager, epoch, sortedVotes, weights, assetId) => {
  // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
  // We should rethink about overloading functions.

  const totalInfluenceRevealed = await voteManager['getTotalInfluenceRevealed(uint256,uint256)'](epoch, assetId);
  const medianWeight = totalInfluenceRevealed.div(2);

  let median = toBigNumber('0');
  let weight = toBigNumber('0');
  for (let i = 0; i < sortedVotes.length; i++) {
    weight = weight.add(weights[i]);
    if (weight.gt(medianWeight) && median.eq('0')) median = sortedVotes[i];
  }

  return {
    median, totalInfluenceRevealed,
  };
};

const prng = async (max, prngHashes) => {
  const sum = toBigNumber(prngHashes);
  max = toBigNumber(max);
  return (sum.mod(max));
};

// pseudo random hash generator based on block hashes.
const prngHash = async (seed, salt) => {
  const sum = await web3.utils.soliditySha3(seed, salt);
  return (sum);
};

const maturity = async (age) => {
  const index = age / 10000;
  return MATURITIES[index];
};

const isElectedProposer = async (iteration, biggestInfluence, influence, stakerId, numStakers, randaoHash) => {
  // add +1 since prng returns 0 to max-1 and staker start from 1
  const salt1 = await web3.utils.soliditySha3(iteration);
  const seed1 = await prngHash(randaoHash, salt1);
  const rand1 = await prng(numStakers, seed1);
  if (!(toBigNumber(rand1).add(1).eq(stakerId))) return false;

  const salt2 = await web3.utils.soliditySha3(stakerId, iteration);
  const seed2 = await prngHash(randaoHash, salt2);
  const rand2 = await prng(toBigNumber(2).pow(toBigNumber(32)), toBigNumber(seed2));
  if ((rand2.mul(biggestInfluence)).lt(influence.mul(toBigNumber(2).pow(32)))) return true;

  return false;
};

const getBiggestInfluenceAndId = async (stakeManager) => {
  const numStakers = await stakeManager.numStakers();
  let biggestInfluence = toBigNumber('0');
  let biggestInfluencerId = toBigNumber('0');

  for (let i = 1; i <= numStakers; i++) {
    const influence = await stakeManager.getInfluence(i);
    if (influence.gt(biggestInfluence)) {
      biggestInfluence = influence;
      biggestInfluencerId = i;
    }
  }
  return { biggestInfluence, biggestInfluencerId };
};

const getEpoch = async () => {
  const blockNumber = toBigNumber(await web3.eth.getBlockNumber());
  return blockNumber.div(EPOCH_LENGTH).toNumber();
};

const getIteration = async (voteManager, stakeManager, random, staker) => {
  const numStakers = await stakeManager.getNumStakers();
  const stakerId = staker.id;
  const influence = await stakeManager.getInfluence(stakerId);

  const { biggestInfluence } = await getBiggestInfluenceAndId(stakeManager);
  const randaoHash = await voteManager.getRandaoHash();
  for (let i = 0; i < 10000000000; i++) {
    const isElected = await isElectedProposer(i, biggestInfluence, influence, stakerId, numStakers, randaoHash);
    if (isElected) return (i);
  }
  return 0;
};

const getState = async () => {
  const blockNumber = toBigNumber(await web3.eth.getBlockNumber());
  const state = blockNumber.div(EPOCH_LENGTH.div(NUM_STATES));
  return state.mod(NUM_STATES).toNumber();
};

const getAssignedAssets = async (voteManager, numAssets, stakerId, votes, proofs, maxAssetsPerStaker, random) => {
  const assignedAssetsVotes = [];
  const assignedAssetsProofs = [];

  const randaoHash = await voteManager.getRandaoHash();
  let assetId;
  let salt;
  let hash;
  for (let i = 0; i < maxAssetsPerStaker; i++) {
    salt = await web3.utils.soliditySha3(+stakerId + i);
    hash = await prngHash(randaoHash, salt);
    assetId = +(await prng(numAssets, hash)) + 1;
    assignedAssetsVotes.push({ id: assetId, value: votes[assetId - 1] });
    assignedAssetsProofs.push(proofs[assetId - 1]);
  }
  return [assignedAssetsVotes, assignedAssetsProofs];
};

const getNumRevealedAssets = async (assignedAssetsVotes) => {
  const isExist = {};
  let numRevealedAssetsForStaker = 0;
  for (let i = 0; i < assignedAssetsVotes.length; i++) {
    if (typeof isExist[assignedAssetsVotes[i].id] === 'undefined') {
      isExist[assignedAssetsVotes[i].id] = true;
      numRevealedAssetsForStaker++;
    }
  }
  return numRevealedAssetsForStaker;
};

const findAssetNotAlloted = async (assignedAssetsVotes, numAssets) => {
  const map = {};
  for (let i = 0; i < assignedAssetsVotes.length; i++) {
    map[assignedAssetsVotes[i].id] = true;
  }
  for (let i = 1; i <= numAssets; i++) {
    if (!map[i]) return i;
  }
  return 1000;
};

module.exports = {
  calculateDisputesData,
  isElectedProposer,
  // getBiggestStakeAndId,
  getBiggestInfluenceAndId,
  getEpoch,
  getIteration,
  getState,
  prng,
  prngHash,
  toBigNumber,
  tokenAmount,
  getAssignedAssets,
  getNumRevealedAssets,
  findAssetNotAlloted,
  maturity,
};
