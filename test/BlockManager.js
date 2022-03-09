/* eslint-disable prefer-destructuring */
// @dev : above is a quick fix for this linting error
// I couldnt understand what it meant, to solve it

const {
  assertBNEqual,
  assertDeepEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
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
} = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
  tokenAmount,
  getCollectionIdPositionInBlock,
} = require('./helpers/utils');

const { utils } = ethers;
const {
  commit, reveal, propose, proposeWithDeviation, reset, calculateMedians, calculateInvalidMedians,
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
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('razor', async () => {
    let validLeafIdToBeDisputed;
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

    it('should be able to initialize', async () => {
      await Promise.all(await initializeContracts());

      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      let name;
      const power = -2;
      const selectorType = 0;
      const weight = 50;
      let i = 0;
      while (i < 9) {
        name = `test${i}`;
        await collectionManager.createJob(weight, power, selectorType, name, selector, url);
        i++;
      }

      await mineToNextEpoch();
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();

      let Cname;
      for (let i = 1; i <= 8; i++) {
        Cname = `Test Collection${String(i)}`;
        await collectionManager.createCollection(500, 3, 1, [i, i + 1], Cname);
      }
      Cname = 'Test Collection10';
      await collectionManager.createCollection(500, 3, 1, [9, 1], Cname);

      await mineToNextEpoch();
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

      await razor.connect(signers[1]).approve(stakeManager.address, tokenAmount('420000'));
      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('420000'));

      const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[1], 0, voteManager, stakeManager, collectionManager);
    });

    it('should be able to propose', async function () {
      const epoch = await getEpoch();
      await mineToNextState(); // propose
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('1'), 'incorrect proposalID');
    });

    it('Number of proposals should be 1', async function () {
      const epoch = await getEpoch();
      const nblocks = await blockManager.getNumProposedBlocks(epoch);
      assertBNEqual(nblocks, toBigNumber('1'), 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('should not be able to propose again if already proposed', async function () {
      const epoch = await getEpoch();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      const tx = blockManager.connect(signers[1]).propose(epoch,
        [0, 0, 0],
        [],
        iteration,
        biggestStakerId);

      await assertRevert(tx, 'Already proposed');
    });

    it('should be able to confirm block and receive block reward', async () => {
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[1]).claimBlockReward();

      await reset();
      await mineToNextEpoch();
      const epoch = await getEpoch();
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('9'));
      assertBNEqual(
        (await blockManager.getBlock(epoch - 1)).proposerId,
        await stakeManager.stakerIds(signers[1].address),
        `${await stakeManager.stakerIds(signers[1].address)} ID is the one who proposed the block `
      );
    });

    it('should not allow invalid proposals', async function () {
      const epoch = await getEpoch();
      await reset();
      await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('180000'));

      await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('180000'));

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      let secret = '0x727d5c9e6d18ed15ce7ac34dcce6ec8a0e9c02481415c0823ea49d847ccb9ded';
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9dcd';
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      // const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc';
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[1], 0, voteManager, stakeManager);
      await reveal(signers[2], 0, voteManager, stakeManager);
      await reveal(signers[3], 0, voteManager, stakeManager);

      await mineToNextState(); // propose

      const result = await calculateInvalidMedians(collectionManager, 1);
      validLeafIdToBeDisputed = result[1];

      await proposeWithDeviation(signers[1], 1, stakeManager, blockManager, voteManager, collectionManager);
    });

    it('should allow other proposals', async function () {
      const epoch = await getEpoch();
      const stakerIdAcc6 = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.getStaker(stakerIdAcc6);
      const firstProposedBlock = await blockManager.proposedBlocks(epoch, 0);
      const { biggestStake } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      await propose(signers[2], stakeManager, blockManager, voteManager, collectionManager);
      const secondProposedBlock = (firstProposedBlock.iteration.gt(iteration))
        ? await blockManager.proposedBlocks(epoch, 0) : await blockManager.proposedBlocks(epoch, 1);
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[1].address);
      const proposerId = (firstProposedBlock.iteration.gt(iteration))
        ? stakerIdAcc5 : stakerIdAcc6;
      assertBNEqual(secondProposedBlock.proposerId, proposerId);
      await reset();
    });

    it('Number of proposals should be 2', async function () {
      const epoch = await getEpoch();

      const nblocks = await blockManager.getNumProposedBlocks(epoch);

      assertBNEqual(nblocks, toBigNumber('2'), 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('Give sorted should not work if given leafId is invalid', async function () {
      await mineToNextState();
      const epoch = await getEpoch();
      const {
        median, totalInfluenceRevealed, sortedValues,
      } = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, sortedValues);
      const numActiveCollections = await collectionManager.getNumActiveCollections();
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, numActiveCollections, sortedValues);
      await assertRevert(tx, 'Invalid leafId');
      const dispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(dispute.leafId, validLeafIdToBeDisputed, 'collectionId should match');
      assertBNEqual(dispute.median, median, 'median should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.lastVisitedValue, sortedValues[sortedValues.length - 1], 'lastVisited should match');
    });

    it('should be able to finalize Dispute', async function () {
      let epoch = await getEpoch();

      const stakerIdAccount = await stakeManager.stakerIds(signers[1].address);
      const stakeBeforeAcc5 = (await stakeManager.getStaker(stakerIdAccount)).stake;
      const balanceBeforeBurn = await razor.balanceOf(BURN_ADDRESS);

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
      epoch = await getEpoch();
      assertBNEqual(bountyLock.bountyHunter, signers[19].address);
      assertBNEqual(bountyLock.redeemAfter, epoch + WITHDRAW_LOCK_PERIOD);
      assertBNEqual(bountyLock.amount, bounty);
      assertBNEqual(await razor.balanceOf(BURN_ADDRESS), balanceBeforeBurn.add(amountToBeBurned));
    });

    it('block proposed by account 6 should be confirmed', async function () {
      await mineToNextState();
      await blockManager.connect(signers[2]).claimBlockReward();
      const epoch = await getEpoch();
      assertBNEqual(
        (await blockManager.getBlock(epoch)).proposerId,
        await stakeManager.stakerIds(signers[2].address),
        `${await stakeManager.stakerIds(signers[2].address)} ID is the one who proposed the block `
      );
    });

    it('Once Lock Period is over, Disputer should be able to redeem bounty', async function () {
      const bountyLock = await stakeManager.bountyLocks(toBigNumber('1'));
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

    it('all blocks being disputed and should not able to dispute same block again', async function () {
      await mineToNextEpoch();

      const epoch = await getEpoch();

      await razor.connect(signers[4]).approve(stakeManager.address, tokenAmount('190000'));
      await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('190000'));

      // const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      let secret = '0x727d5c9e6d18ed15ce7ac34dcce6ec8a0e9c02481415c0823ea748d94ccb9ded';
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010];

      secret = '0x727d5c9e6d18ed15ce7ac34dcce6ec8a0e9c02481415c0823ea49d89dedccb47';
      await commit(signers[4], 10, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal

      // Staker 6

      await reveal(signers[2], 0, voteManager, stakeManager);
      // Staker 7

      await reveal(signers[4], 10, voteManager, stakeManager);

      await mineToNextState(); // propose

      const result = await calculateInvalidMedians(collectionManager, 100);
      validLeafIdToBeDisputed = result[1];

      await proposeWithDeviation(signers[2], 100, stakeManager, blockManager, voteManager, collectionManager);

      await proposeWithDeviation(signers[4], 100, stakeManager, blockManager, voteManager, collectionManager);

      await reset();
      await mineToNextState(); // dispute

      const res1 = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, res1.sortedValues);
      const firstDispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(firstDispute.leafId, validLeafIdToBeDisputed, 'collectionId should match');
      assertBNEqual(firstDispute.median, res1.median, 'median should match');
      assertBNEqual(firstDispute.accWeight, res1.totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(firstDispute.lastVisitedValue, (res1.sortedValues)[((res1.sortedValues).length) - 1], 'lastVisitedValue should match');

      let collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager, collectionManager);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock);

      const tx = blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock);

      await assertRevert(tx, 'Block already has been disputed');
      const res2 = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);

      await blockManager.connect(signers[15]).giveSorted(epoch, validLeafIdToBeDisputed, res2.sortedValues);

      const secondDispute = await blockManager.disputes(epoch, signers[15].address);

      assertBNEqual(secondDispute.leafId, validLeafIdToBeDisputed, 'collectionId should match');
      assertBNEqual(secondDispute.median, res2.median, 'median should match');
      assertBNEqual(secondDispute.accWeight, res2.totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(secondDispute.lastVisitedValue, (res1.sortedValues)[((res1.sortedValues).length) - 1], 'lastVisited should match');

      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 1),
        signers[15], blockManager, collectionManager);
      await blockManager.connect(signers[15]).finalizeDispute(epoch, 1, collectionIndexInBlock);
      // assertBNEqual(secondDispute2.median, res2.median, 'median should match');
      // assert((await proposedBlock.valid) === false);
    });

    it('if no block is valid in previous epoch, stakers should not be penalised', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      const stakerIdAcc8 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);

      // const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const secret = '0x727d5c9e6d18ed15ce7acd83cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      const { stake } = staker;

      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

      assertBNEqual((await blockManager.getBlock(epoch - 1)).proposerId, toBigNumber('0'));
      assertBNEqual(((await blockManager.getBlock(epoch - 1)).medians).length, toBigNumber('0'));
      // assert((await blockManager.getBlock(epoch - 1)).valid === false);

      await mineToNextState(); // reveal

      await reveal(signers[3], 0, voteManager, stakeManager);
      assertBNEqual(staker.stake, stake, 'Stake should have remained the same');
    });

    it('should be able to reset dispute incase of wrong values being entered', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('190000'));
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('190000'));

      // const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a9e0c02481415c0823ea49d847ecb9ddd';
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal

      await reveal(signers[5], 0, voteManager, stakeManager);

      await mineToNextState(); // propose
      const stakerIdAcc20 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc20);

      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const medians = await calculateMedians(collectionManager);
      medians[0] += 1;

      await blockManager.connect(signers[5]).propose(epoch,
        [2, 3, 4, 9],
        medians,
        iteration,
        biggestStakerId); // [ 200, 300, 400, 900 ]
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('5'), 'incorrect proposalID');
      await reset();
      await mineToNextState(); // dispute

      const sortedValues = [200];
      await blockManager.connect(signers[13]).giveSorted(epoch, 1, sortedValues);

      const beforeDisputeReset = await blockManager.disputes(epoch, signers[13].address);
      assertBNEqual(beforeDisputeReset.leafId, 1, 'collectionId should match');

      await blockManager.connect(signers[13]).resetDispute(epoch);
      const afterDisputeReset = await blockManager.disputes(epoch, signers[13].address);

      assertBNEqual(afterDisputeReset.leafId, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.accWeight, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.lastVisitedValue, toBigNumber('0'));

      await mineToNextState(); // confirm
      await blockManager.connect(signers[5]).claimBlockReward();
    });
    /* [300,301,303] */
    it('should be able to dispute in batches', async function () {
      // Commit
      await mineToNextEpoch();
      let epoch = await getEpoch();

      await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[7]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('180000'));
      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      let secret = '0x727d5c9e6d18ed15ce7ac8d3ccccccca0e9c02481415c0823ea49d847ecb9ddd';
      await commit(signers[6], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      secret = '0x727d5c9e6d18ed15ce7ac8d3ccccccca0e9c02481415c0823ea49d847ecb9ddd'; // intentionally passing same secret
      await commit(signers[7], 20, voteManager, collectionManager, secret, blockManager);

      // Reveal
      await mineToNextState();

      await reveal(signers[6], 0, voteManager, stakeManager);

      // Staker 3
      await reveal(signers[7], 20, voteManager, stakeManager);
      // Propose
      await mineToNextState();

      const result = await calculateInvalidMedians(collectionManager, 1);
      validLeafIdToBeDisputed = toBigNumber(result[1]);

      await proposeWithDeviation(signers[6], 1, stakeManager, blockManager, voteManager, collectionManager);

      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('6'), 'incorrect proposalID');
      const values1 = [];
      const values2 = [];
      values1[0] = (validLeafIdToBeDisputed.add(1)).mul(100);
      values2[0] = ((validLeafIdToBeDisputed.add(1)).mul(100)).add(20);
      await reset();
      // Calculate Dispute data
      await mineToNextState(); // dispute
      epoch = await getEpoch();
      const {
        median, totalInfluenceRevealed, sortedValues,
      } = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);

      // Dispute in batches
      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, values1);

      const tx = blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, [0]);
      await assertRevert(tx, 'sortedValue <= LVV ');

      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, values2);
      const dispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(dispute.leafId, validLeafIdToBeDisputed, 'leafId should match');
      assertBNEqual(dispute.median, median, 'leafId should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.lastVisitedValue, sortedValues[sortedValues.length - 1], 'lastVisitedValue should match');
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager, collectionManager);
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock);
    });
    it('staker should not be able to propose when not elected', async function () {
      await mineToNextEpoch();
      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const secret = '0x727d5c8e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ded';
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();
      await reveal(signers[3], 0, voteManager, stakeManager);
      await mineToNextState();
      const tx = propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await reset();
      await assertRevert(tx, 'not elected');
    });
    it('staker should not be able to propose when not not revealed', async function () {
      await mineToNextEpoch();
      const secret = '0x727d5c8e6d18ed15ce7ac8d3cce6ec8a0e9c02481514c0823ea49d847ccb9eee';
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();
      await mineToNextState();
      const tx = propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
      try {
        await assertRevert(tx, 'Cannot propose without revealing');
      } catch (err) {
        await assertRevert(tx, 'not elected');
      }
      await reset();
    });
    it('staker should not be able to propose when stake goes below minStake', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const secret = '0x727d5c8e6d18ed15ce7ac8d36eccec8a0e9c02481514c0823ea49d847ccb9eee';
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();
      await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
      await mineToNextState();
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.setStakerStake(epoch, stakerIdAcc2, 2, staker.stake, tokenAmount('19999'));
      const tx = propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
      await assertRevert(tx, 'stake below minimum stake');
      await reset();
      await mineToNextState();
      await mineToNextState();
      await blockManager.connect(signers[3]).claimBlockReward();
    });
    it('For the second batch while raising dispute, assetid should match to the disputed assetid of first batch', async function () {
      await mineToNextEpoch();
      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const epoch = await getEpoch();
      const secret = '0x555d7c8e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ded';
      await commit(signers[7], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();// reveal
      await reveal(signers[7], 0, voteManager, stakeManager, collectionManager);
      await mineToNextState();// propose
      const result = await calculateInvalidMedians(collectionManager, 1);
      validLeafIdToBeDisputed = result[1];
      await propose(signers[7], stakeManager, blockManager, voteManager, collectionManager);
      await reset();
      await mineToNextState();// dispute
      const values = [(validLeafIdToBeDisputed + 1) * 100];
      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, values);
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, 0, values);
      await assertRevert(tx, 'leafId mismatch');
    });
    it('Only valid staker can call the claimBlockReward function', async function () {
      await mineToNextState(); // confirm state
      const tx = blockManager.connect(signers[0]).claimBlockReward(); // Signer[1] is not a staker
      await assertRevert(tx, 'Structs.Staker does not exist');
    });
    it('if Staker other than BlockProposer tries to call ClaimBlockReward should revert', async function () {
      const tx = blockManager.connect(signers[6]).claimBlockReward(); // Signer[2] never proposed a block
      await assertRevert(tx, 'Block Proposer mismatches');
    });
    it('If block is already confirmed Block Proposer should not be able to confirm using ClaimBlockReward()', async function () {
      await blockManager.connect(signers[7]).claimBlockReward();// BlockProposer confirms the block
      const tx = blockManager.connect(signers[7]).claimBlockReward(); // it again tries to confirm block
      await assertRevert(tx, 'Block already confirmed');
    });
    it('claimBlockReward should be called in confirm state', async function () {
      await mineToNextState(); // commit state
      const tx = blockManager.connect(signers[7]).claimBlockReward();
      await assertRevert(tx, 'incorrect state');
    });
    it('should be able to return correct data for getBlockMedians', async function () {
      const tx = (await blockManager.connect(signers[19]).getBlock(await getEpoch())).medians;
      assertDeepEqual(tx, [], 'transaction should return correct data');
    });
    it('should not be able to finalize dispute, if total influence revealed does not match', async function () {
      // commit
      await mineToNextEpoch();
      let epoch = await getEpoch();

      await razor.connect(signers[8]).approve(stakeManager.address, tokenAmount('190000'));
      await stakeManager.connect(signers[8]).stake(epoch, tokenAmount('190000'));

      await razor.connect(signers[9]).approve(stakeManager.address, tokenAmount('170000'));
      await stakeManager.connect(signers[9]).stake(epoch, tokenAmount('170000'));
      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const secret = '0x5d727c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ecb9ddd';
      await commit(signers[8], 0, voteManager, collectionManager, secret, blockManager);
      await commit(signers[9], 10, voteManager, collectionManager, secret, blockManager);

      // Reveal
      await mineToNextState();

      await reveal(signers[8], 0, voteManager, stakeManager, collectionManager);
      await reveal(signers[9], 10, voteManager, stakeManager, collectionManager);

      // Propose
      await mineToNextState();

      await propose(signers[8], stakeManager, blockManager, voteManager, collectionManager);
      const result = await calculateInvalidMedians(collectionManager, 0);
      validLeafIdToBeDisputed = toBigNumber(result[1]);

      await propose(signers[9], stakeManager, blockManager, voteManager, collectionManager);

      await reset();

      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      await blockManager.connect(signers[9]).giveSorted(epoch, validLeafIdToBeDisputed, [(validLeafIdToBeDisputed + 1) * 100]);
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[9], blockManager, collectionManager);
      const tx = blockManager.connect(signers[9]).finalizeDispute(epoch, 0, collectionIndexInBlock);
      await assertRevert(tx, 'TIR is wrong');
      await mineToNextState(); // confirm
      if ((await blockManager.getProposedBlock(
        epoch,
        await blockManager.sortedProposedBlockIds(epoch, 0)
      )).proposerId === 9) { await blockManager.connect(signers[9]).claimBlockReward(); } else {
        await blockManager.connect(signers[8]).claimBlockReward();
      }
    });
    it('should not be able to finalize dispute, if proposed alternate block is identical to proposed blocks', async function () {
      // Commit
      // ** This test case is not passing as in above test case is  not passing and blockisnotbeing confirmed so seed changes
      await mineToNextEpoch();
      let epoch = await getEpoch();

      await razor.connect(signers[10]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[10]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[11]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[11]).stake(epoch, tokenAmount('180000'));
      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ddd9bce';
      await commit(signers[10], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      secret = '0x727d581d6e9ced15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ecb9ddd';
      await commit(signers[11], 0, voteManager, collectionManager, secret, blockManager);

      // Reveal
      await mineToNextState();

      await reveal(signers[10], 0, voteManager, stakeManager);
      const stakerIdAcc12 = await stakeManager.stakerIds(signers[10].address);
      // Staker 13
      await reveal(signers[11], 0, voteManager, stakeManager);
      const stakerIdAcc13 = await stakeManager.stakerIds(signers[11].address);
      // Propose
      await mineToNextState();
      const staker12 = await stakeManager.getStaker(stakerIdAcc12);
      const { biggestStake } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration1 = await getIteration(voteManager, stakeManager, staker12, biggestStake);
      const result = await calculateInvalidMedians(collectionManager, 0);
      validLeafIdToBeDisputed = toBigNumber(result[1]);
      await propose(signers[10], stakeManager, blockManager, voteManager, collectionManager);

      const staker13 = await stakeManager.getStaker(stakerIdAcc13);

      const iteration2 = await getIteration(voteManager, stakeManager, staker13, biggestStake);

      await propose(signers[11], stakeManager, blockManager, voteManager, collectionManager);

      await reset();
      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      const res1 = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[10]).giveSorted(epoch, validLeafIdToBeDisputed, res1.sortedValues);

      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[10], blockManager, collectionManager);
      const tx = blockManager.connect(signers[10]).finalizeDispute(epoch, 0, collectionIndexInBlock);

      await assertRevert(tx, 'Block proposed with same medians');

      await mineToNextState(); // confirm
      if (iteration1 < iteration2) await blockManager.connect(signers[10]).claimBlockReward();
      else await blockManager.connect(signers[11]).claimBlockReward();
    });
    it('Blocks should be proposed according to iteration', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      await razor.connect(signers[12]).approve(stakeManager.address, tokenAmount('421000'));
      await stakeManager.connect(signers[12]).stake(epoch, tokenAmount('421000'));

      await razor.connect(signers[13]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[13]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[14]).approve(stakeManager.address, tokenAmount('419000'));
      await stakeManager.connect(signers[14]).stake(epoch, tokenAmount('419000'));

      await razor.connect(signers[15]).approve(stakeManager.address, tokenAmount('418000'));
      await stakeManager.connect(signers[15]).stake(epoch, tokenAmount('418000'));

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9418420c15c0823ea49d847ccb9ddd';
      await commit(signers[10], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = '0x727d5c9e51de91d6ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      await commit(signers[11], 0, voteManager, collectionManager, secret, blockManager);

      // const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = '0x727d5c9e6d1851de81d6c8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      await commit(signers[12], 0, voteManager, collectionManager, secret, blockManager);

      // const votes4 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = '0x727d5c9e6d1851de81d6c8d3cce6ec8a0e9c02481415c0823ea49d847ccbeee9';
      await commit(signers[13], 0, voteManager, collectionManager, secret, blockManager);

      // const votes5 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = '0x727d5c9e6d1851de81d6c8d3cce6ec8a0e9c02481415c0823ea49d847ccb9eee';
      await commit(signers[14], 0, voteManager, collectionManager, secret, blockManager);

      // const votes6 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = '0x727d5c9e6d1851de81d6c8d3cce6ec8a0e9c02481415c0823ea49d847ccbbbb9';
      await commit(signers[15], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal

      await reveal(signers[10], 0, voteManager, stakeManager);
      const stakerIdAcc12 = await stakeManager.stakerIds(signers[10].address);

      await reveal(signers[11], 0, voteManager, stakeManager);
      const stakerIdAcc13 = await stakeManager.stakerIds(signers[11].address);

      await reveal(signers[12], 0, voteManager, stakeManager);
      const stakerIdAcc14 = await stakeManager.stakerIds(signers[12].address);

      await reveal(signers[13], 0, voteManager, stakeManager);
      const stakerIdAcc15 = await stakeManager.stakerIds(signers[13].address);

      await reveal(signers[14], 0, voteManager, stakeManager);
      const stakerIdAcc16 = await stakeManager.stakerIds(signers[14].address);

      await reveal(signers[15], 0, voteManager, stakeManager);

      await mineToNextState(); // propose state

      let sortedProposedBlockId;
      let sortedProposedBlock;

      const proposedBlocksIteration1 = {};
      const proposedBlocksIteration = [];

      const medians = await calculateMedians(collectionManager);

      let staker = await stakeManager.getStaker(stakerIdAcc12);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[10] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[10]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc13);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[11] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[11]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc14);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[12] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[12]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc15);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[13] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[13]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration,
        biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      staker = await stakeManager.getStaker(stakerIdAcc16);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration1[14] = iteration;
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[14]).propose(epoch,
        [0, 0, 0],
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
      await reset();
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      // const sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, 0);
      // const block = await blockManager.getProposedBlock(epoch, sortedProposedBlockId);
      let id = 10;
      let lowest = proposedBlocksIteration1[10];
      for (let i = 11; i < 15; i++) {
        if (proposedBlocksIteration1[i] < lowest) {
          id = i;
          lowest = proposedBlocksIteration1[i];
        }
      }
      await blockManager.connect(signers[id]).claimBlockReward();
    });

    it('getProposedBlock Function should work as expected', async function () {
      const block = await blockManager.connect(signers[19]).getProposedBlock(await getEpoch(), 0);
      const { medians } = block;
      const { proposerId, iteration, biggestStake } = await blockManager.proposedBlocks(await getEpoch(), 0);
      assertBNEqual(block.proposerId, proposerId, 'it should return correct value');
      assertDeepEqual(block.medians, medians, 'it should return correct value');
      assertBNEqual(block.iteration, iteration, 'it should return correct value');
      assertBNEqual(block.biggestStake, biggestStake, 'it should return correct value');
    });

    it('If Biggest Influence of subquecent, block is larger; it should replace all the other blocks, if smaller; should not be added', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      let secret = '0x727d5c9e6d18ed15ce7ac8dececece8a0e9418555555c0823ea49d847ccb9ddd';
      await commit(signers[9], 0, voteManager, collectionManager, secret, blockManager);

      secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9418555555c0823ea49d847ccb9ddd';
      await commit(signers[10], 0, voteManager, collectionManager, secret, blockManager);

      secret = '0x727d5c9e51de91d6ce7ac8d3cce6ec8a0e0e0e081415c0823ea49d847ccb9ddd';
      await commit(signers[11], 0, voteManager, collectionManager, secret, blockManager);

      secret = '0x727d5c9e6d1851de81d6c8d3cce6ec8a0e9c0eeeeeeee0823ea49d847ccb9ddd';
      await commit(signers[12], 0, voteManager, collectionManager, secret, blockManager);

      secret = '0x727d5c9e6d1851de81d6c889104eecba0e9c02481415c0823ea49d847ccbeee9';
      await commit(signers[13], 0, voteManager, collectionManager, secret, blockManager);

      secret = '0x727d5c9e6d1851de81d6c889104eecba0e9c02481415c0823ea49d847cbcbcbc';
      await commit(signers[14], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal

      for (let i = 9; i < 15; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }

      await mineToNextState(); // propose state

      const medians = await calculateMedians(collectionManager);

      // [9,11,13,12,10]
      const stakerIds = [9, 10, 11, 12, 13];
      const stakeLargest = (await voteManager.getStakeSnapshot(epoch, stakerIds[3]));
      const stakeSmallest = (await voteManager.getStakeSnapshot(epoch, stakerIds[0]));
      const stakeMid = (await voteManager.getStakeSnapshot(epoch, stakerIds[4]));
      const stakerIdAcc12 = await stakeManager.stakerIds(signers[11].address);
      let staker = await stakeManager.getStaker(stakerIdAcc12);

      // Block with Mid Stake
      const iteration = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[11]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration,
        stakerIds[4]); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));

      // Block with smaller stake, should not be added
      const stakerIdAcc14 = await stakeManager.stakerIds(signers[13].address);
      staker = await stakeManager.getStaker(stakerIdAcc14);
      const iteration2 = await getIteration(voteManager, stakeManager, staker, stakeSmallest);
      await blockManager.connect(signers[13]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration2,
        stakerIds[0]); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));

      // Another Block with Mid Stake
      const stakerIdAcc15 = await stakeManager.stakerIds(signers[14].address);
      staker = await stakeManager.getStaker(stakerIdAcc15);
      const iteration3 = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[14]).propose(epoch,
        [0, 0, 0],
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
      const stakerIdAcc13 = await stakeManager.stakerIds(signers[12].address);
      staker = await stakeManager.getStaker(stakerIdAcc13);

      const iteration1 = await getIteration(voteManager, stakeManager, staker, stakeLargest);
      await blockManager.connect(signers[12]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration1,
        stakerIds[3]); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('2'));
      await reset();
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await blockManager.connect(signers[12]).claimBlockReward();
    });

    it('Should not be able to dispute the proposedBlock if correctBiggestStakerId is incorrect', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      let secret = '0x727d5c9e6d18ed15ce7ac8dececece8a0e9418555555c0823ea4ecececececec';
      await commit(signers[10], 0, voteManager, collectionManager, secret, blockManager);

      secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9418555555c65656565ee47ccb9ddd';
      await commit(signers[9], 0, voteManager, collectionManager, secret, blockManager);

      // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      secret = '0x727d5c9e51de91d6ceecbecbecb4ec8a0e0e0e081415c0823ea49d847ccb9ddd';
      await commit(signers[8], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState();

      for (let i = 10; i > 7; i--) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }

      await mineToNextState();
      const stakerIdAcc10 = await stakeManager.stakerIds(signers[9].address);
      let staker = await stakeManager.getStaker(stakerIdAcc10);
      const stakeMid = (await voteManager.getStakeSnapshot(epoch, 8));
      const iteration = await getIteration(voteManager, stakeManager, staker, stakeMid);
      const medians = await calculateMedians(collectionManager);
      await blockManager.connect(signers[9]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration,
        8); // [100, 201, 300, 400, 500, 600, 700, 800, 900]

      const stakerIdAcc11 = await stakeManager.stakerIds(signers[8].address);
      staker = await stakeManager.getStaker(stakerIdAcc11);
      const iteration1 = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[8]).propose(epoch,
        [0, 0, 0],
        medians,
        iteration1,
        8); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      await reset();
      await mineToNextState(); // dispute
      let stakerId;
      if (iteration < iteration1) {
        stakerId = await stakeManager.stakerIds(signers[9].address);
      } else {
        stakerId = await stakeManager.stakerIds(signers[8].address);
      }
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(await blockManager.blockIndexToBeConfirmed(), toBigNumber('0'));
      const tx = blockManager.disputeBiggestStakeProposed(epoch, 0, 9);
      await assertRevert(tx, 'Invalid dispute : Stake');
    });

    it('Should be able to dispute the proposedBlock with incorrect influnce', async function () {
      const epoch = await getEpoch();
      let stakerId;
      const stakerIdAcc10 = await stakeManager.stakerIds(signers[9].address);
      let staker = await stakeManager.getStaker(stakerIdAcc10);
      const stakeMid = (await voteManager.getStakeSnapshot(epoch, 8));
      const iteration = await getIteration(voteManager, stakeManager, staker, stakeMid);
      const stakerIdAcc11 = await stakeManager.stakerIds(signers[8].address);
      staker = await stakeManager.getStaker(stakerIdAcc11);
      const iteration1 = await getIteration(voteManager, stakeManager, staker, stakeMid);
      if (iteration < iteration1) {
        stakerId = await stakeManager.stakerIds(signers[9].address);
      } else {
        stakerId = await stakeManager.stakerIds(signers[8].address);
      }
      staker = await stakeManager.getStaker(stakerId);
      const stakeBefore = staker.stake;
      assertBNEqual(await blockManager.blockIndexToBeConfirmed(), toBigNumber('0'));
      await blockManager.disputeBiggestStakeProposed(epoch, 0, 10);
      assertBNEqual(await blockManager.blockIndexToBeConfirmed(), toBigNumber('1'));

      const slashNums = await stakeManager.slashNums();
      const bountySlashNum = slashNums[0];
      const burnSlashNum = slashNums[1];
      const keepSlashNum = slashNums[2];
      const amountToBeBurned = stakeBefore.mul(burnSlashNum).div(BASE_DENOMINATOR);
      const bounty = stakeBefore.mul(bountySlashNum).div(BASE_DENOMINATOR);
      const amountTobeKept = stakeBefore.mul(keepSlashNum).div(BASE_DENOMINATOR);
      const slashPenaltyAmount = amountToBeBurned.add(bounty).add(amountTobeKept);

      assertBNEqual((await stakeManager.getStaker(stakerId)).stake, stakeBefore.sub(slashPenaltyAmount), 'staker did not get slashed');

      // Bounty should be locked
      const bountyId = await stakeManager.bountyCounter();
      const bountyLock = await stakeManager.bountyLocks(bountyId);
      assertBNEqual(bountyLock.bountyHunter, signers[0].address);
      assertBNEqual(bountyLock.redeemAfter, epoch + WITHDRAW_LOCK_PERIOD);
      assertBNEqual(bountyLock.amount, bounty);

      const tx = blockManager.disputeBiggestStakeProposed(epoch, 0, 10);
      await assertRevert(tx, 'Block already has been disputed');

      await mineToNextState(); // confirm
      if (iteration < iteration1) {
        await blockManager.connect(signers[8]).claimBlockReward();
      } else {
        await blockManager.connect(signers[9]).claimBlockReward();
      }

      // Disputing valid block
      // const tx1 = blockManager.disputeBiggestStakeProposed(epoch, 1, 10);
      // await assertRevert(tx1, 'Invalid dispute : Influence');
    });

    it('proposed blocks length should not be more than maxAltBlocks', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 14;
      const maxAltBlocks = Number(await blockManager.maxAltBlocks());
      await razor.transfer(signers[16].address, tokenAmount('420000'));
      await razor.connect(signers[16]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[16]).stake(epoch, tokenAmount('320000'));

      await razor.transfer(signers[17].address, tokenAmount('420000'));
      await razor.connect(signers[17]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[17]).stake(epoch, tokenAmount('220000'));

      await razor.transfer(signers[18].address, tokenAmount('420000'));
      await razor.connect(signers[18]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[18]).stake(epoch, tokenAmount('120000'));

      await razor.transfer(signers[19].address, tokenAmount('420000'));
      await razor.connect(signers[19]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[19]).stake(epoch, tokenAmount('100000'));

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const secret = [];
      secret.push('0x727d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
      secret.push('0x727d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
      secret.push('0x727d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
      secret.push('0x727d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
      secret.push('0x727d5c9e6d18ed15ce7ac8decbebc56bc7dec8b5555c0823ea4ececececececb');
      secret.push('0x727d5c9e6d18ed15ce7ac8dececece8a0e9418555555c08bceedbcede56d8bc9');

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await commit(signers[base + i], 0, voteManager, collectionManager, secret[i], blockManager);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await reveal(signers[base + i], 0, voteManager, stakeManager);
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
      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await blockManager.connect(signers[(proposeData[i]).id]).propose(epoch,
          [0, 0, 0],
          medians,
          (proposeData[i]).iteration,
          biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      }
      assertBNEqual(await blockManager.getNumProposedBlocks(epoch), await blockManager.maxAltBlocks());
      await reset();
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await collectionManager.setCollectionStatus(false, 9);
      await collectionManager.setCollectionStatus(true, 9);
      // This above activation and deactivation of assets is done only to increase coverage
      await blockManager.connect(signers[(proposeData[0]).id]).claimBlockReward();
    });

    it('should be able to pop the block if all subsequent blocks have better iteration respectively', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 14;
      const maxAltBlocks = Number(await blockManager.maxAltBlocks());

      await razor.transfer(signers[16].address, tokenAmount('420000'));
      await razor.connect(signers[16]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[16]).stake(epoch, tokenAmount('320000'));

      await razor.transfer(signers[17].address, tokenAmount('420000'));
      await razor.connect(signers[17]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[17]).stake(epoch, tokenAmount('220000'));

      await razor.transfer(signers[18].address, tokenAmount('420000'));
      await razor.connect(signers[18]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[18]).stake(epoch, tokenAmount('120000'));

      await razor.transfer(signers[19].address, tokenAmount('420000'));
      await razor.connect(signers[19]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[19]).stake(epoch, tokenAmount('100000'));

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const secret = [];
      secret.push('0x727d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
      secret.push('0x727d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
      secret.push('0x727d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
      secret.push('0x727d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
      secret.push('0x727d5c9e6d18ed15ce7ac8decbebc56bc7dec8b5555c0823ea4ececececececb');
      secret.push('0x727d5c9e6d18ed15ce7ac8dececece8a0e9418555555c08bceedbcede56d8bc9');

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await commit(signers[base + i], 0, voteManager, collectionManager, secret[i], blockManager);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await reveal(signers[base + i], 0, voteManager, stakeManager);
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
      proposeData.sort((a, b) => b.iteration - a.iteration);
      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await blockManager.connect(signers[(proposeData[i]).id]).propose(epoch,
          [0, 0, 0],
          medians,
          (proposeData[i]).iteration,
          biggestStakerId); // [100, 201, 300, 400, 500, 600, 700, 800, 900]
      }
      assertBNEqual(await blockManager.getNumProposedBlocks(epoch), await blockManager.maxAltBlocks());
      await reset();
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await collectionManager.setCollectionStatus(false, 9);
      await collectionManager.setCollectionStatus(true, 9);
      // This above activation and deactivation of assets is done only to increase coverage
      await blockManager.connect(signers[(proposeData[proposeData.length - 1]).id]).claimBlockReward();
    });

    it('BlockToBeConfirmed should always have lowest iteration and should be valid', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 10;

      for (let i = 0; i < 4; i++) {
        await razor.transfer(signers[base + i].address, tokenAmount('420000'));
        await razor.connect(signers[base + i]).approve(stakeManager.address, tokenAmount('420000'));
        await stakeManager.connect(signers[base + i]).stake(epoch, tokenAmount('420000'));
      }

      // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const secret = [];
      secret.push('0x772d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
      secret.push('0x772e5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
      secret.push('0x772b5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
      secret.push('0x277d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');

      for (let i = 0; i < 4; i++) {
        await commit(signers[base + i], 0, voteManager, collectionManager, secret[i], blockManager);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < 4; i++) {
        await reveal(signers[base + i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose state
      const result = await calculateInvalidMedians(collectionManager, 1);
      validLeafIdToBeDisputed = toBigNumber(result[1]);

      for (let i = 0; i < 4; i++) {
        await proposeWithDeviation(signers[base + i], 1, stakeManager, blockManager, voteManager, collectionManager);
      }
      await reset();
      await mineToNextState(); // dispute state
      // okay so now we have 4 invalid blcoks
      // lets say sortedProposedBlockId is [A,B,C,D]
      let blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      //  should be 0
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('0'));

      // we dispute A - 0
      const res = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);

      await blockManager.giveSorted(epoch, validLeafIdToBeDisputed, res.sortedValues);
      let collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[0], blockManager, collectionManager);

      await blockManager.finalizeDispute(epoch, 0, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should be 1
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('1'));

      // we dispute C - 2
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 2),
        signers[0], blockManager, collectionManager);
      await blockManager.finalizeDispute(epoch, 2, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should not change, be 1 only
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('1'));

      // we dispute B - 1
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 1),
        signers[0], blockManager, collectionManager);
      await blockManager.finalizeDispute(epoch, 1, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();

      // should change to 3
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('3'));

      // we dispute D - 3
      collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 3),
        signers[0], blockManager, collectionManager);
      await blockManager.finalizeDispute(epoch, 3, collectionIndexInBlock);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should change to -1 ;
      assertBNEqual(Number(blockIndexToBeConfirmed), -1);
    });

    // it('Penalties should be applied correctly if a block is not confirmed in the confirm state', async function () {
    //   await mineToNextEpoch();
    //   let epoch = await getEpoch();
    //   const base = 15;
    //   // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    //   const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
    //   // const votesAcc17 = [100, 200, 300, 400, 500, 600, 700, 900, 900]; // (base + 2 intentionally giving wrong votes)
    //   const commitmentAcc17 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 20);
    //   await voteManager.connect(signers[base - 1]).commit(epoch, commitment[0]); // (base-1 is commiting but not revealing)
    //   for (let i = 0; i < 2; i++) {
    //     await voteManager.connect(signers[base + i]).commit(epoch, commitment[0]);
    //   }
    //   await voteManager.connect(signers[base + 2]).commit(epoch, commitmentAcc17[0]);
    //
    //   await mineToNextState(); // reveal
    //
    //   for (let i = 0; i < 2; i++) {
    //     await voteManager.connect(signers[base + i]).reveal(epoch, commitment[1], commitment[2]);
    //     const stakerIds = await stakeManager.stakerIds(signers[base + i].address);
    //     const influences = await voteManager.getInfluenceSnapshot(epoch, stakerIds);
    //     dataRevealedThisEpoch.influence.push(influences);
    //     dataRevealedThisEpoch.values.push(commitment[6]);
    //   }
    //   await voteManager.connect(signers[base + 2]).reveal(epoch, commitmentAcc17[1], commitmentAcc17[2]);
    //   const stakerId17 = await stakeManager.stakerIds(signers[base + 2].address);
    //   const influences = await voteManager.getInfluenceSnapshot(epoch, stakerId17);
    //   dataRevealedThisEpoch.influence.push(influences);
    //   dataRevealedThisEpoch.values.push(commitmentAcc17[6]);
    //   await mineToNextState(); // propose state
    //
    //   let stakerIdAcc = await stakeManager.stakerIds(signers[base].address);
    //   let staker = await stakeManager.getStaker(stakerIdAcc);
    //   const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
    //   let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
    //   let numActiveCollections = await collectionManager.getNumActiveCollections();
    //   let medians = [];
    //   for (let i = 0; i < numActiveCollections; i++) medians.push(0);
    //   let influenceSum = toBigNumber('0');
    //   for (let i = 0; i < ((dataRevealedThisEpoch.influence).length); i++) influenceSum = influenceSum.add((dataRevealedThisEpoch.influence)[i]);
    //   let result = toBigNumber('0');
    //   for (let i = 0; i < commitment[3].length; i++) {
    //     for (let j = 0; j < (dataRevealedThisEpoch.influence).length; j++) {
    //       result = result.add((toBigNumber((dataRevealedThisEpoch.values)[j][i])).mul((dataRevealedThisEpoch.influence)[j]));
    //     }
    //     medians[(commitment[3])[i]] = result.div(influenceSum);
    //     result = toBigNumber('0');
    //   }
    //   await blockManager.connect(signers[base]).propose(epoch,
    //     medians,
    //     iteration,
    //     biggestStakerId);    //[100, 200, 300, 400, 500, 600, 700, 800, 900]
    //
    //   for (let i = 1; i < 2; i++) {
    //     stakerIdAcc = await stakeManager.stakerIds(signers[base + i].address);
    //     staker = await stakeManager.getStaker(stakerIdAcc);
    //     iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
    //     await blockManager.connect(signers[base + i]).propose(epoch,
    //       medians,
    //       iteration,
    //       biggestStakerId);   //[100, 200, 300, 400, 500, 600, 700, 800, 900]
    //   }
    //
    //   medians = [];
    //   for (let i = 0; i < numActiveCollections; i++) medians.push(0);
    //   influenceSum = toBigNumber('0');
    //   for (let i = 0; i < ((dataRevealedThisEpoch.influence).length); i++) influenceSum = influenceSum.add((dataRevealedThisEpoch.influence)[i]);
    //   result = toBigNumber('0');
    //   for (let i = 0; i < commitmentAcc17[3].length; i++) {
    //     for (let j = 0; j < (dataRevealedThisEpoch.influence).length; j++) {
    //       result = result.add((toBigNumber((dataRevealedThisEpoch.values)[j][i])).mul((dataRevealedThisEpoch.influence)[j]));
    //     }
    //     medians[(commitmentAcc17[3])[i]] = result.div(influenceSum);
    //     result = toBigNumber('0');
    //   }
    //
    //   stakerIdAcc = await stakeManager.stakerIds(signers[base + 2].address);
    //   staker = await stakeManager.getStaker(stakerIdAcc);
    //   iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
    //   await blockManager.connect(signers[base + 2]).propose(epoch,
    //     medians,
    //     iteration,
    //     biggestStakerId);
    //   await mineToNextState(); // dispute state
    //   await mineToNextState(); // confirm state (intentionally not confirming block)
    //   await mineToNextState(); // commit state
    //   epoch = await getEpoch();
    //   const stakerIdAcc14 = await stakeManager.stakerIds(signers[14].address);
    //   staker = await stakeManager.getStaker(stakerIdAcc14);
    //   const prevStakeAcc14 = staker.stake;
    //   const stakerIdAcc16 = await stakeManager.stakerIds(signers[base + 1].address);
    //   staker = await stakeManager.getStaker(stakerIdAcc16);
    //   const stakerAgeBeforeCommittingAcc16 = staker.age;
    //   const age16 = stakerAgeBeforeCommittingAcc16 + 10000;
    //   const prevStakeAcc16 = staker.stake;
    //   const stakerIdAcc17 = await stakeManager.stakerIds(signers[base + 2].address);
    //   let staker17 = await stakeManager.getStaker(stakerIdAcc17);
    //   const stakerAgeBeforeCommittingAcc17 = staker17.age;
    //   console.log(stakerAgeBeforeCommittingAcc16, 'stakerAgeBeforeCommittingAcc16');
    //   await voteManager.connect(signers[base + 1]).commit(epoch, commitment[0]); // (base + 1 gets blockReward)
    //   await voteManager.connect(signers[base - 1]).commit(epoch, commitment[0]); // (base -1 commits and gets randaoPenalty)
    //   await voteManager.connect(signers[base + 2]).commit(epoch, commitment[0]);
    //   staker17 = await stakeManager.getStaker(stakerIdAcc17);
    //   const age = stakerAgeBeforeCommittingAcc17 + 10000; // (adding 10000 age due to commit of base + 2)
    //   // const epochLastRevealedAcc17 = await voteManager.getEpochLastRevealed(stakerIdAcc17);
    //   // const blockLastEpoch = await blockManager.getBlock(epochLastRevealedAcc17);
    //   // const { medians } = blockLastEpoch;
    //   let prod = 1;
    //   let incorrectVotingPenalty = 0;
    //   // const votes16 = [];
    //   // const votes17 = [];
    //   for (let i = 0; i < medians.length; i++) {
    //     votes16.push(0);
    //     votes17.push(0);
    //   }
    //   for (let j = 0; j < ((dataRevealedThisEpoch.values)[1]).length; j++) {
    //     const voteValue16 = ((dataRevealedThisEpoch.values)[1])[j];
    //     const voteValue17 = ((dataRevealedThisEpoch.values)[2])[j];
    //     const val = toBigNumber(voteValue16).div(toBigNumber(100));
    //     const val2 = toBigNumber(voteValue17).div(toBigNumber(100));
    //     votes16[val - 1] = voteValue16;
    //     votes17[val2 - 1] = voteValue17;
    //   }
    //   prod = 1;
    //   incorrectVotingPenalty = 0;
    //   for (let i = 0; i < medians.length; i++) {
    //     if(votes16[i] != 0)
    //     {
    //       console.log(votes16[i], 'votes16[i]');
    //     prod = age16 * votes16[i];
    //     const tolerance = await collectionManager.getCollectionTolerance(i);
    //     const maxVoteTolerance = medians[i] + ((medians[i] * tolerance) / BASE_DENOMINATOR);
    //     const minVoteTolerance = medians[i] - ((medians[i] * tolerance) / BASE_DENOMINATOR);
    //       //console.log(Number(voteValues));
    //       if (votes16[i] > maxVoteTolerance) {
    //         incorrectVotingPenalty += (prod / maxVoteTolerance - age16);
    //       } else if (votes16[i] < minVoteTolerance) {
    //         incorrectVotingPenalty += (age16 - prod / minVoteTolerance);
    //     }}
    //     }
    //     console.log(incorrectVotingPenalty, 'incorrectVotingPenalty for 16');
    //     const expectedAgeAfterStaker16 = ((stakerAgeBeforeCommittingAcc16 + 10000) - incorrectVotingPenalty);
    //     console.log(expectedAgeAfterStaker16, 'expectedAgeAfterStaker16');
    //     for(let i = 0; i < medians.length; i++)
    //     console.log(Number(medians[i]));
    //     console.log(votes17);
    //     for (let i = 0; i < medians.length; i++) {
    //       if(votes17[i] != 0)
    //       {
    //       console.log(votes17[i], 'votes17[i]');
    //       prod = age * votes17[i];
    //       const tolerance = await collectionManager.getCollectionTolerance(i);
    //       const maxVoteTolerance = medians[i] + ((medians[i] * tolerance) / BASE_DENOMINATOR);
    //       const minVoteTolerance = medians[i] - ((medians[i] * tolerance) / BASE_DENOMINATOR);
    //         if (votes17[i] > maxVoteTolerance) {
    //           incorrectVotingPenalty += (prod / maxVoteTolerance - age);
    //         } else if (votes17[i] < minVoteTolerance) {
    //           incorrectVotingPenalty += (age - prod / minVoteTolerance);
    //       }}
    //     }
    //   console.log(incorrectVotingPenalty, 'incorrectVotingPenalty for 17');
    //   const ageAcc17 = incorrectVotingPenalty > age ? 0 : age - Math.floor(incorrectVotingPenalty);
    //   staker17 = await stakeManager.getStaker(stakerIdAcc17);
    //   const blockReward = await blockManager.blockReward();
    //   const randaoPenalty = await blockManager.blockReward();
    //   const staker14 = await stakeManager.getStaker(stakerIdAcc14);
    //   const staker16 = await stakeManager.getStaker(stakerIdAcc16);
    //   dataRevealedThisEpoch = { influence: [], values: [] };
    //   // assertBNEqual(staker14.stake, prevStakeAcc14.sub(randaoPenalty), 'Penalty has not been applied correctly');
    //   //assertBNEqual(staker14.age, toBigNumber('0'), 'Age randao Penalty has not been applied correctly');
    //   assertBNEqual(staker16.stake, prevStakeAcc16.add(blockReward), 'Reward has not been given correctly');
    //   //assertBNEqual(staker16.age, expectedAgeAfterStaker16, 'Age shoud increase for commit');
    //   assertBNEqual(staker17.age, ageAcc17);
    // });
    it('should not be able to claim block rewards if no blocks are proposed', async function () {
      await mineToNextEpoch();
      await mineToNextState(); // Reveal
      await mineToNextState(); // Propose
      await mineToNextState(); // Dispute
      await mineToNextState(); // Confirm
      const stakerIdAcc12 = await stakeManager.stakerIds(signers[12].address);
      let staker = await stakeManager.getStaker(stakerIdAcc12);
      const { stake } = staker;
      await blockManager.connect(signers[12]).claimBlockReward();
      staker = await stakeManager.getStaker(stakerIdAcc12);
      assertBNEqual(staker.stake, stake);
    });
    it('should be able to confirm block in next epoch if no block is confirmed in current epoch', async function () {
      await mineToNextState(); // commit
      let secret = '0x772d5c9e6d18ed15ce7ac8dbcbcbcbcbeecbcbc55555c0823ea4ececececebbb';
      await commit(signers[19], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState(); // reveal
      await reveal(signers[19], 0, voteManager, stakeManager);
      await mineToNextState(); // propose
      await propose(signers[19], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextState();
      await mineToNextState();
      await mineToNextState(); // commit
      const epoch = await getEpoch();
      secret = '0x772d5c9e6d18ed15ce7ac8dbcbcbceebcbcbcbc55555c0823ea4ececececebbb';
      await commit(signers[19], 0, voteManager, collectionManager, secret, blockManager);
      expect(await blockManager.isBlockConfirmed(epoch - 1)).to.be.true;
    });
  });
});
