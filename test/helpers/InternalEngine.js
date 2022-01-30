const { BigNumber, utils } = ethers;

const {
  getAssignedCollections, getEpoch, getBiggestStakeAndId,
  getIteration,
} = require('./utils');
const { createMerkle, getProofPath } = require('./MerklePosAware');

const store = {};

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
/// Fetch NumActiveCollection, and Salt
/// Find Assignments
/// Construct Tree with values for assigned and 0 for non-assigned
/// Commitment is as per
/// commitment = keccak256(abi.encodePacked(tree.root, seed))
/// seed = keccak256(abi.encodePacked(salt, secret));
/// salt can be fetched from VoteManager
/// Concept : salt for epch + 1 represents nothing but = keccak256(abi.encodePacked(epoch, blocks[epoch].medians, salt)); // TODO : REMOVE SALT
/// So salt is dependent on block[ep -1] and ep-2

/// TODO: Check case of confirmLastEpochBlock
/// @dev
/// There are two cryptographic parts
/// isAssetAlloted
/// Merkle
/// Please note that if assets alloted are 2,1,1
/// a tree is constructed for 0,1,2,3,4
/// in a tree there is no repetition
/// but in a isCollectionAlloted, input array
/// you have to pass [2,1,1], here seq and repetation should be maintained

const commit = async (signer, voteManager, collectionManager, secret) => {
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
      leavesOfTree.push((i + 1) * 100);
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

  await voteManager.connect(signer).commit(getEpoch(), commitment);
};

/* ///////////////////////////////////////////////////////////////
                          REVEAL
////////////////////////////////////////////////////////////// */

// In reveal, staker has to pass secret, root and assigned assets
// Format is
// struct MerkleTree {
//     Structs.AssignedAsset [] values;
//     bytes32[][] proofs;
//     bytes32 root;
// }
const reveal = async (signer, voteManager) => {
  const proofs = [];
  const values = [];
  for (let j = 0; j < store[signer.address].seqAllotedCollections.length; j++) {
    values.push({
      medianIndex: store[signer.address].seqAllotedCollections[j],
      value: (Number(store[signer.address].seqAllotedCollections[j]) + 1) * 100,
      // this +1 is done only for maint vote value as 100 for 0, 200 for 1,
      // its not related to any concept, ofc 0 cant be valid vote result so we couldnr have 0 value for 0
      // this is not needed on node, as there we will have real values
    });

    proofs.push(await getProofPath(store[signer.address].tree, Number(store[signer.address].seqAllotedCollections[j])));
  }
  const treeRevealData = {
    values,
    proofs,
    root: store[signer.address].tree[0][0],
  };
  // console.log(treeRevealData);
  await voteManager.connect(signer).reveal(getEpoch(), treeRevealData, store[signer.address].secret);
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
// Loop Through getVoteValue to find if there is non-zero value present for a each staker
// If yes pick it up and then calculate median
// Find iteration using salt as seed

const propose = async (signer, values, stakeManager, blockManager, voteManager) => {
  const stakerID = await stakeManager.getStakerId(signer.address);
  const staker = await stakeManager.getStaker(stakerID);
  const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
  const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
  // console.log('Propose', iteration, biggestStakerId, stakerID);
  await blockManager.connect(signer).propose(getEpoch(),
    values,
    iteration,
    biggestStakerId);
};

module.exports = {
  commit,
  reveal,
  propose,
};
