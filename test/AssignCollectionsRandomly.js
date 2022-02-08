/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { expect } = require('chai');
const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
  restoreSnapshot,
  takeSnapshot,
} = require('./helpers/testHelpers');

const { getState } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const { commit, reveal, propose } = require('./helpers/InternalEngine');

const {
  COLLECTION_MODIFIER_ROLE,
} = require('./helpers/constants');
const {
  getEpoch,
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
  let snapshotId;

  before(async () => {
    ({
      blockManager,
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
    it('Assign Collections Randomly End to End Flow', async () => {
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
      while (Number(await getState(await stakeManager.EPOCH_LENGTH())) !== 4) { await mineToNextState(); }
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

      const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      await commit(signers[1], 0, voteManager, collectionManager, secret);
      await mineToNextState();

      await reveal(signers[1], 0, voteManager);
      await mineToNextState();

      await propose(signers[1], [1, 2, 3, 4, 5], [0, 0, 300, 400, 0], stakeManager, blockManager, voteManager);
      await mineToNextState();

      // Dispute will happen on values now, and not stakers
      // as a staker, you have to pass sorted values
      await blockManager.connect(signers[19]).giveSorted(epoch, 2, [300]);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0), 'Block proposed with same medians');
      await mineToNextState();

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

    it('Staker Proposes Everything correctly, none of dispute should go through', async () => {
      await commit(signers[1], 0, voteManager, collectionManager, '0x127d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await commit(signers[2], 0, voteManager, collectionManager, '0x227d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await commit(signers[3], 0, voteManager, collectionManager, '0x327d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();

      await reveal(signers[1], 0, voteManager);
      await reveal(signers[2], 0, voteManager);
      await reveal(signers[3], 0, voteManager);
      await mineToNextState();

      // Collections revealed
      // [ 100, 200, 0, 0, 500 ]
      // [ 100, 200, 0, 400, 0 ]
      // [ 100, 0, 0, 0, 500 ]

      snapshotId = await takeSnapshot();
      // Staker propose correctly, 300 from previous
      await propose(signers[1], [1, 2, 3, 4, 5], [100, 200, 300, 400, 500], stakeManager, blockManager, voteManager);
      await mineToNextState();

      // Give Sorted and FinaliseDispute on revealed asset.
      const epoch = await getEpoch();
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, [200]);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0), 'Block proposed with same medians');

      // Give Sorted and FinaliseDispute on non-revealed asset
      await blockManager.giveSorted(epoch, 2, [300]);
      await assertRevert(blockManager.finalizeDispute(epoch, 0), 'Invalid dispute');

      // disputeForNonAssignedCollection
      await assertRevert(blockManager.connect(signers[10]).disputeForNonAssignedCollection(epoch, 0, 1),
        'Collec is revealed this epoch');
      await assertRevert(blockManager.connect(signers[10]).disputeForNonAssignedCollection(epoch, 0, 2),
        'Block proposed with corr medians');

      // disputeForProposedCollectionIds
      await assertRevert(blockManager.disputeForProposedCollectionIds(epoch, 0), 'Block proposed with corr ids');
    });

    it('Delegator should be able to fetch the non revealed asset', async () => {
      const collectionName = 'c3';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result1 = await delegator.getResult(hName);
      assertBNEqual(result1[0], toBigNumber('300'));

      const result2 = await delegator.getResult(utils.solidityKeccak256(['string'], ['c1']));
      assertBNEqual(result2[0], toBigNumber('0'));
    });

    it('Staker Proposes revealed assets in-correctly', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      await propose(signers[1], [1, 2, 3, 4, 5], [10, 200, 300, 400, 500], stakeManager, blockManager, voteManager);
      await mineToNextState();

      const epoch = await getEpoch();
      await blockManager.connect(signers[19]).giveSorted(epoch, 0, [100]);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);

      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });

    it('Staker Proposes non revealed assets correctly', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      await propose(signers[1], [1, 2, 3, 4, 5], [100, 200, 300, 400, 500], stakeManager, blockManager, voteManager);
      await mineToNextState();

      const epoch = await getEpoch();
      await assertRevert(blockManager.connect(signers[19]).disputeForNonAssignedCollection(epoch, 0, 1),
        'Collec is revealed this epoch');
      await assertRevert(blockManager.connect(signers[19]).disputeForNonAssignedCollection(epoch, 0, 2),
        'Block proposed with corr medians');
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);

      expect(blockIndexToBeConfirmed).to.eq(0);
      expect(block.valid).to.eq(true);
    });

    it('Staker Proposes non revealed assets in-correctly', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      await propose(signers[1], [1, 2, 3, 4, 5], [100, 200, 30, 400, 500], stakeManager, blockManager, voteManager);
      await mineToNextState();

      const epoch = await getEpoch();

      await blockManager.connect(signers[19]).disputeForNonAssignedCollection(epoch, 0, 2);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);

      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });

    it('Staker Proposes with wrong ids', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      // hypo scenrio
      // only 1 and 2 were assigned so for 3,4,5 staker should pass prev values
      // but he doesnt, so lets see if he can be disputed
      await propose(signers[1], [1, 2, 3, 3, 3], [100, 200, 300, 300, 300], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();

      blockManager.disputeForProposedCollectionIds(epoch, 0);

      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);
      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });
  });
});
