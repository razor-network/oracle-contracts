const { BigNumber, utils } = ethers;
const {
  ONE_ETHER, EPOCH_LENGTH, NUM_STATES, MATURITIES,
} = require('./constants');

const toBigNumber = (value) => BigNumber.from(value);
const tokenAmount = (value) => toBigNumber(value).mul(ONE_ETHER);
const { createMerkle, getProofPath } = require('./MerklePosAware');

const store = {};
const leavesOfTree = {};

const calculateDisputesData = async (medianIndex, voteManager, stakeManager, collectionManager, epoch) => {
  // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
  // We should rethink about overloading functions.
  // const totalInfluenceRevealed = await voteManager['getTotalInfluenceRevealed(uint32)'](epoch);
  const totalInfluenceRevealed = await voteManager.getTotalInfluenceRevealed(epoch, medianIndex);
  let median = toBigNumber('0');

  const sortedValues = [];
  // const votes = [];
  let accProd = toBigNumber(0);
  // let accWeight;
  let infl;
  let vote;
  const checkVotes = {};
  for (let i = 1; i <= (await stakeManager.numStakers()); i++) {
    vote = await voteManager.getVoteValue(epoch, i, medianIndex);
    // if (vote[0] === epoch) {
    //   sortedStakers.push(i);
    //   votes.push(vote[1][medianIndex]);
    if ((!(checkVotes[vote])) && (vote !== 0)) {
      sortedValues.push(vote);
    }
    checkVotes[vote] = true;
    infl = await voteManager.getInfluenceSnapshot(epoch, i);
    // accWeight += infl;
    accProd = accProd.add(toBigNumber(vote).mul(infl));
  }
  median = accProd.div(totalInfluenceRevealed);
  return {
    median, totalInfluenceRevealed, accProd, sortedValues,
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

const isElectedProposer = async (iteration, biggestStake, stake, stakerId, numStakers, salt) => {
  // add +1 since prng returns 0 to max-1 and staker start from 1
  const salt1 = await web3.utils.soliditySha3(iteration);
  const seed1 = await prngHash(salt, salt1);
  const rand1 = await prng(numStakers, seed1);
  if (!(toBigNumber(rand1).add(1).eq(stakerId))) return false;

  const salt2 = await web3.utils.soliditySha3(stakerId, iteration);
  const seed2 = await prngHash(salt, salt2);
  const rand2 = await prng(toBigNumber(2).pow(toBigNumber(32)), toBigNumber(seed2));
  if ((rand2.mul(biggestStake)).lt(stake.mul(toBigNumber(2).pow(32)))) return true;

  return false;
};

const getEpoch = async () => {
  const blockNumber = toBigNumber(await web3.eth.getBlockNumber());
  return blockNumber.div(EPOCH_LENGTH).toNumber();
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
  const epoch = getEpoch();
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
  const blockNumber = toBigNumber(await web3.eth.getBlockNumber());
  const state = blockNumber.div(EPOCH_LENGTH.div(NUM_STATES));
  return state.mod(NUM_STATES).toNumber();
};

// const getCommitAndRevealData = async (collectionManager, voteManager, blockManager, factor) => {
//   const numActiveCollections = await collectionManager.getNumActiveCollections();
//   const salt = await voteManager.getSalt();
//   const toAssign = await voteManager.toAssign();
//   const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
//   const seed = utils.solidityKeccak256(
//     ['bytes32', 'bytes32'],
//     [salt, secret]
//   );
//   // const result = await getAssignedCollections(numActiveCollections, seed1, toAssign);
//   const assignedCollections = {}; // For Tree
//   const seqAllotedCollections = []; // isCollectionAlloted
//   for (let i = 0; i < toAssign; i++) {
//     // console.log(seed);
//     const assigned = await prng(
//       numActiveCollections,
//       utils.solidityKeccak256(
//         ['bytes32', 'uint256'],
//         [seed, i]
//       )
//     );
//     // console.log('isALLOTED', utils.solidityKeccak256(
//     //   ['bytes32', 'uint256'],
//     //   [seed, i]
//     // ), assigned);
//     // console.log(typeof assignedCollections[assigned]);
//     assignedCollections[assigned] = true;
//     seqAllotedCollections.push(assigned);
//   }
//   // const assignedCollections = result[0];
//   // const seqAllotedCollections = result[1];
//   const leavesOfTree = [];
//
//   for (let i = 0; i < numActiveCollections; i++) {
//     if (assignedCollections[i]) {
//       leavesOfTree.push(((i + 1) * 100) + factor);
//     } else leavesOfTree.push(0);
//   }
//   const tree = await createMerkle(leavesOfTree);
//   // console.log('Commit', assignedCollections, leavesOfTree, tree[0][0], depth, seqAllotedCollections);
//   const commitment = utils.solidityKeccak256(['bytes32', 'bytes32'], [tree[0][0], seed]);
//   const proofs = [];
//   const values = [];
//
//   for (let j = 0; j < seqAllotedCollections.length; j++) {
//     values.push({
//       medianIndex: seqAllotedCollections[j],
//       value: (((Number(seqAllotedCollections[j]) + 1) * 100) + factor),
//     });
//
//     proofs.push(await getProofPath(tree, Number(seqAllotedCollections[j])));
//   }
//   // console.log(values[0].value);
//   const treeRevealData = {
//     values,
//     proofs,
//     root: tree[0][0],
//   };
//   const votesValueRevealed = [];
//   for (let i = 0; i < 3; i++) votesValueRevealed.push((treeRevealData.values)[i].value);
//   const root = tree[0][0];
//   return {
//     commitment, treeRevealData, secret, seqAllotedCollections, root, assignedCollections, votesValueRevealed, seed,
//   };
// };

const randomCommit = async (medians, signer, deviation, voteManager, collectionManager, secret) => {
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

  store[signer.address] = {
    assignedCollections,
    seqAllotedCollections,
    leavesOfTree,
    tree,
    secret,
  };
  const commitment = utils.solidityKeccak256(['bytes32', 'bytes32'], [tree[0][0], seed1]);
  await voteManager.connect(signer).commit(getEpoch(), commitment);
};

const randomReveal = async (signer, deviation, voteManager) => {
  const proofs = [];
  const values = [];
  const sac = store[signer.address].seqAllotedCollections;
  for (let j = 0; j < sac.length; j++) {
    values.push({
      medianIndex: sac[j],
      value: ((leavesOfTree[signer.address])[(sac)[j]]), // [300,400,200,100]
    });
    proofs.push(await getProofPath(store[signer.address].tree, Number(store[signer.address].seqAllotedCollections[j])));
  }
  const treeRevealData = {
    values,
    proofs,
    root: store[signer.address].tree[0][0],
  };
  await voteManager.connect(signer).reveal(getEpoch(), treeRevealData, store[signer.address].secret);
};

// const propose = async (signer, stakeManager, blockManager, voteManager, collectionManager) => {
//   const stakerID = await stakeManager.getStakerId(signer.address);
//   const staker = await stakeManager.getStaker(stakerID);
//   const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
//   const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
//   // console.log('Propose', iteration, biggestStakerId, stakerID);
//   const numActiveCollections = await collectionManager.getNumActiveCollections();
//   // const numActiveCollections = 9;
//   const medians = [];
//   let helper;
//   for (let i = 0; i < numActiveCollections; i++) medians.push(0);
//   for (let j = 0; j < numActiveCollections; j++) {
//     if (Number(influenceSum[j]) !== 0) {
//       helper = (res[j]).div(influenceSum[j]);
//       medians[j] = helper;
//     }
//   }
//   median[signer.address] = medians;
//   await blockManager.connect(signer).propose(getEpoch(),
//     medians,
//     iteration,
//     biggestStakerId);
// };

const randomPropose = async (medians, signer, stakeManager, blockManager, voteManager) => {
  const stakerID = await stakeManager.getStakerId(signer.address);
  const staker = await stakeManager.getStaker(stakerID);
  const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
  const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
  await blockManager.connect(signer).propose(getEpoch(),
    medians,
    iteration,
    biggestStakerId);
};

const getData = async (signer) => (store[signer.address]);

// const getRandomCommitAndRevealData = async (collectionManager, voteManager, blockManager, medians) => {
//   const numActiveCollections = await collectionManager.getNumActiveCollections();
//   const salt = await voteManager.getSalt();
//   const toAssign = await voteManager.toAssign();
//   const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
//   const seed = utils.solidityKeccak256(
//     ['bytes32', 'bytes32'],
//     [salt, secret]
//   );
//   // const result = await getAssignedCollections(numActiveCollections, seed1, toAssign);
//   const assignedCollections = {}; // For Tree
//   const seqAllotedCollections = []; // isCollectionAlloted
//   for (let i = 0; i < toAssign; i++) {
//     // console.log(seed);
//     const assigned = await prng(
//       numActiveCollections,
//       utils.solidityKeccak256(
//         ['bytes32', 'uint256'],
//         [seed, i]
//       )
//     );
//     assignedCollections[assigned] = true;
//     seqAllotedCollections.push(assigned); // [2,3,1,0]
//   }
//   const leavesOfTree = [];
//
//   for (let i = 0; i < numActiveCollections; i++) {
//     if (assignedCollections[i]) {
//       const rand = Math.floor(Math.random() * 3);
//       const fact = (rand === 2) ? -1 : rand;
//       leavesOfTree.push((medians[i] + fact)); // [100,200,300,400]
//     } else leavesOfTree.push(0);
//   }
//   const tree = await createMerkle(leavesOfTree);
//   const commitment = utils.solidityKeccak256(['bytes32', 'bytes32'], [tree[0][0], seed]);
//   const proofs = [];
//   const values = [];
//
//   for (let j = 0; j < seqAllotedCollections.length; j++) {
//     values.push({
//       medianIndex: seqAllotedCollections[j],
//       value: (leavesOfTree[(seqAllotedCollections[j])]), // [300,400,200,100]
//     });
//
//     proofs.push(await getProofPath(tree, Number(seqAllotedCollections[j])));
//   }
//   // console.log(values[0].value);
//   const treeRevealData = {
//     values,
//     proofs,
//     root: tree[0][0],
//   };
//   const votesValueRevealed = [];
//   for (let i = 0; i < 3; i++) votesValueRevealed.push((treeRevealData.values)[i].value);
//   const root = tree[0][0];
//   return {
//     commitment, treeRevealData, secret, seqAllotedCollections, root, assignedCollections, votesValueRevealed, seed,
//   };
// };

// const getMedians = async (dataRevealedThisEpoch, result, collectionManager) => {
//   const numActiveCollections = await collectionManager.getNumActiveCollections();
//   const medians = [];
//   for (let i = 0; i < numActiveCollections; i++) medians.push(0);
//   let influenceSum = toBigNumber('0');
//   for (let i = 0; i < ((dataRevealedThisEpoch.influence).length); i++) influenceSum = influenceSum.add((dataRevealedThisEpoch.influence)[i]);
//   let helper = toBigNumber('0');
//   for (let i = 0; i < result.seqAllotedCollections.length; i++) {
//     for (let j = 0; j < (dataRevealedThisEpoch.influence).length; j++) {
//       helper = helper.add((toBigNumber((dataRevealedThisEpoch.values)[j][i])).mul((dataRevealedThisEpoch.influence)[j]));
//     }
//     medians[(result.seqAllotedCollections)[i]] = helper.div(influenceSum);
//     helper = toBigNumber('0');
//   }
//   return medians;
// };

module.exports = {
  calculateDisputesData,
  isElectedProposer,
  // getBiggestStakeAndId,
  getAssignedCollections,
  getBiggestStakeAndId,
  getEpoch,
  getVote,
  getIteration,
  getFalseIteration,
  getState,
  prng,
  prngHash,
  toBigNumber,
  tokenAmount,
  maturity,
  // getCommitAndRevealData,
  // getRandomCommitAndRevealData,
  // getMedians,
  randomCommit,
  randomReveal,
  randomPropose,
  getData,
};
