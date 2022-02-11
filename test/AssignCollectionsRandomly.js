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

const { getState, calculateDisputesData } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const {
  commit, reveal, propose, getData, reset, calculateMedians,
} = require('./helpers/InternalEngine');

const {
  COLLECTION_MODIFIER_ROLE,
} = require('./helpers/constants');
const {
  getEpoch,
  tokenAmount,
  getBiggestStakeAndId,
  getIteration,
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
    let vote;
    let medians;
    let validMedianIndexToBeDisputed;
    const nonRevealedAssets = [];
    const nonRevealedAssetsPreviousEpoch = [];
    const revealedAssets = [];
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
      await commit(signers[1], 0, voteManager, collectionManager, secret);
      await mineToNextState();

      await reveal(signers[1], 0, voteManager, stakeManager, collectionManager);
      await mineToNextState();

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextState();
      // Dispute will happen on values now, and not stakers
      // as a staker, you have to pass sorted values
      const data = await getData(signers[1]);
      const validMedianIndexToBeDisputed = (data.seqAllotedCollections)[0];
      const {
        sortedValues,
      } = await calculateDisputesData(validMedianIndexToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validMedianIndexToBeDisputed, sortedValues);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0), 'Block proposed with same medians');
      await mineToNextState();
      medians = await calculateMedians(collectionManager);
      vote = medians[3];
      for (let j = 0; j < medians.length; j++) {
        if (medians[j] === 0) nonRevealedAssetsPreviousEpoch.push(j);
      }
      // Nothing is changed in confirm
      await blockManager.connect(signers[1]).claimBlockReward();
      await mineToNextState();
      /* ///////////////////////////////////////////////////////////////
                          DELEGATOR
      ////////////////////////////////////////////////////////////// */
      const collectionName = 'c3';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result1 = await delegator.getResult(hName);
      assertBNEqual(result1[0], vote);
      vote = medians[1];
      const result2 = await delegator.getResult(utils.solidityKeccak256(['string'], ['c1']));
      assertBNEqual(result2[0], vote);
      // await reset();
    });

    it('Staker Proposes Everything correctly, none of dispute should go through', async () => {
      // await mineToNextEpoch();
      await commit(signers[1], 0, voteManager, collectionManager, '0x127d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await commit(signers[2], 0, voteManager, collectionManager, '0x227d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await commit(signers[3], 0, voteManager, collectionManager, '0x327d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();

      await reveal(signers[1], 0, voteManager, stakeManager, collectionManager);
      await reveal(signers[2], 0, voteManager, stakeManager, collectionManager);
      await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
      await mineToNextState();

      // Collections revealed
      // [ 100, 200, 0, 0, 500 ]
      // [ 100, 200, 0, 400, 0 ]
      // [ 100, 0, 0, 0, 500 ]

      snapshotId = await takeSnapshot();
      // Staker propose correctly, 300 from previous
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextState();
      // Give Sorted and FinaliseDispute on revealed asset.
      const epoch = await getEpoch();
      const data = await getData(signers[1]);
      const validMedianIndexToBeDisputed = (data.seqAllotedCollections)[0];
      const {
        sortedValues,
      } = await calculateDisputesData(validMedianIndexToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validMedianIndexToBeDisputed, sortedValues);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0), 'Block proposed with same medians');

      // Give Sorted and FinaliseDispute on non-revealed asset
      await blockManager.connect(signers[10]).giveSorted(epoch, 2, [300]);
      // eslint-disable-next-line max-len
      await assertRevert(blockManager.connect(signers[10]).finalizeDispute(epoch, 0), 'VM Exception while processing transaction: reverted with panic code 0x12 (Division or modulo division by zero)');
      // await mineToNextState();
      // await blockManager.connect(signers[1]).claimBlockReward();
    });

    it('Delegator should be able to fetch the non revealed asset', async () => {
      // await mineToNextEpoch();
      for (let i = 0; i < medians.length; i++) {
        if (medians[i] === 0) nonRevealedAssets.push(i);
        else revealedAssets.push(i);
      }
      for (let j = 0; j < nonRevealedAssets.length; j++) {
        const collectionName = `c${nonRevealedAssets[j]}`;
        const vote = medians[nonRevealedAssets[j]];
        const hName = utils.solidityKeccak256(['string'], [collectionName]);
        const result1 = await delegator.getResult(hName);
        assertBNEqual(result1[0], vote);
      }
    });

    it('Staker Proposes revealed assets in-correctly', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      medians = await calculateMedians(collectionManager);
      const wrongMedians = [];
      for (let i = 0; i < medians.length; i++) wrongMedians.push(medians[i]);
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const staker1 = await stakeManager.getStaker(stakerIdAcc1);
      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker1, biggestStake);
      validMedianIndexToBeDisputed = revealedAssets[0];
      wrongMedians[validMedianIndexToBeDisputed] -= 90;
      const epoch = await getEpoch();
      await blockManager.connect(signers[1]).propose(epoch,
        wrongMedians,
        iteration,
        biggestStakerId);
      await mineToNextState();
      const {
        sortedValues,
      } = await calculateDisputesData(validMedianIndexToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validMedianIndexToBeDisputed, sortedValues);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);

      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
    });

    it('Staker Proposes non revealed assets correctly', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      const wrongMedians = [];
      for (let i = 0; i < medians.length; i++) wrongMedians.push(medians[i]);
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const staker1 = await stakeManager.getStaker(stakerIdAcc1);
      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker1, biggestStake);
      for (let j = 0; j < nonRevealedAssets.length; j++) {
        if (nonRevealedAssetsPreviousEpoch[j] === nonRevealedAssets[j]) {
          wrongMedians[nonRevealedAssets[j]] = 0;
        } else {
          wrongMedians[nonRevealedAssets[j]] = (nonRevealedAssets[j] + 1) * 100;
        }
      }
      validMedianIndexToBeDisputed = nonRevealedAssets[0];
      const epoch = await getEpoch();
      await blockManager.connect(signers[1]).propose(epoch,
        wrongMedians,
        iteration,
        biggestStakerId);
      // await propose(signers[1], [100, 200, 300, 400, 500], stakeManager, blockManager, voteManager);
      await mineToNextState();

      await assertRevert(blockManager.connect(signers[19]).disputeForNonAssignedCollection(epoch, 0, revealedAssets[0]),
        'Collec is revealed this epoch');
      await assertRevert(blockManager.connect(signers[19]).disputeForNonAssignedCollection(epoch, 0, validMedianIndexToBeDisputed),
        'Block proposed with corr medians');

      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);
      expect(blockIndexToBeConfirmed).to.eq(0);
      expect(block.valid).to.eq(true);
    });

    it('Staker Proposes non revealed assets in-correctly', async () => {
      await restoreSnapshot(snapshotId);
      snapshotId = await takeSnapshot();
      // await propose(signers[1], [100, 200, 30, 400, 500], stakeManager, blockManager, voteManager);
      // await mineToNextState();
      //
      // const epoch = await getEpoch();

      const wrongMedians = [];
      for (let i = 0; i < medians.length; i++) wrongMedians.push(medians[i]);
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const staker1 = await stakeManager.getStaker(stakerIdAcc1);
      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker1, biggestStake);
      validMedianIndexToBeDisputed = nonRevealedAssets[0];
      wrongMedians[validMedianIndexToBeDisputed] += 30;
      const epoch = await getEpoch();
      await blockManager.connect(signers[1]).propose(epoch,
        wrongMedians,
        iteration,
        biggestStakerId);
      await mineToNextState();
      await blockManager.connect(signers[19]).disputeForNonAssignedCollection(epoch, 0, validMedianIndexToBeDisputed);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      const block = await blockManager.getProposedBlock(epoch, 0);

      expect(blockIndexToBeConfirmed).to.eq(-1);
      expect(block.valid).to.eq(false);
    });
  });
});
