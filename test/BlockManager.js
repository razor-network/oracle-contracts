/* eslint-disable prefer-destructuring */
// @dev : above is a quick fix for this linting error
// I couldnt understand what it meant, to solve it

const { assert, expect } = require('chai');
const {
  assertBNEqual,
  assertDeepEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
  takeSnapshot,
  restoreSnapshot,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  STAKE_MODIFIER_ROLE,
  COLLECTION_MODIFIER_ROLE,
  GOVERNER_ROLE,
  BURN_ADDRESS,
  WITHDRAW_LOCK_PERIOD,
  BASE_DENOMINATOR,
  UNSTAKE_LOCK_PERIOD,
} = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
  tokenAmount,
  getCollectionIdPositionInBlock,
  getSecret,
  getIterationWithPosition,
} = require('./helpers/utils');

const { utils } = ethers;
const {
  commit, reveal, propose, proposeWithDeviation, reset, calculateMedians, calculateInvalidMedians, getIdsRevealed, getValuesArrayRevealed,
} = require('./helpers/InternalEngine');

describe('BlockManager', function () {
  let signers;
  let blockManager;
  let collectionManager;
  let voteManager;
  let razor;
  let stakeManager;
  let rewardManager;
  let randomNoManager;
  let initializeContracts;
  let governance;
  let stakedToken;
  let snapshotId;
  let snapshotId2;

  before(async () => {
    ({
      blockManager,
      governance,
      collectionManager,
      razor,
      stakeManager,
      rewardManager,
      voteManager,
      randomNoManager,
      initializeContracts,
      stakedToken,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Block Manager: Initialization Tests', async () => {
    it('admin role should be granted', async () => {
      const isAdminRoleGranted = await blockManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
      assert(isAdminRoleGranted === true, 'Admin role was not Granted');
    });

    it('should not be able to stake, commit without initialization', async () => {
      const epoch = await getEpoch();

      const tx1 = stakeManager.connect(signers[1]).stake(epoch, tokenAmount('180000'));
      await assertRevert(tx1, 'Contract should be initialized');

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'bytes32'],
        [epoch, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      const tx2 = voteManager.connect(signers[2]).commit(epoch, commitment1);
      await assertRevert(tx2, 'Contract should be initialized');
    });

    it('should not be able to initiliaze BlockManager contract without admin role', async () => {
      const tx = blockManager.connect(signers[1]).initialize(
        stakeManager.address,
        rewardManager.address,
        voteManager.address,
        collectionManager.address,
        randomNoManager.address
      );
      await governance.grantRole(GOVERNER_ROLE, signers[0].address);
      await assertRevert(tx, 'AccessControl');
    });
  });
  describe('Block Manager: Propose', async () => {
    before(async () => {
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

      await mineToNextEpoch();
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();

      let Cname;
      for (let i = 1; i <= 8; i++) {
        Cname = `Test Collection${String(i)}`;
        await collectionManager.createCollection(500, 3, 1, 1, [i, i + 1], Cname);
      }
      Cname = 'Test Collection9';
      await collectionManager.createCollection(500, 3, 1, 1, [9, 1], Cname);

      await mineToNextEpoch();

      await razor.transfer(signers[1].address, tokenAmount('423000'));
      await razor.transfer(signers[2].address, tokenAmount('190000'));
      await razor.transfer(signers[3].address, tokenAmount('180000'));
      await razor.transfer(signers[4].address, tokenAmount('200000'));
      await razor.transfer(signers[5].address, tokenAmount('190000'));
      await razor.transfer(signers[6].address, tokenAmount('423000'));
      await razor.transfer(signers[7].address, tokenAmount('190000'));
      await razor.transfer(signers[8].address, tokenAmount('190000'));
      await razor.transfer(signers[9].address, tokenAmount('170000'));
      await razor.transfer(signers[10].address, tokenAmount('423000'));
      await razor.transfer(signers[11].address, tokenAmount('180000'));
      await razor.transfer(signers[12].address, tokenAmount('421000'));
      await razor.transfer(signers[13].address, tokenAmount('420000'));
      await razor.transfer(signers[14].address, tokenAmount('419000'));
      await razor.transfer(signers[15].address, tokenAmount('418000'));

      const epoch = await getEpoch();
      await razor.connect(signers[1]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('180000'));

      await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('170000'));
      await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('170000'));

      await razor.connect(signers[4]).approve(stakeManager.address, tokenAmount('200000'));
      await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('200000'));

      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('190000'));
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('190000'));

      snapshotId2 = await takeSnapshot();

      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager, collectionManager);
      await reveal(collectionManager, signers[2], 0, voteManager, stakeManager, collectionManager);

      await mineToNextState(); // propose
    });

    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('should be able to propose', async function () {
      const epoch = await getEpoch();
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('1'), 'incorrect proposalID');

      const nblocks = await blockManager.getNumProposedBlocks(epoch);
      assertBNEqual(nblocks, toBigNumber('1'), 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('should allow other proposals', async function () {
      const epoch = await getEpoch();

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await propose(signers[2], stakeManager, blockManager, voteManager, collectionManager);

      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const firstProposedBlock = await blockManager.proposedBlocks(epoch, 0);
      const { biggestStake } = await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      const secondProposedBlock = (firstProposedBlock.iteration.gt(iteration))
        ? await blockManager.proposedBlocks(epoch, 0) : await blockManager.proposedBlocks(epoch, 1);
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const proposerId = (firstProposedBlock.iteration.gt(iteration))
        ? stakerIdAcc1 : stakerIdAcc2;
      assertBNEqual(secondProposedBlock.proposerId, proposerId);
    });

    it('getProposedBlock Function should work as expected', async function () {
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      const block = await blockManager.connect(signers[19]).getProposedBlock(await getEpoch(), 0);
      const { medians } = block;
      const { proposerId, iteration, biggestStake } = await blockManager.proposedBlocks(await getEpoch(), 0);
      assertBNEqual(block.proposerId, proposerId, 'it should return correct value');
      assertDeepEqual(block.medians, medians, 'it should return correct value');
      assertBNEqual(block.iteration, iteration, 'it should return correct value');
      assertBNEqual(block.biggestStake, biggestStake, 'it should return correct value');
    });

    it('staker should not be able to propose when not revealed', async function () {
      await mineToNextEpoch();

      const secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();
      await mineToNextState();
      const tx = propose(signers[2], stakeManager, blockManager, voteManager, collectionManager);
      await assertRevert(tx, 'Cannot propose without revealing');
    });

    it('staker should not be able to propose when stake goes below minStake', async function () {
      const epoch = await getEpoch();
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.setStakerStake(epoch, stakerIdAcc2, 2, staker.stake, tokenAmount('19999'));
      const tx = propose(signers[2], stakeManager, blockManager, voteManager, collectionManager);
      await assertRevert(tx, 'stake below minimum stake');
    });

    it('should not be able to propose again if already proposed', async function () {
      const epoch = await getEpoch();

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc1);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      const tx = blockManager.connect(signers[1]).propose(epoch,
        [0, 0, 0],
        [],
        iteration,
        biggestStakerId);

      await assertRevert(tx, 'Already proposed');
    });

    it('should not be able to propose ids with different length than medians and vice versa', async function () {
      const epoch = await getEpoch();
      let medians = await calculateMedians(collectionManager);
      let idsRevealed = await getIdsRevealed(collectionManager);
      idsRevealed.push(9); // intentionally making ids.length > medians.length
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      let staker = await stakeManager.getStaker(stakerIdAcc1);
      let { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const tx1 = blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
      await assertRevert(tx1, 'Invalid block proposed');

      medians = await calculateMedians(collectionManager);
      idsRevealed = await getIdsRevealed(collectionManager);
      medians.push(1000); // intentionally making ids.length < medians.length
      staker = await stakeManager.getStaker(stakerIdAcc1);
      biggestStake = (await getBiggestStakeAndId(stakeManager, voteManager)).biggestStake;
      biggestStakerId = (await getBiggestStakeAndId(stakeManager, voteManager)).biggestStakerId;
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const tx2 = blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
      await assertRevert(tx2, 'Invalid block proposed');
    });

    it('should be able to test second if for isElectedProposer', async function () {
      await mineToNextEpoch();
      // set minStake and minSafeRazor to 1 wei
      await governance.connect(signers[0]).setMinStake(toBigNumber('1'));
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc1);

      // Try to unstake and withdraw and set stake to 1 wei
      const sToken = await stakedToken.attach(staker.tokenAddress);
      let unstakeAmount = await sToken.balanceOf(signers[1].address);
      unstakeAmount = unstakeAmount.sub(toBigNumber('1'));
      await sToken.connect(signers[1]).approve(stakeManager.address, unstakeAmount);
      await stakeManager.connect(signers[1]).unstake(1, unstakeAmount);
      for (let i = 0; i <= UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      await stakeManager.connect(signers[1]).initiateWithdraw(1);
      for (let i = 0; i <= WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      await (stakeManager.connect(signers[1]).unlockWithdraw(1));

      await mineToNextEpoch();
      const epoch = await getEpoch();
      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
      secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);
      await reveal(collectionManager, signers[2], 0, voteManager, stakeManager);

      await mineToNextState(); // propose
      const idsRevealed = await getIdsRevealed(collectionManager);
      const medians = await calculateMedians(collectionManager);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIterationWithPosition(voteManager, stakeManager, staker, biggestStake, 2);
      const tx = blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
      await assertRevert(tx, 'not elected');
    });

    it('should be able to confirm block in next epoch if no block is confirmed in current epoch', async function () {
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextEpoch(); // commit
      const epoch = await getEpoch();
      const secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
      expect(await blockManager.isBlockConfirmed(epoch - 1)).to.be.true;
    });

    it('Blocks should be proposed according to iteration', async function () {
      await reset();
      await mineToNextEpoch();
      const epoch = await getEpoch();

      // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      // const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      // const votes4 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = await getSecret(signers[3]);
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

      // const votes5 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

      // const votes6 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal

      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);

      await reveal(collectionManager, signers[2], 0, voteManager, stakeManager);
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);

      await reveal(collectionManager, signers[3], 0, voteManager, stakeManager);
      const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

      await reveal(collectionManager, signers[4], 0, voteManager, stakeManager);
      const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);

      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager);
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);

      await mineToNextState(); // propose state

      let sortedProposedBlockId;
      let sortedProposedBlock;

      const proposedBlocksIteration1 = {};
      const proposedBlocksIteration = [];

      const medians = await calculateMedians(collectionManager);

      let staker = await stakeManager.getStaker(stakerIdAcc1);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[1] = iteration;
      proposedBlocksIteration.push(iteration);
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc2);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[2] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[2]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc3);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[3] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[3]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc4);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[4] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[4]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc5);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[5] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[5]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      const proposedBlocksLength = await blockManager.getNumProposedBlocks(epoch);
      const sorted = proposedBlocksIteration.slice().sort((a, b) => a - b);
      for (let i = 0; i < proposedBlocksLength; i++) { // 20341
        sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, i);
        sortedProposedBlock = await blockManager.proposedBlocks(epoch, sortedProposedBlockId);
        assertBNEqual(sorted[i], sortedProposedBlock.iteration, 'Not sorted properly');
      }
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      // const sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, 0);
      // const block = await blockManager.getProposedBlock(epoch, sortedProposedBlockId);
      let lowest = proposedBlocksIteration1[1];
      for (let i = 1; i <= 5; i++) {
        if (proposedBlocksIteration1[i] < lowest) {
          lowest = proposedBlocksIteration1[i];
        }
      }
    });

    it('If Biggest Influence of subquecent, block is larger; it should replace all the other blocks, if smaller; should not be added', async function () {
      await reset();
      await mineToNextEpoch();
      const epoch = await getEpoch();

      for (let i = 1; i <= 5; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }

      await mineToNextState(); // reveal

      for (let i = 1; i <= 5; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }

      await mineToNextState(); // propose state

      const medians = await calculateMedians(collectionManager);

      // [9,11,13,12,10]
      const stakerIds = [1, 2, 3, 4, 5];
      const stakeLargest = (await voteManager.getStakeSnapshot(epoch, stakerIds[0]));
      const stakeSmallest = (await voteManager.getStakeSnapshot(epoch, stakerIds[2]));
      const stakeMid = (await voteManager.getStakeSnapshot(epoch, stakerIds[4]));
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      let staker = await stakeManager.getStaker(stakerIdAcc1);

      // Block with Mid Stake
      const iteration = await getIteration(voteManager, stakeManager, staker, stakeMid);
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        stakerIds[4]); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));

      // Block with smaller stake, should not be added
      const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
      staker = await stakeManager.getStaker(stakerIdAcc3);
      const iteration2 = await getIteration(voteManager, stakeManager, staker, stakeSmallest);
      await blockManager.connect(signers[3]).propose(epoch,
        idsRevealed,
        medians,
        iteration2,
        stakerIds[2]); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));

      // Another Block with Mid Stake
      const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
      staker = await stakeManager.getStaker(stakerIdAcc4);
      const iteration3 = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[4]).propose(epoch,
        idsRevealed,
        medians,
        iteration3,
        stakerIds[4]); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      if (iteration3 > iteration) {
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 1), toBigNumber('1'));
      } else {
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('1'));
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 1), toBigNumber('0'));
      }

      // Block With Largest Stake, Should Replace Previous one
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
      staker = await stakeManager.getStaker(stakerIdAcc2);

      const iteration1 = await getIteration(voteManager, stakeManager, staker, stakeLargest);
      await blockManager.connect(signers[2]).propose(epoch,
        idsRevealed,
        medians,
        iteration1,
        stakerIds[0]); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('2'));
    });

    it('proposed blocks length should not be more than maxAltBlocks', async function () {
      await reset();
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 1;
      const maxAltBlocks = Number(await blockManager.maxAltBlocks());

      await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('420000'));

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        const secret = await getSecret(signers[base + i]);
        await commit(signers[base + i], 0, voteManager, collectionManager, secret, blockManager);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await reveal(collectionManager, signers[base + i], 0, voteManager, stakeManager);
      }

      await mineToNextState(); // propose state

      const medians = await calculateMedians(collectionManager);

      const proposeData = [];
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        const stakerIdAcc = await stakeManager.stakerIds(signers[base + i].address);
        const staker = await stakeManager.getStaker(stakerIdAcc);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        proposeData.push({ id: (base + i), iteration });
      }
      proposeData.sort((a, b) => a.iteration - b.iteration);
      const idsRevealed = await getIdsRevealed(collectionManager);
      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await blockManager.connect(signers[(proposeData[i]).id]).propose(epoch,
          idsRevealed,
          medians,
          (proposeData[i]).iteration,
          biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      }
      assertBNEqual(await blockManager.getNumProposedBlocks(epoch), await blockManager.maxAltBlocks());
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      // This above activation and deactivation of assets is done only to increase coverage
      await blockManager.connect(signers[(proposeData[0]).id]).claimBlockReward();
    });

    it('should be able to pop the block if all subsequent blocks have better iteration respectively', async function () {
      await reset();
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 1;
      const maxAltBlocks = Number(await blockManager.maxAltBlocks());

      await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('420000'));

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        const secret = await getSecret(signers[base + i]);
        await commit(signers[base + i], 0, voteManager, collectionManager, secret, blockManager);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await reveal(collectionManager, signers[base + i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose state

      const medians = await calculateMedians(collectionManager);

      const proposeData = [];
      // let stakerIdAcc = await stakeManager.stakerIds(signers[base].address);
      // let staker = await stakeManager.getStaker(stakerIdAcc);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      for (let i = 0; i < maxAltBlocks + 1; i++) {
        const stakerIdAcc = await stakeManager.stakerIds(signers[base + i].address);
        const staker = await stakeManager.getStaker(stakerIdAcc);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        proposeData.push({ id: (base + i), iteration });
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      proposeData.sort((a, b) => b.iteration - a.iteration);
      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await blockManager.connect(signers[(proposeData[i]).id]).propose(epoch,
          idsRevealed,
          medians,
          (proposeData[i]).iteration,
          biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      }
      assertBNEqual(await blockManager.getNumProposedBlocks(epoch), await blockManager.maxAltBlocks());
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
    });

    it('staker should not be able to propose when not elected', async function () {
      await reset();
      // Try to propose using wrong iteration
      const medians = await calculateMedians(collectionManager);
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const idsRevealed = await getIdsRevealed(collectionManager);
      const epoch = await getEpoch();
      const tx = blockManager.connect(signers[2]).propose(epoch,
        idsRevealed,
        medians,
        iteration + 1,
        biggestStakerId);
      await assertRevert(tx, 'not elected');
    });
  });
  describe('Block Manager: Give Sorted and Finalize dispute', async () => {
    let validLeafIdToBeDisputed;
    let validCollectionIdToBeDisputed;
    before(async () => {
      await restoreSnapshot(snapshotId2);
      snapshotId2 = await takeSnapshot();

      await reset();
      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager, collectionManager);
      await reveal(collectionManager, signers[2], 0, voteManager, stakeManager, collectionManager);

      await mineToNextState(); // propose

      const result = await calculateInvalidMedians(collectionManager, 1);
      validLeafIdToBeDisputed = result[1];
      validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await proposeWithDeviation(signers[2], 1, stakeManager, blockManager, voteManager, collectionManager);

      await mineToNextState(); // dispute
    });

    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('Give sorted should work properly', async function () {
      const epoch = await getEpoch();
      const {
        median, totalInfluenceRevealed, sortedValues,
      } = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, sortedValues);
      const dispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(dispute.collectionId, validCollectionIdToBeDisputed, 'collectionId should match');
      assertBNEqual(dispute.median, median, 'median should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.lastVisitedValue, sortedValues[sortedValues.length - 1], 'lastVisited should match');
    });

    it('should be able to reset dispute incase of wrong values being entered', async function () {
      const epoch = await getEpoch();

      const sortedValues = [200];
      await blockManager.connect(signers[13]).giveSorted(epoch, 1, sortedValues);

      const beforeDisputeReset = await blockManager.disputes(epoch, signers[13].address);
      assertBNEqual(beforeDisputeReset.collectionId, 1, 'collectionId should match');

      await blockManager.connect(signers[13]).resetDispute(epoch);
      const afterDisputeReset = await blockManager.disputes(epoch, signers[13].address);

      assertBNEqual(afterDisputeReset.collectionId, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.accWeight, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.lastVisitedValue, toBigNumber('0'));
    });

    it('For the second batch while raising dispute, assetid should match to the disputed assetid of first batch', async function () {
      const epoch = await getEpoch();
      const values = [(validCollectionIdToBeDisputed) * 100];
      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, values);
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed + 1, values);
      await assertRevert(tx, 'collectionId mismatch');
    });

    it('should be able to finalize Dispute and redeem bounty once lock period is over', async function () {
      const epoch = await getEpoch();

      const {
        sortedValues,
      } = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, sortedValues);

      const stakerIdAccount = await stakeManager.stakerIds(signers[2].address);
      const stakeBeforeAcc5 = (await stakeManager.getStaker(stakerIdAccount)).stake;
      const balanceBeforeBurn = await razor.balanceOf(BURN_ADDRESS);

      let blockId;
      let block;
      let blockIndex;
      for (let i = 0; i < (await blockManager.getNumProposedBlocks(epoch)); i++) {
        blockId = await blockManager.sortedProposedBlockIds(epoch, i);
        block = await blockManager.proposedBlocks(epoch, blockId);
        if (toBigNumber(block.proposerId).eq(2)) {
          blockIndex = i;
          break;
        }
      }

      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, blockId, signers[19], blockManager, collectionManager);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, blockIndex, collectionIndexInBlock);
      const slashNums = await stakeManager.slashNums();
      const bountySlashNum = slashNums[0];
      const burnSlashNum = slashNums[1];
      const keepSlashNum = slashNums[2];
      const amountToBeBurned = stakeBeforeAcc5.mul(burnSlashNum).div(BASE_DENOMINATOR);
      const bounty = stakeBeforeAcc5.mul(bountySlashNum).div(BASE_DENOMINATOR);
      const amountTobeKept = stakeBeforeAcc5.mul(keepSlashNum).div(BASE_DENOMINATOR);
      const slashPenaltyAmount = amountToBeBurned.add(bounty).add(amountTobeKept);

      assertBNEqual((await stakeManager.getStaker(stakerIdAccount)).stake, stakeBeforeAcc5.sub(slashPenaltyAmount), 'staker did not get slashed');

      // Bounty should be locked
      assertBNEqual(await stakeManager.bountyCounter(), toBigNumber('1'));
      const bountyLock = await stakeManager.bountyLocks(toBigNumber('1'));
      assertBNEqual(bountyLock.bountyHunter, signers[19].address);
      assertBNEqual(bountyLock.redeemAfter, epoch + WITHDRAW_LOCK_PERIOD);
      assertBNEqual(bountyLock.amount, bounty);
      assertBNEqual(await razor.balanceOf(BURN_ADDRESS), balanceBeforeBurn.add(amountToBeBurned));

      const balanceBeforeAcc19 = await razor.balanceOf(signers[19].address);
      // Shouldnt be reedemable before withdrawlock period
      const tx = stakeManager.connect(signers[19]).redeemBounty(toBigNumber('1'));
      await assertRevert(tx, 'Redeem epoch not reached');
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      // Anyone shouldnt be able to redeem someones elses bounty
      const tx1 = stakeManager.connect(signers[3]).redeemBounty(toBigNumber('1'));
      await assertRevert(tx1, 'Incorrect Caller');

      // Should able to redeem
      await stakeManager.connect(signers[19]).redeemBounty(toBigNumber('1'));
      assertBNEqual(await razor.balanceOf(signers[19].address), balanceBeforeAcc19.add(bountyLock.amount), 'disputer did not get bounty');

      // Should not able to redeem again
      const tx2 = stakeManager.connect(signers[19]).redeemBounty(toBigNumber('1'));
      await assertRevert(tx2, 'Incorrect Caller');
    });

    it('should be able to dispute in batches', async function () {
      // Commit
      let sig1Vals;
      let sig2Vals;
      let validLeafIdToBeDisputed = -1;
      let validCollectionIdToBeDisputed;
      let epoch = await getEpoch();
      while (Number(validLeafIdToBeDisputed) === -1) {
        await reset();
        await mineToNextEpoch();

        let secret = await getSecret(signers[1]);
        await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

        secret = await getSecret(signers[2]); // intentionally passing same secret
        await commit(signers[2], 20, voteManager, collectionManager, secret, blockManager);

        // Reveal
        await mineToNextState();

        await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);

        await reveal(collectionManager, signers[2], 20, voteManager, stakeManager);
        // Propose
        await mineToNextState();

        sig1Vals = await getValuesArrayRevealed(signers[1]);
        sig2Vals = await getValuesArrayRevealed(signers[2]);
        for (let i = 0; i < sig1Vals.length; i++) {
          if (Number(sig1Vals[i].leafId) === Number(sig2Vals[i].leafId)) {
            validLeafIdToBeDisputed = sig1Vals[i].leafId;
            validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);
            break;
          }
        }
      }

      await proposeWithDeviation(signers[1], 1, stakeManager, blockManager, voteManager, collectionManager);

      const values1 = [];
      const values2 = [];
      values1[0] = (toBigNumber(validCollectionIdToBeDisputed)).mul(100);
      values2[0] = ((toBigNumber(validCollectionIdToBeDisputed)).mul(100)).add(20);

      // Calculate Dispute data
      await mineToNextState(); // dispute
      epoch = await getEpoch();
      const {
        median, totalInfluenceRevealed, sortedValues,
      } = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);

      // Dispute in batches
      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, values1);

      const tx = blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, [0]);
      await assertRevert(tx, 'sortedValue <= LVV ');

      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, values2);
      const dispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(dispute.collectionId, validCollectionIdToBeDisputed, 'leafId should match');
      assertBNEqual(dispute.median, median, 'leafId should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.lastVisitedValue, sortedValues[sortedValues.length - 1], 'lastVisitedValue should match');
    });

    it('all blocks being disputed and should not able to dispute same block again', async function () {
      await reset();
      await mineToNextEpoch();

      const epoch = await getEpoch();

      // const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010];

      secret = await getSecret(signers[2]);
      await commit(signers[2], 10, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal

      // Staker 6

      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);
      // Staker 7

      await reveal(collectionManager, signers[2], 10, voteManager, stakeManager);

      await mineToNextState(); // propose

      const result = await calculateInvalidMedians(collectionManager, 100);
      const validLeafIdToBeDisputed = result[1];
      const validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);

      await proposeWithDeviation(signers[1], 100, stakeManager, blockManager, voteManager, collectionManager);

      await proposeWithDeviation(signers[2], 100, stakeManager, blockManager, voteManager, collectionManager);

      await mineToNextState(); // dispute

      const res1 = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, res1.sortedValues);
      const firstDispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(firstDispute.collectionId, validCollectionIdToBeDisputed, 'collectionId should match');
      assertBNEqual(firstDispute.median, res1.median, 'median should match');
      assertBNEqual(firstDispute.accWeight, res1.totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(firstDispute.lastVisitedValue, (res1.sortedValues)[((res1.sortedValues).length) - 1], 'lastVisitedValue should match');

      let collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager, collectionManager);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock);

      const tx = blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock);

      await assertRevert(tx, 'Block already has been disputed');
      const res2 = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.connect(signers[15]).giveSorted(epoch, validCollectionIdToBeDisputed, res2.sortedValues);

      const secondDispute = await blockManager.disputes(epoch, signers[15].address);

      assertBNEqual(secondDispute.collectionId, validCollectionIdToBeDisputed, 'collectionId should match');
      assertBNEqual(secondDispute.median, res2.median, 'median should match');
      assertBNEqual(secondDispute.accWeight, res2.totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(secondDispute.lastVisitedValue, (res1.sortedValues)[((res1.sortedValues).length) - 1], 'lastVisited should match');

      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 1),
        signers[15], blockManager, collectionManager);
      await blockManager.connect(signers[15]).finalizeDispute(epoch, 1, collectionIndexInBlock);
      // assertBNEqual(secondDispute2.median, res2.median, 'median should match');
      // assert((await proposedBlock.valid) === false);
    });

    it('should not be able to finalize dispute, if total influence revealed does not match', async function () {
      // commit
      await reset();
      await mineToNextEpoch();
      let epoch = await getEpoch();

      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
      secret = await getSecret(signers[2]);
      await commit(signers[2], 10, voteManager, collectionManager, secret, blockManager);

      // Reveal
      await mineToNextState();

      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager, collectionManager);
      await reveal(collectionManager, signers[2], 10, voteManager, stakeManager, collectionManager);

      // Propose
      await mineToNextState();

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      const result = await calculateInvalidMedians(collectionManager, 0);
      const validLeafIdToBeDisputed = toBigNumber(result[1]);
      const validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);

      await propose(signers[2], stakeManager, blockManager, voteManager, collectionManager);

      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      await blockManager.connect(signers[9]).giveSorted(epoch, validCollectionIdToBeDisputed, [(validLeafIdToBeDisputed) * 100]);
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[9], blockManager, collectionManager);
      const tx = blockManager.connect(signers[9]).finalizeDispute(epoch, 0, collectionIndexInBlock);
      await assertRevert(tx, 'TIR is wrong');
    });

    it('should not be able to finalize dispute, if proposed alternate block is identical to proposed blocks', async function () {
      // Commit
      await reset();
      await mineToNextEpoch();
      let epoch = await getEpoch();

      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      // Reveal
      await mineToNextState();

      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);
      // Staker 13
      await reveal(collectionManager, signers[2], 0, voteManager, stakeManager);
      // Propose
      await mineToNextState();
      const result = await calculateInvalidMedians(collectionManager, 0);
      const validLeafIdToBeDisputed = toBigNumber(result[1]);
      const validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      await propose(signers[2], stakeManager, blockManager, voteManager, collectionManager);
      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      const res1 = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);
      await blockManager.connect(signers[10]).giveSorted(epoch, validCollectionIdToBeDisputed, res1.sortedValues);

      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[10], blockManager, collectionManager);
      const tx = blockManager.connect(signers[10]).finalizeDispute(epoch, 0, collectionIndexInBlock);

      await assertRevert(tx, 'Block proposed with same medians');
    });

    it('BlockToBeConfirmed should always have lowest iteration and should be valid', async function () {
      await reset();
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 1;

      for (let i = 0; i < 4; i++) {
        await razor.transfer(signers[base + i].address, tokenAmount('420000'));
        await razor.connect(signers[base + i]).approve(stakeManager.address, tokenAmount('420000'));
        await stakeManager.connect(signers[base + i]).stake(epoch, tokenAmount('420000'));
      }

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      for (let i = 0; i < 4; i++) {
        const secret = await getSecret(signers[base + i]);
        await commit(signers[base + i], 0, voteManager, collectionManager, secret, blockManager);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < 4; i++) {
        await reveal(collectionManager, signers[base + i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose state
      const result = await calculateInvalidMedians(collectionManager, 1);
      const validLeafIdToBeDisputed = toBigNumber(result[1]);
      const validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);

      for (let i = 0; i < 4; i++) {
        await proposeWithDeviation(signers[base + i], 1, stakeManager, blockManager, voteManager, collectionManager);
      }
      await mineToNextState(); // dispute state
      // okay so now we have 4 invalid blcoks
      // lets say sortedProposedBlockId is [A,B,C,D]
      let blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      //  should be 0
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('0'));

      // we dispute A - 0
      const res = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.giveSorted(epoch, validCollectionIdToBeDisputed, res.sortedValues);
      let collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[0], blockManager);

      await blockManager.finalizeDispute(epoch, 0, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should be 1
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('1'));

      // we dispute C - 2
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 2),
        signers[0], blockManager);
      await blockManager.finalizeDispute(epoch, 2, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should not change, be 1 only
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('1'));

      // we dispute B - 1
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 1),
        signers[0], blockManager);
      await blockManager.finalizeDispute(epoch, 1, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();

      // should change to 3
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('3'));

      // we dispute D - 3
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 3),
        signers[0], blockManager);
      await blockManager.finalizeDispute(epoch, 3, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should change to -1 ;
      assertBNEqual(Number(blockIndexToBeConfirmed), -1);
    });
  });

  describe('Block Manager: Claim Block Reward', async () => {
    let validLeafIdToBeDisputed;
    let validCollectionIdToBeDisputed;
    before(async () => {
      await restoreSnapshot(snapshotId2);
      snapshotId2 = await takeSnapshot();
      await reset();
      let secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager, collectionManager);
      await reveal(collectionManager, signers[2], 0, voteManager, stakeManager, collectionManager);

      await mineToNextState(); // propose

      const result = await calculateInvalidMedians(collectionManager, 1);
      validLeafIdToBeDisputed = result[1];
      validCollectionIdToBeDisputed = await collectionManager.getCollectionIdFromLeafId(validLeafIdToBeDisputed);

      await proposeWithDeviation(signers[1], 1, stakeManager, blockManager, voteManager, collectionManager);
      await propose(signers[2], stakeManager, blockManager, voteManager, collectionManager);
    });

    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('should be able to confirm block and receive block reward', async () => {
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await blockManager.connect(signers[1]).claimBlockReward();

      await mineToNextEpoch();
      const epoch = await getEpoch();
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('9'));
      assertBNEqual(
        (await blockManager.getBlock(epoch - 1)).proposerId,
        await stakeManager.stakerIds(signers[1].address),
        `${await stakeManager.stakerIds(signers[1].address)} ID is the one who proposed the block `
      );
    });

    it('block proposed by account 2 should be confirmed after disputing block by account 1', async function () {
      await mineToNextState(); // dispute
      const epoch = await getEpoch();

      const {
        sortedValues,
      } = await calculateDisputesData(validCollectionIdToBeDisputed,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.connect(signers[19]).giveSorted(epoch, validCollectionIdToBeDisputed, sortedValues);

      let blockId;
      let block;
      let blockIndex;
      for (let i = 0; i < (await blockManager.getNumProposedBlocks(epoch)); i++) {
        blockId = await blockManager.sortedProposedBlockIds(epoch, i);
        block = await blockManager.proposedBlocks(epoch, blockId);
        if (toBigNumber(block.proposerId).eq(1)) {
          blockIndex = i;
          break;
        }
      }

      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, blockId, signers[19], blockManager, collectionManager);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, blockIndex, collectionIndexInBlock);

      await mineToNextState(); // confirm

      await blockManager.connect(signers[2]).claimBlockReward();
      assertBNEqual(
        (await blockManager.getBlock(epoch)).proposerId,
        await stakeManager.stakerIds(signers[2].address),
        `${await stakeManager.stakerIds(signers[2].address)} ID is the one who proposed the block `
      );
    });

    it('Only valid staker can call the claimBlockReward function', async function () {
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      const tx = blockManager.connect(signers[0]).claimBlockReward(); // Signer[1] is not a staker
      await assertRevert(tx, 'Structs.Staker does not exist');
    });

    it('if Staker other than BlockProposer tries to call ClaimBlockReward should revert', async function () {
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      const tx = blockManager.connect(signers[2]).claimBlockReward(); // Signer[2] never proposed a block
      await assertRevert(tx, 'Block Proposer mismatches');
    });

    it('If block is already confirmed Block Proposer should not be able to confirm using ClaimBlockReward()', async function () {
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await blockManager.connect(signers[1]).claimBlockReward();// BlockProposer confirms the block
      const tx = blockManager.connect(signers[1]).claimBlockReward(); // it again tries to confirm block
      await assertRevert(tx, 'Block already confirmed');
    });

    it('claimBlockReward should be called in confirm state', async function () {
      await mineToNextState(); // dispute state
      const tx = blockManager.connect(signers[7]).claimBlockReward();
      await assertRevert(tx, 'incorrect state');
    });

    it('should not be able to claim block rewards if no blocks are proposed', async function () {
      await mineToNextEpoch();
      await mineToNextState(); // Reveal
      await mineToNextState(); // Propose
      await mineToNextState(); // Dispute
      await mineToNextState(); // Confirm
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      let staker = await stakeManager.getStaker(stakerIdAcc1);
      const { stake } = staker;
      await blockManager.connect(signers[1]).claimBlockReward();
      staker = await stakeManager.getStaker(stakerIdAcc1);
      assertBNEqual(staker.stake, stake);
    });
  });

  describe('Block Manager: Dispute Miscellaneous', async () => {
    before(async () => {
      await restoreSnapshot(snapshotId2);
      snapshotId2 = await takeSnapshot();
      await reset();
      const epoch = await getEpoch();
      for (let i = 1; i < 4; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }

      await mineToNextState(); // reveal
      for (let i = 1; i < 4; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }

      await mineToNextState(); // propose
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      let staker = await stakeManager.getStaker(stakerIdAcc1);
      const stakeMid = (await voteManager.getStakeSnapshot(epoch, 2));
      const iteration = await getIteration(voteManager, stakeManager, staker, stakeMid);
      const medians = await calculateMedians(collectionManager);
      const idsRevealed = await getIdsRevealed(collectionManager);

      await blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        2); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
      staker = await stakeManager.getStaker(stakerIdAcc2);
      const iteration1 = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[2]).propose(epoch,
        idsRevealed,
        medians,
        iteration1,
        2); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      await mineToNextState(); // dispute
    });

    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('Should not be able to dispute the proposedBlock if correctBiggestStakerId is incorrect', async function () {
      const epoch = await getEpoch();

      assertBNEqual(await blockManager.blockIndexToBeConfirmed(), toBigNumber('0'));
      const tx = blockManager.disputeBiggestStakeProposed(epoch, 0, 3);
      await assertRevert(tx, 'Invalid dispute : Stake');
    });

    it('Should be able to dispute the proposedBlock with incorrect influnce', async function () {
      const epoch = await getEpoch();

      const staker = await stakeManager.getStaker(1);
      const stakeBefore = staker.stake;
      assertBNEqual(await blockManager.blockIndexToBeConfirmed(), toBigNumber('0'));
      await blockManager.disputeBiggestStakeProposed(epoch, 0, 1);
      assertBNEqual(await blockManager.blockIndexToBeConfirmed(), toBigNumber('1'));

      const slashNums = await stakeManager.slashNums();
      const bountySlashNum = slashNums[0];
      const burnSlashNum = slashNums[1];
      const keepSlashNum = slashNums[2];
      const amountToBeBurned = stakeBefore.mul(burnSlashNum).div(BASE_DENOMINATOR);
      const bounty = stakeBefore.mul(bountySlashNum).div(BASE_DENOMINATOR);
      const amountTobeKept = stakeBefore.mul(keepSlashNum).div(BASE_DENOMINATOR);
      const slashPenaltyAmount = amountToBeBurned.add(bounty).add(amountTobeKept);

      assertBNEqual((await stakeManager.getStaker(1)).stake, stakeBefore.sub(slashPenaltyAmount), 'staker did not get slashed');

      // Bounty should be locked
      const bountyId = await stakeManager.bountyCounter();
      const bountyLock = await stakeManager.bountyLocks(bountyId);
      assertBNEqual(bountyLock.bountyHunter, signers[0].address);
      assertBNEqual(bountyLock.redeemAfter, epoch + WITHDRAW_LOCK_PERIOD);
      assertBNEqual(bountyLock.amount, bounty);

      const tx = blockManager.disputeBiggestStakeProposed(epoch, 0, 10);
      await assertRevert(tx, 'Block already has been disputed');
    });

    it('dispute a block having a deactivated collection', async function () {
      await reset();
      await mineToNextState();
      await collectionManager.setCollectionStatus(false, 1);

      await mineToNextEpoch();
      const epoch = await getEpoch();
      const secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState();
      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);

      await mineToNextState();
      const medians = await calculateMedians(collectionManager);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const stakerIdAcc = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const idsRevealed = await getIdsRevealed(collectionManager);
      medians.push(100);
      idsRevealed.push(1);
      idsRevealed.sort(function (a, b) { return a - b; });
      medians.sort(function (a, b) { return a - b; });
      await blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      await mineToNextState();

      await blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 1, 0);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should change to -1 ;
      assertBNEqual(Number(blockIndexToBeConfirmed), -1);
      const tx = blockManager.disputeCollectionIdShouldBeAbsent(epoch, 0, 1, 0);
      await assertRevert(tx, 'Block already has been disputed');
    });

    it('dispute a block not having revealed collection', async function () {
      await reset();
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState();
      await reveal(collectionManager, signers[1], 0, voteManager, stakeManager);

      await mineToNextState();
      const medians = await calculateMedians(collectionManager);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const stakerIdAcc = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const idsRevealed = await getIdsRevealed(collectionManager);
      const removedId = idsRevealed[idsRevealed.length - 1];
      medians.pop();
      idsRevealed.pop();

      await blockManager.connect(signers[1]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      await mineToNextState();

      await blockManager.disputeCollectionIdShouldBePresent(epoch, 0, removedId);
      const blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should change to -1 ;
      assertBNEqual(Number(blockIndexToBeConfirmed), -1);
      const tx = blockManager.disputeCollectionIdShouldBePresent(epoch, 0, removedId);
      await assertRevert(tx, 'Block already has been disputed');
    });
  });
});
