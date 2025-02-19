/* eslint-disable prefer-destructuring */
const { BigNumber, utils } = ethers;
const toBigNumber = (value) => BigNumber.from(value);

const {
  getAssignedCollections, getEpoch, getBiggestStakeAndId,
  getIteration, getSignature,
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

const commit = async (signer, deviation, voteManager, collectionManager, secret, blockManager) => {
  const numActiveCollections = await collectionManager.getNumActiveCollections();
  const epoch = await getEpoch();
  const numProposedBlocks = await blockManager.getNumProposedBlocks(epoch - 1);
  const toAssign = await voteManager.toAssign();
  const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
  let salt;
  // if =>  If no blocks were proposed last Epoch then fetch the stored salt as new salt
  // won't be calculated in this case as confirmBlock won't be called both in prev epoch and in this epoch's commit

  // else if => // If blocks were proposed last Epoch and all the blocks got disputed then fetch the stored salt as new salt
  // won't be calculated in this case as confirmBlock won't be called both in prev epoch and in this epoch's commit

  // else =>   // If blocks are proposed last epoch and any one or more blocks are valid then calculate the new salt

  if (numProposedBlocks === 0) {
    salt = await voteManager.getSalt();
  } else if (numProposedBlocks > 0 && blockIndexToBeConfirmed < 0) {
    salt = await voteManager.getSalt();
  } else {
    const blockId = await blockManager.sortedProposedBlockIds(epoch - 1, 0);
    const block = await blockManager.getProposedBlock(epoch - 1, blockId);
    const mediansLastEpoch = block.medians;
    salt = utils.solidityKeccak256(
      ['uint32', 'uint32[]'],
      [epoch - 1, mediansLastEpoch]
    );
  }
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
const reveal = async (collectionManager, signer, deviation, voteManager, stakeManager) => {
  const proofs = [];
  const values = [];
  for (let j = 0; j < store[signer.address].seqAllotedCollections.length; j++) {
    values.push({
      leafId: store[signer.address].seqAllotedCollections[j],
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
  // console.log('reveal', signer.address, treeRevealData.values);
  await voteManager.connect(signer).reveal(getEpoch(), treeRevealData, store[signer.address].signature);
  // console.log(treeRevealData);
  const helper = {};
  const arr = [];
  for (let i = 0; i < store[signer.address].seqAllotedCollections.length; i++) {
    const stakerId = await stakeManager.stakerIds(signer.address);
    const influence = await voteManager.getInfluenceSnapshot(getEpoch(), stakerId);
    const leafId = (store[signer.address].seqAllotedCollections)[i];
    const collectionId = await collectionManager.getCollectionIdFromLeafId(leafId);
    const voteValue = values[i].value;
    arr.push(voteValue);
    if (!(helper[collectionId])) {
      let flag = false;
      influenceSum[collectionId] = (influenceSum[collectionId]).add(influence);
      if (res[collectionId] === undefined) res[collectionId] = [];
      for (let j = 0; j < res[collectionId].length; j++) {
        if (res[collectionId][j] === voteValue) {
          flag = true;
        }
      }
      if (!flag) res[collectionId].push(voteValue);
      if (voteWeights[collectionId] === undefined) voteWeights[collectionId] = {};
      if (voteWeights[collectionId][voteValue] === undefined) voteWeights[collectionId][voteValue] = toBigNumber(0);
      voteWeights[collectionId][voteValue] = voteWeights[collectionId][voteValue].add(influence);
      helper[collectionId] = true;
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
// Find median on basis of revealed value and influence
// Find iteration using salt as seed

const proposeWithDeviation = async (signer, deviation, stakeManager, blockManager, voteManager, collectionManager) => {
  const stakerID = await stakeManager.getStakerId(signer.address);
  const staker = await stakeManager.getStaker(stakerID);
  const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
  const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
  const activeCollectionIds = await collectionManager.getActiveCollections();
  const epoch = await getEpoch();
  const idsRevealedThisEpoch = [];
  const mediansValues = [];

  for (let j = 0; j < activeCollectionIds.length; j++) {
    const collectionId = activeCollectionIds[j];
    if (Number(influenceSum[[collectionId]]) !== 0) {
      idsRevealedThisEpoch.push(activeCollectionIds[j]);
      let accWeight = toBigNumber(0);
      res[collectionId].sort();
      for (let i = 0; i < res[collectionId].length; i++) {
        accWeight = accWeight.add(voteWeights[collectionId][res[collectionId][i]]);
        if (accWeight.gt((influenceSum[collectionId].div(2)))) {
          mediansValues.push(res[collectionId][i] + deviation);
          break;
        }
      }
    }
  }
  // console.log('propose', idsRevealedThisEpoch, mediansValues);
  await blockManager.connect(signer).propose(epoch,
    idsRevealedThisEpoch,
    mediansValues,
    iteration,
    biggestStakerId);
};

const propose = async (signer, stakeManager, blockManager, voteManager, collectionManager) => {
  await proposeWithDeviation(signer, 0, stakeManager, blockManager, voteManager, collectionManager);
};

const calculateMedians = async (collectionManager) => {
  const numActiveCollections = await collectionManager.getNumActiveCollections();
  const activeCollectionIds = await collectionManager.getActiveCollections();

  // const idsRevealedThisEpoch = [];
  const mediansValues = [];

  for (let j = 0; j < numActiveCollections; j++) {
    const collectionId = activeCollectionIds[j];
    if (Number(influenceSum[collectionId]) !== 0) {
      let accWeight = toBigNumber(0);
      res[collectionId].sort();
      for (let i = 0; i < res[collectionId].length; i++) {
        accWeight = accWeight.add(voteWeights[collectionId][res[collectionId][i]]);
        if (accWeight.gt((influenceSum[collectionId].div(2)))) {
          mediansValues.push(res[collectionId][i]);
          break;
        }
      }
    }
  }
  return (mediansValues);
};

const calculateInvalidMedians = async (collectionManager, deviation) => {
  const numActiveCollections = await collectionManager.getNumActiveCollections();
  const activeCollectionIds = await collectionManager.getActiveCollections();

  // const idsRevealedThisEpoch = [];
  const mediansValues = [];
  let validLeafIdToBeDisputed = 0;
  for (let j = 0; j < numActiveCollections; j++) {
    const collectionId = activeCollectionIds[j];
    if (Number(influenceSum[collectionId]) !== 0) {
      let accWeight = toBigNumber(0);
      res[collectionId].sort();
      for (let i = 0; i < res[collectionId].length; i++) {
        accWeight = accWeight.add(voteWeights[collectionId][res[collectionId][i]]);
        if (accWeight.gt((influenceSum[collectionId].div(2)))) {
          if (validLeafIdToBeDisputed === 0) {
            validLeafIdToBeDisputed = j;
            mediansValues.push(res[collectionId][i] + deviation);
          } else {
            mediansValues.push(res[collectionId][i]);
          }
          break;
        }
      }
    }
  }
  return [mediansValues, validLeafIdToBeDisputed];
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

const getIdsRevealed = async (collectionManager) => {
  const idsRevealedThisEpoch = [];
  const activeCollectionIds = await collectionManager.getActiveCollections();
  for (let j = 0; j < activeCollectionIds.length; j++) {
    if (Number(influenceSum[activeCollectionIds[j]]) !== 0) {
      idsRevealedThisEpoch.push(activeCollectionIds[j]);
    }
  }
  return idsRevealedThisEpoch;
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
  proposeWithDeviation,
  reset,
  getAnyAssignedIndex,
  getRoot,
  getCommitment,
  getData,
  getVoteValues,
  getTreeRevealData,
  getValuesArrayRevealed,
  getIdsRevealed,
  calculateMedians,
  calculateInvalidMedians,
};
