const { ethers } = require('hardhat');

const { BigNumber, utils, provider } = ethers;

const {
  ONE_ETHER, EPOCH_LENGTH, NUM_STATES, MATURITIES,
} = require('./constants');

const toBigNumber = (value) => BigNumber.from(value);
const tokenAmount = (value) => toBigNumber(value).mul(ONE_ETHER);
const { createMerkle, getProofPath } = require('./MerklePosAware');

const store = {};
const leavesOfTree = {};

const calculateDisputesData = async (collectionId, voteManager, stakeManager, epoch) => {
  // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
  // We should rethink about overloading functions.
  // const totalInfluenceRevealed = await voteManager['getTotalInfluenceRevealed(uint32)'](epoch);
  const totalInfluenceRevealed = await voteManager.getTotalInfluenceRevealed(epoch, collectionId);
  const medianWeight = totalInfluenceRevealed.div(2);
  let median = toBigNumber('0');

  const sortedValues = [];
  // const votes = [];
  let accWeight = toBigNumber(0);
  // let accWeight;
  let vote;
  const checkVotes = {};
  let weight;
  for (let i = 1; i <= (await stakeManager.numStakers()); i++) {
    vote = await voteManager.getVoteValue(epoch, i, collectionId);
    // if (vote[0] === epoch) {
    //   sortedStakers.push(i);
    //   votes.push(vote[1][collectionId]);
    if ((!(checkVotes[vote])) && (Number(vote) !== 0)) {
      sortedValues.push(vote);
    }
    checkVotes[vote] = true;
  }
  // median = accProd.div(totalInfluenceRevealed);
  sortedValues.sort();
  for (let i = 0; i < sortedValues.length; i++) {
    weight = await voteManager.getVoteWeight(epoch, collectionId, sortedValues[i]);
    accWeight = accWeight.add(weight);
    if (Number(median) === 0 && accWeight.gt(medianWeight)) {
      median = sortedValues[i];
    }
  }
  return {
    median, totalInfluenceRevealed, sortedValues,
  };
};

const prng = async (max, prngHashes) => {
  const sum = toBigNumber(prngHashes);
  max = toBigNumber(max);
  return (sum.mod(max));
};

// pseudo random hash generator based on block hashes.
const prngHash = async (seed, salt) => {
  const sum = await utils.solidityKeccak256(['bytes32', 'bytes32'], [seed, salt]);
  return (sum);
};

const maturity = async (age) => {
  const index = age / 10000;
  return MATURITIES[index];
};

const isElectedProposer = async (iteration, biggestStake, stake, stakerId, numStakers, salt) => {
  // add +1 since prng returns 0 to max-1 and staker start from 1
  const abiCoder = ethers.utils.defaultAbiCoder;
  const salt1 = await utils.solidityKeccak256(['bytes'], [await abiCoder.encode(['uint256'], [iteration])]);
  const seed1 = await prngHash(salt, salt1);
  const rand1 = await prng(numStakers, seed1);
  if (!(toBigNumber(rand1).add(1).eq(stakerId))) return false;

  const salt2 = await utils.solidityKeccak256(['bytes'], [await abiCoder.encode(['uint32', 'uint256'], [stakerId, iteration])]);
  const seed2 = await prngHash(salt, salt2);
  const rand2 = await prng(toBigNumber(2).pow(toBigNumber(32)), toBigNumber(seed2));
  if ((rand2.mul(biggestStake)).lt(stake.mul(toBigNumber(2).pow(32)))) return true;

  return false;
};

const isElectedProposerWithPosition = async (iteration, biggestStake, stake, stakerId, numStakers, salt) => {
  // add +1 since prng returns 0 to max-1 and staker start from 1
  const abiCoder = ethers.utils.defaultAbiCoder;
  const salt1 = await utils.solidityKeccak256(['bytes'], [await abiCoder.encode(['uint256'], [iteration])]);
  const seed1 = await prngHash(salt, salt1);
  const rand1 = await prng(numStakers, seed1);
  if (!(toBigNumber(rand1).add(1).eq(stakerId))) {
    return [false, 1];
  }

  const salt2 = await utils.solidityKeccak256(['bytes'], [await abiCoder.encode(['uint32', 'uint256'], [stakerId, iteration])]);
  const seed2 = await prngHash(salt, salt2);
  const rand2 = await prng(toBigNumber(2).pow(toBigNumber(32)), toBigNumber(seed2));
  if ((rand2.mul(biggestStake)).lt(stake.mul(toBigNumber(2).pow(32)))) {
    return [true, 1];
  }

  return [false, 2];
};

const getEpoch = async () => {
  const blockNumber = toBigNumber(await provider.getBlockNumber());
  const getCurrentBlock = await provider.getBlock(blockNumber.toNumber());
  const timestamp = toBigNumber(getCurrentBlock.timestamp);
  return timestamp.div(EPOCH_LENGTH).toNumber();
};

const getVote = async (medians) => {
  const rand = Math.floor(Math.random() * 3);
  const fact = (rand === 2) ? -1 : rand;
  const votes = [];
  for (let i = 0; i < medians.length; i++) votes.push((medians[i] + fact));
  return votes;
};

const getBiggestStakeAndId = async (stakeManager, voteManager) => {
  const numStakers = await stakeManager.numStakers();
  let biggestStake = toBigNumber('0');
  let biggestStakerId = toBigNumber('0');
  const epoch = await getEpoch();
  for (let i = 1; i <= numStakers; i++) {
    const stake = await voteManager.getStakeSnapshot(epoch, i);
    if (stake.gt(biggestStake)) {
      biggestStake = stake;
      biggestStakerId = i;
    }
  }
  return { biggestStake, biggestStakerId };
};

const getIteration = async (voteManager, stakeManager, staker, biggestStake) => {
  const numStakers = await stakeManager.getNumStakers();
  const stakerId = staker.id;
  const epoch = getEpoch();
  const stake = await voteManager.getStakeSnapshot(epoch, stakerId);
  const salt = await voteManager.getSalt();
  if (Number(stake) === 0) return 0; // following loop goes in infinite loop if this condn not added
  // stake 0 represents that given staker has not voted in that epoch
  // so anyway in propose its going to revert
  for (let i = 0; i < 10000000000; i++) {
    const isElected = await isElectedProposer(i, biggestStake, stake, stakerId, numStakers, salt);
    if (isElected) return (i);
  }
  return 0;
};

const getSignature = async (signer) => {
  const { chainId } = await provider.getNetwork();
  const epoch = await getEpoch();
  const messageHash = utils.solidityKeccak256(
    ['address', 'uint32', 'uint256', 'string'],
    [signer.address, epoch, chainId, 'razororacle']
  );
  const hashBinary = utils.arrayify(messageHash);
  const signature = await signer.signMessage(hashBinary);
  return signature;
};

const getSecret = async (signer) => {
  const signature = await getSignature(signer);
  const secret = utils.solidityKeccak256(
    ['bytes'],
    [signature]
  );
  return secret;
};
const getIterationWithPosition = async (voteManager, stakeManager, staker, biggestStake, ifPosition) => {
  const numStakers = await stakeManager.getNumStakers();
  const stakerId = staker.id;
  const epoch = getEpoch();
  const stake = await voteManager.getStakeSnapshot(epoch, stakerId);
  const salt = await voteManager.getSalt();
  if (Number(stake) === 0) return 0; // following loop goes in infinite loop if this condn not added
  // stake 0 represents that given staker has not voted in that epoch
  // so anyway in propose its going to revert
  for (let i = 0; i < 10000000000; i++) {
    const [isElected, position] = await isElectedProposerWithPosition(i, biggestStake, stake, stakerId, numStakers, salt);
    if (!isElected && position === ifPosition) {
      return i;
    }
  }
  return 0;
};

const getAssignedCollections = async (numActiveCollections, seed, toAssign) => {
  const assignedCollections = {}; // For Tree
  const seqAllotedCollections = []; // isCollectionAlloted
  for (let i = 0; i < toAssign; i++) {
    const assigned = await prng(
      numActiveCollections,
      utils.solidityKeccak256(
        ['bytes32', 'uint256'],
        [seed, i]
      )
    );
    assignedCollections[assigned] = true;
    seqAllotedCollections.push(assigned);
  }
  return [assignedCollections, seqAllotedCollections];
};

const getFalseIteration = async (voteManager, stakeManager, staker) => {
  const numStakers = await stakeManager.getNumStakers();
  const stakerId = staker.id;
  const epoch = getEpoch();
  const stake = await voteManager.getStakeSnapshot(epoch, stakerId);
  const { biggestStake } = await getBiggestStakeAndId(stakeManager, voteManager);
  const salt = await voteManager.getSalt();
  for (let i = 0; i < 10000000000; i++) {
    const isElected = await isElectedProposer(i, biggestStake, stake, stakerId, numStakers, salt);
    if (!isElected) return i;
  }
  return 0;
};

const getState = async () => {
  const blockNumber = toBigNumber(await provider.getBlockNumber());
  const getCurrentBlock = await provider.getBlock(blockNumber.toNumber());
  const timestamp = toBigNumber(getCurrentBlock.timestamp);
  const state = timestamp.div(EPOCH_LENGTH.div(NUM_STATES));
  const lowerLimit = 5;
  const upperLimit = EPOCH_LENGTH.div(NUM_STATES) - 5;
  if (timestamp % (EPOCH_LENGTH.div(NUM_STATES)) > upperLimit || timestamp % (EPOCH_LENGTH.div(NUM_STATES)) < lowerLimit) {
    return -1;
  } else {
    return state.mod(NUM_STATES).toNumber();
  }

  // change based on timestamp
};

const adhocCommit = async (medians, signer, deviation, voteManager, collectionManager, secret) => {
  const numActiveCollections = await collectionManager.getNumActiveCollections();
  const salt = await voteManager.getSalt();
  const toAssign = await voteManager.toAssign();
  // const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
  const seed1 = utils.solidityKeccak256(
    ['bytes32', 'bytes32'],
    [salt, secret]
  );
  const result = await getAssignedCollections(numActiveCollections, seed1, toAssign);
  const assignedCollections = result[0];
  const seqAllotedCollections = result[1];
  const helper = [];
  for (let i = 0; i < numActiveCollections; i++) {
    if (assignedCollections[i]) {
      const rand = Math.floor(Math.random() * 3);
      const fact = (rand === 2) ? -1 : rand;
      helper.push((medians[i] + fact)); // [100,200,300,400]
    } else helper.push(0);
  }
  leavesOfTree[signer.address] = helper;
  const tree = await createMerkle(leavesOfTree[signer.address]);
  const signature = await getSignature(signer);
  store[signer.address] = {
    assignedCollections,
    seqAllotedCollections,
    leavesOfTree,
    tree,
    secret,
    signature,
  };
  const commitment = utils.solidityKeccak256(['bytes32', 'bytes32'], [tree[0][0], seed1]);
  await voteManager.connect(signer).commit(getEpoch(), commitment);
};

const adhocReveal = async (signer, deviation, voteManager) => {
  const proofs = [];
  const values = [];
  const sac = store[signer.address].seqAllotedCollections;
  for (let j = 0; j < sac.length; j++) {
    values.push({
      leafId: sac[j],
      value: ((leavesOfTree[signer.address])[(sac)[j]]), // [300,400,200,100]
    });
    proofs.push(await getProofPath(store[signer.address].tree, Number(store[signer.address].seqAllotedCollections[j])));
  }
  const treeRevealData = {
    values,
    proofs,
    root: store[signer.address].tree[0][0],
  };
  await voteManager.connect(signer).reveal(getEpoch(), treeRevealData, store[signer.address].signature);
};

const adhocPropose = async (signer, ids, medians, stakeManager, blockManager, voteManager) => {
  const stakerID = await stakeManager.getStakerId(signer.address);
  const staker = await stakeManager.getStaker(stakerID);
  const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
  const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
  await blockManager.connect(signer).propose(getEpoch(),
    ids,
    medians,
    iteration,
    biggestStakerId);
};

const getCollectionIdPositionInBlock = async (epoch, blockId, signer, blockManager) => {
  const { ids } = await blockManager.getProposedBlock(epoch, blockId);
  // console.log(ids);
  const dispute = await blockManager.disputes(epoch, signer.address);
  const { collectionId } = dispute;
  let collectionIndexInBlock = 0;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === collectionId) { collectionIndexInBlock = i; break; }
  }
  return collectionIndexInBlock;
};
const getData = async (signer) => (store[signer.address]);

function getDepth(numActiveCollections) {
  if (numActiveCollections === 0) {
    return 0;
  }
  return (Math.log2(numActiveCollections) % 1 === 0 ? Math.log2(numActiveCollections) : Math.ceil(Math.log2(numActiveCollections)));
}

module.exports = {
  calculateDisputesData,
  isElectedProposer,
  getAssignedCollections,
  getBiggestStakeAndId,
  getEpoch,
  getVote,
  getSecret,
  getSignature,
  getIteration,
  getIterationWithPosition,
  getFalseIteration,
  getState,
  prng,
  prngHash,
  toBigNumber,
  tokenAmount,
  maturity,
  adhocCommit,
  adhocReveal,
  adhocPropose,
  getData,
  getCollectionIdPositionInBlock,
  getDepth,
};
