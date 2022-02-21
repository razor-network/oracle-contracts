/* eslint-disable prefer-destructuring */
const { BigNumber, utils } = ethers;
const toBigNumber = (value) => BigNumber.from(value);

const {
  getAssignedCollections, getEpoch, getBiggestStakeAndId,
  getIteration,
} = require('./utils');
const { createMerkle, getProofPath } = require('./MerklePosAware');

let store = {};
let influenceSum = new Array(100).fill(toBigNumber('0'));
let res = {};
let root = {};
let commitments = {};
let valuesRevealed = {};
let treeData = {};
let votes = {};
const voteWeights = {};

/* ///////////////////////////////////////////////////////////////
                          COMMIT
////////////////////////////////////////////////////////////// */

/// Commit is changed, we are going back to merkle root being commited, and are introducing random assginment

/// In reveal node can only reveal collections assigned to them.
/// Assignment is dependent on salt and secret, salt is stored in confirm block of last epoch. (More info in Steps)
/// so you are right in thinking that in commit only, stakers would know their assignment
/// this cant be explotied as you cant know other peoples assigment given secret is "secret" :)
/// So cant find if you are the only one revealing some collection
/// Now the tree that node has to built, has to contain all the numActiveCollections (PosAwareMerkleTree Req)
/// But the values for the non assigned collection doesnt matter
/// So we suggest to node to consider votes for non-assgined to be 0 only, so they dont have to do keccakhash redundantly
/// Please note that this tree is PosAware, so you cant just post gigantic tree root, and pick values as per convinience in reveal

/// @dev Randao Removed : So there is no penalty as randao penalty.

/// Steps
/// Fetch NumActiveCollection
/// Calculate Salt = keccak256(abi.encodePacked(epoch, blocks[epoch].medians))
/// Find Assignments
/// Construct Tree with values for assigned and 0 for non-assigned
/// Commitment is as per
/// commitment = keccak256(abi.encodePacked(tree.root, seed))
/// where seed = keccak256(abi.encodePacked(salt, secret));

/// @dev
/// There are two cryptographic parts
/// isAssetAlloted
/// Merkle
/// Please note that if assets alloted are 2,1,1
/// a tree is constructed for 0,1,2,3,4
/// in a tree there is no repetition
/// but in a isCollectionAlloted, input array
/// you have to pass [2,1,1], here seq and repetation should be maintained

const commit = async (signer, deviation, voteManager, collectionManager, secret) => {
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

  const leavesOfTree = [];

  for (let i = 0; i < numActiveCollections; i++) {
    if (assignedCollections[i]) {
      leavesOfTree.push((i + 1) * 100 + deviation);
      // this +1 is done only for maint vote value as 100 for 0, 200 for 1,
      // its not related to any concept, ofc 0 cant be valid vote result so we couldnr have 0 value for 0
      // this is not needed on node, as there we will have real values
    } else leavesOfTree.push(0);
  }

  const tree = await createMerkle(leavesOfTree);
  // const depth = Math.log2(numActiveCollections) % 1 === 0 ? Math.log2(numActiveCollections) : Math.ceil(Math.log2(numActiveCollections));
  // console.log(depth);
  // console.log('Commit', assignedCollections, leavesOfTree, tree[0][0], seqAllotedCollections);

  store[signer.address] = {
    assignedCollections,
    seqAllotedCollections,
    leavesOfTree,
    tree,
    secret,
  };
  const commitment = utils.solidityKeccak256(['bytes32', 'bytes32'], [tree[0][0], seed1]);

  commitments[signer.address] = commitment;
  await voteManager.connect(signer).commit(getEpoch(), commitment);
  root[signer.address] = tree[0][0];
};

/* ///////////////////////////////////////////////////////////////
                          REVEAL
////////////////////////////////////////////////////////////// */

// In reveal, staker has to pass secret, root of tree, revealed values and seq of allocated colelctions
// Input Params
// epoch, treeRevealData, secret
// treeRevealData (follwoing struct)
// struct MerkleTree {
//     Structs.AssignedAsset [] values;
//     bytes32[][] proofs;
//     bytes32 root;
// }
const reveal = async (signer, deviation, voteManager, stakeManager) => {
  const proofs = [];
  const values = [];
  for (let j = 0; j < store[signer.address].seqAllotedCollections.length; j++) {
    values.push({
      medianIndex: store[signer.address].seqAllotedCollections[j],
      value: (Number(store[signer.address].seqAllotedCollections[j]) + 1) * 100 + deviation,
      // this +1 is done only for maint vote value as 100 for 0, 200 for 1,
      // its not related to any concept, ofc 0 cant be valid vote result so we couldnr have 0 value for 0
      // this is not needed on node, as there we will have real values
    });
    proofs.push(await getProofPath(store[signer.address].tree, Number(store[signer.address].seqAllotedCollections[j])));
  }
  valuesRevealed[signer.address] = values;
  const treeRevealData = {
    values,
    proofs,
    root: store[signer.address].tree[0][0],
  };
  treeData[signer.address] = treeRevealData;
  await voteManager.connect(signer).reveal(getEpoch(), treeRevealData, store[signer.address].secret);
  // console.log(treeRevealData);
  const helper = {};
  const arr = [];
  for (let i = 0; i < store[signer.address].seqAllotedCollections.length; i++) {
    const stakerId = await stakeManager.stakerIds(signer.address);
    const influence = await voteManager.getInfluenceSnapshot(getEpoch(), stakerId);
    const medianIndex = (store[signer.address].seqAllotedCollections)[i];
    const voteValue = values[i].value;
    arr.push(voteValue);
    if (!(helper[medianIndex])) {
      let flag = false;
      influenceSum[medianIndex] = (influenceSum[medianIndex]).add(influence);
      if (res[medianIndex] === undefined) res[medianIndex] = [];
      for (let j = 0; j < res[medianIndex].length; j++) {
        if (res[medianIndex][j] === voteValue) {
          flag = true;
        }
      }
      if (!flag) res[medianIndex].push(voteValue);
      if (voteWeights[voteValue] === undefined) voteWeights[voteValue] = toBigNumber(0);
      voteWeights[voteValue] = voteWeights[voteValue].add(influence);
      helper[medianIndex] = true;
    }
  }
  votes[signer.address] = arr;
};

/* ///////////////////////////////////////////////////////////////
                          PROPOSE
////////////////////////////////////////////////////////////// */

// As a proposer
// Earlier your job was easy, everyone was revealing everything
// Now with randomness
// Its not given that every collection is going to be revealed
// isElectedProposer would use salt as seed now, not randao

// Steps
// Index reveal events of stakers
// Find medain on basis of revealed value and influence
// For non revealed active collection of this epoch, use previous epoch vote value.
// Find iteration using salt as seed

const propose = async (signer, stakeManager, blockManager, voteManager, collectionManager) => {
  const stakerID = await stakeManager.getStakerId(signer.address);
  const staker = await stakeManager.getStaker(stakerID);
  const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
  const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
  // console.log('Propose', iteration, biggestStakerId, stakerID);
  const numActiveCollections = await collectionManager.getNumActiveCollections();
  // const numActiveCollections = 9;
  const medians = new Array(numActiveCollections).fill(0);
  const ids = await collectionManager.getActiveCollections();
  const epoch = await getEpoch();
  const block = await blockManager.getBlock(epoch - 1);
  for (let j = 0; j < ids.length; j++) {
    if (Number(influenceSum[j]) !== 0) {
      let accWeight = toBigNumber(0);
      res[j].sort();
      for (let i = 0; i < res[j].length; i++) {
        accWeight = accWeight.add(voteWeights[res[j][i]]);
        if (medians[j] === 0 && accWeight.gt((influenceSum[j].div(2)))) {
          medians[j] = res[j][i];
        }
      }
    } else if (block.medians.length !== 0) {
      const oldIndex = await collectionManager.getIdToIndexRegistryValue(ids[j]);
      const oldMedian = (await blockManager.getBlock(epoch - 1)).medians[oldIndex];
      medians[oldIndex] = oldMedian;
    }
  }
  await blockManager.connect(signer).propose(epoch,
    ids,
    medians,
    iteration,
    biggestStakerId);
};

const calculateMedians = async (collectionManager) => {
  const numActiveCollections = await collectionManager.getNumActiveCollections();
  const medians = [];
  for (let i = 0; i < numActiveCollections; i++) medians.push(0);
  for (let j = 0; j < numActiveCollections; j++) {
    if (Number(influenceSum[j]) !== 0) {
      let accWeight = toBigNumber(0);
      res[j].sort();
      for (let i = 0; i < res[j].length; i++) {
        accWeight = accWeight.add(voteWeights[res[j][i]]);
        if (medians[j] === 0 && accWeight.gt((influenceSum[j].div(2)))) {
          medians[j] = res[j][i];
        }
      }
    }
  }
  return (medians);
};

const reset = async () => {
  store = {};
  influenceSum = new Array(100).fill(toBigNumber('0'));
  res = {};
  root = {};
  commitments = {};
  valuesRevealed = {};
  treeData = {};
  votes = {};
};

const getAnyAssignedIndex = async (signer) => {
  const index = (store[signer.address].seqAllotedCollections)[0];
  return index;
};

const getRoot = async (signer) => (root[signer.address]);

const getCommitment = async (signer) => (commitments[signer.address]);

const getData = async (signer) => (store[signer.address]);

const getValuesArrayRevealed = async (signer) => (valuesRevealed[signer.address]);

const getTreeRevealData = async (signer) => (treeData[signer.address]);

const getVoteValues = async (signer) => (votes[signer.address]);

module.exports = {
  commit,
  reveal,
  propose,
  reset,
  getAnyAssignedIndex,
  getRoot,
  getCommitment,
  getData,
  getVoteValues,
  getTreeRevealData,
  getValuesArrayRevealed,
  calculateMedians,
};
