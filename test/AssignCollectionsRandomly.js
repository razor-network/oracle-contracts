/* TODO:
test same vote values, stakes
test penalizeEpochs */

const {
  assertBNEqual,
  assertDeepEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
} = require('./helpers/testHelpers');

const { getState, getAssignedCollections } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const { createMerkle, getProofPath } = require('./helpers/MerklePosAware');

const {
  DEFAULT_ADMIN_ROLE_HASH,
  STAKE_MODIFIER_ROLE,
  COLLECTION_MODIFIER_ROLE,
  GOVERNER_ROLE,
  BURN_ADDRESS,
  WITHDRAW_LOCK_PERIOD,
  BASE_DENOMINATOR,
} = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  getFalseIteration,
  toBigNumber,
  tokenAmount,
} = require('./helpers/utils');

const { utils } = ethers;

describe('AssignCollectionsRandomly', function () {
  let signers;
  let blockManager;
  let collectionManager;
  let voteManager;
  let razor;
  let stakeManager;
  let initializeContracts;
  let delegator;

  before(async () => {
    ({
      blockManager,
      governance,
      collectionManager,
      razor,
      stakeManager,
      voteManager,
      initializeContracts,
      delegator,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('razor', async () => {
    it('Assign Collections Randomly', async () => {
      /* ///////////////////////////////////////////////////////////////
                          SETUP
      ////////////////////////////////////////////////////////////// */
      /// Nothing is changed here
      /// 10 Jobs
      /// 5 Collections
      /// 3 Stakers

      await Promise.all(await initializeContracts());
      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      let name;
      const power = -2;
      const selectorType = 0;
      const weight = 50;
      let i = 1;
      while (i <= 10) {
        name = `test${i}`;
        await collectionManager.createJob(weight, power, selectorType, name, selector, url);
        i++;
      }
      while (Number(await getState(await stakeManager.epochLength())) !== 4) { await mineToNextState(); }

      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c1');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c2');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c3');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c4');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c5');

      await mineToNextEpoch();

      await razor.transfer(signers[1].address, tokenAmount('100000'));
      await razor.transfer(signers[2].address, tokenAmount('100000'));
      await razor.transfer(signers[3].address, tokenAmount('100000'));

      await razor.connect(signers[1]).approve(stakeManager.address, tokenAmount('100000'));
      await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('100000'));
      await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('100000'));

      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('100000'));
      await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('100000'));
      await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('100000'));

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

      // Resolution
      // confrimLastEpochBlock : Everyone can also construct
      // if the block itself is not propsed
      // salt = n-1

      // n : proposed

      // n + 100

      // query salt

      // Staker 1
      const numActiveCollections = await collectionManager.getNumActiveCollections();
      const salt = await voteManager.getSalt();
      const toAssign = await voteManager.toAssign();
      const secret1 = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      const seed1 = utils.solidityKeccak256(
        ['bytes32', 'bytes32'],
        [salt, secret1]
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
      const depth = Math.log2(numActiveCollections) % 1 === 0 ? Math.log2(numActiveCollections) : Math.ceil(Math.log2(numActiveCollections));
      console.log(depth);
      console.log('Commit', assignedCollections, leavesOfTree, tree[0][0], seqAllotedCollections);
      const commitment1 = utils.solidityKeccak256(['bytes32', 'bytes32'], [tree[0][0], seed1]);

      await voteManager.connect(signers[1]).commit(epoch, commitment1);

      await mineToNextState();

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
      const proofs = [];
      const values = [];
      for (let j = 0; j < seqAllotedCollections.length; j++) {
        values.push({
          medianIndex: seqAllotedCollections[j],
          value: (Number(seqAllotedCollections[j]) + 1) * 100,
          // this +1 is done only for maint vote value as 100 for 0, 200 for 1,
          // its not related to any concept, ofc 0 cant be valid vote result so we couldnr have 0 value for 0
          // this is not needed on node, as there we will have real values
        });

        proofs.push(await getProofPath(tree, Number(seqAllotedCollections[j])));
      }
      const treeRevealData = {
        values,
        proofs,
        root: tree[0][0],
      };
      console.log(treeRevealData);
      await voteManager.connect(signers[1]).reveal(epoch, treeRevealData, secret1);

      await mineToNextState();

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
      // @notice Q: What should we do ? Optmise for input, or Optimise for loop

      const stakerID = await stakeManager.getStakerId(signers[1].address);
      const staker = await stakeManager.getStaker(stakerID);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      console.log('Propose', iteration, biggestStakerId, stakerID);
      await blockManager.connect(signers[1]).propose(epoch,
        [0, 0, 300, 400, 0],
        iteration,
        biggestStakerId);

      // Are we okay with returning 0 value for non-revealed asset for previous epoch ?
      // 0, 0, 300, 400, 0
      // We will pick 0 optimise
      // Take value of previous epoch for 0 value reveal

      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          DISPUTE
      ////////////////////////////////////////////////////////////// */
      // Dispute will happen on values now, and not stakers
      // as a staker, you have to pass sorted values
      await blockManager.connect(signers[19]).giveSorted(epoch, 2, [300]);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0), 'Block proposed with same medians');

      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          CONFIRM
      ////////////////////////////////////////////////////////////// */
      // Nothing is changed in confirm
      await blockManager.connect(signers[1]).claimBlockReward();
      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          DELEGATOR
      ////////////////////////////////////////////////////////////// */
      const collectionName = 'c3';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result1 = await delegator.getResult(hName);
      assertBNEqual(result1[0], toBigNumber('300'));

      const result2 = await delegator.getResult(utils.solidityKeccak256(['string'], ['c1']));
      assertBNEqual(result2[0], toBigNumber('0'));
    });
    // For this to test everytime, is waste, as it takes sig time
    // it('Depth Calculation', async () => {
    //   for (let i = 1; i < 2 ** 16; i++) {
    //     // console.log(Math.log2(i) % 1 === 0 ? Math.log2(i) : Math.ceil(Math.log2(i)));
    //     const x = Math.log2(i) % 1 === 0 ? Math.log2(i) : Math.ceil(Math.log2(i));
    //     const y = Number(await collectionManager.getDepth(i));
    //     console.log(i);
    //     if (x !== y) { console.log('revert', x, y, i); }
    //   }
    // });
  });
});
