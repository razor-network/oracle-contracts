/* eslint-disable prefer-destructuring */
const { expect } = require('chai');
const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
  restoreSnapshot,
  takeSnapshot,
} = require('./helpers/testHelpers');

const { getState, calculateDisputesData } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const {
  commit, reveal, propose, getData, reset,
} = require('./helpers/InternalEngine');

const {
  COLLECTION_MODIFIER_ROLE,
} = require('./helpers/constants');
const {
  getEpoch,
  tokenAmount,
  adhocPropose,
  getCollectionIdPositionInBlock,
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

      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c0');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c1');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c2');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c3');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c4');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c5');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c6');

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
      await reset();
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      await reveal(signers[1], 0, voteManager, stakeManager);
      await mineToNextState();

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      // Block Proposed
      // [ 1, 2, 7 ] [ 100, 200, 700 ]

      await mineToNextState();

      // Dispute will happen on values now, and not stakers
      // as a staker, you have to pass sorted values
      const data = await getData(signers[1]);
      const validLeafIdToBeDisputed = (data.seqAllotedCollections)[0];
      const {
        sortedValues,
      } = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, sortedValues);
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager, collectionManager);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock), 'Block proposed with same medians');

      await mineToNextState();

      // Nothing is changed in confirm
      await blockManager.connect(signers[1]).claimBlockReward();
      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          DELEGATOR
      ////////////////////////////////////////////////////////////// */
      const collectionName = 'c0';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result1 = await delegator.getResult(hName);
      assertBNEqual(result1[0], 100);
      const result2 = await delegator.getResult(utils.solidityKeccak256(['string'], ['c2']));
      assertBNEqual(result2[0], 0);

      await reset();
    });

    it('Staker Proposes Everything correctly, none of dispute should go through', async () => {
      // await mineToNextEpoch();
      await commit(signers[1], 0, voteManager, collectionManager, '0x127d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', blockManager);
      await commit(signers[2], 0, voteManager, collectionManager, '0x827d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', blockManager);
      await commit(signers[3], 0, voteManager, collectionManager, '0x327d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', blockManager);
      await mineToNextState();

      await reveal(signers[1], 0, voteManager, stakeManager);
      await reveal(signers[2], 0, voteManager, stakeManager);
      await reveal(signers[3], 0, voteManager, stakeManager);
      await mineToNextState();

      // Collections revealed
      // [400, 300, 700]
      // [600, 500, 600]
      // [100, 100, 700]
      // So resultant for this block

      snapshotId = await takeSnapshot();
      // Staker propose correctly
      // [ 1, 3, 4, 5, 6, 7 ] [ 100, 300, 400, 500, 600, 700 ]

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      await mineToNextState();
      // Give Sorted and FinaliseDispute on revealed asset.
      const epoch = await getEpoch();
      const data = await getData(signers[1]);
      const validLeafIdToBeDisputed = (data.seqAllotedCollections)[0];
      const {
        sortedValues,
      } = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, sortedValues);
      let collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager, collectionManager);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock), 'Block proposed with same medians');

      // Give Sorted and FinaliseDispute on non-revealed asset
      await blockManager.giveSorted(epoch, 1, [200]);
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[0], blockManager, collectionManager);
      await assertRevert(blockManager.finalizeDispute(epoch, 0, collectionIndexInBlock), 'Invalid dispute');

      // disputeForProposedCollectionIds
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 1), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 3), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 4), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 5), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 6), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 7), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 2), 'Dispute: ID should be absent');

      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 1, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 3, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 4, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 5, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 6, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 7, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 2, 0), 'Dispute: ID absent only');
      // the id itself doesnt exist
      await assertRevert(blockManager.disputeOnOrderOfIds(epoch, 0, 1, 0), 'index1 not greater than index0 0');
      await assertRevert(blockManager.disputeOnOrderOfIds(epoch, 0, 0, 1), 'ID at i0 not gt than of i1');
    });

    it('Delegator should be able to fetch the result of non revealed asset', async () => {
      const collectionName = 'c1';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], 200);
    });

    it('Staker Proposes revealed assets in-correctly', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      await adhocPropose(signers[1], [1, 3, 4, 5, 6, 7], [10, 300, 400, 500, 600, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();
      await blockManager.connect(signers[19]).giveSorted(epoch, 0, [100]);
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager, collectionManager);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);

      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });

    it('Staker Proposes with missing id', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      // missing 3
      await adhocPropose(signers[1], [1, 4, 5, 6, 7], [100, 400, 500, 600, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();

      await blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 3);

      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);
      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });

    it('Staker Proposes with additional id', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      // additional 2
      await adhocPropose(signers[1], [1, 2, 3, 4, 5, 6, 7], [100, 200, 300, 400, 500, 600, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();

      await blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 2, 1);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);
      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });

    it('Staker Proposes in incorrect order of ids', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();

      await adhocPropose(signers[1], [1, 4, 3, 5, 6, 7], [100, 200, 300, 400, 500, 600, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();

      await blockManager.disputeOnOrderOfIds(epoch, 0, 1, 2);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);
      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });
  });
});
