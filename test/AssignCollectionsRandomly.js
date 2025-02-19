/* eslint-disable prefer-destructuring */
const { expect } = require('chai');
const { network } = require('hardhat');
const { mineBlock } = require('./helpers/testHelpers');
const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
  restoreSnapshot,
  takeSnapshot,
} = require('./helpers/testHelpers');

const { getState, calculateDisputesData, getSecret } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const {
  commit, reveal, propose, getData,
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

    await network.provider.send('evm_setNextBlockTimestamp', [2625097600]);
    /* ///////////////////////////////////////////////////////////////
                        SETUP
    ////////////////////////////////////////////////////////////// */
    /// Nothing is changed here
    /// 10 Jobs
    /// 5 Collections
    /// 3 Stakers
    await Promise.all(await initializeContracts());
    await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
    const jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 9) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url,
      };
      jobs.push(job);
      i++;
    }
    await collectionManager.createMulJob(jobs);
    while (Number(await getState()) !== 4) {
      if (Number(await getState()) === -1) {
        await mineBlock();
      } else {
        await mineToNextState();
      }
    }
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c0');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c1');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c2');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c3');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c4');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c5');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c6');

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

    await mineToNextEpoch();
    let secret = await getSecret(signers[1]);
    await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
    secret = await getSecret(signers[2]);
    await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);
    secret = await getSecret(signers[3]);
    await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
    await mineToNextState();

    await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);
    await reveal(collectionManager, signers[2], 0, voteManager, stakeManager);
    await reveal(collectionManager, signers[3], 0, voteManager, stakeManager);
    await mineToNextState();
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshotId);
  });

  describe('Assign Collections Randomly', async () => {
    it('End to End Flow', async () => {
      const epoch = await getEpoch();
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      // Block Proposed

      await mineToNextState();

      // Dispute will happen on values now, and not stakers
      // as a staker, you have to pass sorted values
      const data = await getData(signers[1]);
      const validLeafIdToBeDisputed = (data.seqAllotedCollections)[0];
      const validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);
      const {
        sortedValues,
      } = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, sortedValues);
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock), 'Block proposed with same medians');

      await mineToNextState();

      // Nothing is changed in confirm
      await blockManager.connect(signers[1]).claimBlockReward();
      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          DELEGATOR
      ////////////////////////////////////////////////////////////// */
      const collectionName = 'c2';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result1 = await delegator.getResult(hName);
      assertBNEqual(result1[0], 300);
      const result2 = await delegator.getResult(utils.solidityKeccak256(['string'], ['c1']));
      assertBNEqual(result2[0], 0);
    });

    it('Staker Proposes Everything correctly, none of dispute should go through', async () => {
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      await mineToNextState();
      // Give Sorted and FinaliseDispute on revealed asset.
      const epoch = await getEpoch();
      const data = await getData(signers[1]);
      const validLeafIdToBeDisputed = (data.seqAllotedCollections)[0];
      const validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);
      const {
        sortedValues,
      } = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, sortedValues);
      let collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock), 'Block proposed with same medians');

      // Give Sorted and FinaliseDispute on non-revealed asset
      await blockManager.giveSorted(epoch, 2, [200]);
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[0], blockManager);
      await assertRevert(blockManager.finalizeDispute(epoch, 0, collectionIndexInBlock), 'Invalid dispute');

      // disputeForProposedCollectionIds
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 1), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 3), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 4), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 5), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 7), 'Dispute: ID present only');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 2), 'Dispute: ID should be absent');
      await assertRevert(blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 6), 'Dispute: ID should be absent');

      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 1, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 3, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 4, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 5, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 7, 0), 'Dispute: ID should be present');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 2, 0), 'Dispute: ID absent only');
      await assertRevert(blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 6, 0), 'Dispute: ID absent only');
      // the id itself doesnt exist
      await assertRevert(blockManager.disputeOnOrderOfIds(epoch, 0, 1, 0), 'index1 not greater than index0 0');
      await assertRevert(blockManager.disputeOnOrderOfIds(epoch, 0, 0, 1), 'ID at i0 not gt than of i1');
    });

    it('Delegator should be able to fetch the result of non revealed asset', async () => {
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextState();
      await mineToNextState();
      await blockManager.connect(signers[1]).claimBlockReward();
      await mineToNextState();
      const collectionName = 'c2';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], 300);
    });

    it('Staker Proposes revealed assets in-correctly', async () => {
      await adhocPropose(signers[1], [1, 3, 4, 5, 7], [10, 300, 400, 500, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, [100]);
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);

      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });

    it('Staker Proposes with missing id', async () => {
      // missing 3
      await adhocPropose(signers[1], [1, 4, 5, 7], [100, 400, 500, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();

      await blockManager.disputeCollectionIdShouldBePresent(epoch, 0, 3);

      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);
      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
    });

    it('Staker Proposes with no ids', async () => {
      await assertRevert(adhocPropose(signers[1], [], [100, 400, 600], stakeManager, blockManager, voteManager), 'Invalid block proposed');
    });

    it('Staker Proposes with no ids and no medians', async () => {
      await adhocPropose(signers[1], [], [], stakeManager, blockManager, voteManager);
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
      await adhocPropose(signers[1], [1, 2, 3, 4, 5, 7], [100, 200, 300, 400, 500, 700], stakeManager, blockManager, voteManager);
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
      await adhocPropose(signers[1], [1, 4, 3, 5, 7], [100, 300, 400, 500, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();
      const epoch = await getEpoch();

      await blockManager.disputeOnOrderOfIds(epoch, 0, 1, 2);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);
      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
      assertBNEqual((await stakeManager.getStaker(await stakeManager.getStakerId(signers[1].address))).stake, 0);
      const tx = blockManager.disputeOnOrderOfIds(epoch, 0, 1, 2);
      await assertRevert(tx, 'Block already has been disputed');
    });
  });
});
