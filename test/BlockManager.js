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
  getFalseIteration,
  toBigNumber,
  tokenAmount,
} = require('./helpers/utils');

const { utils } = ethers;

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
    it('admin role should be granted', async () => {
      const isAdminRoleGranted = await blockManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
      assert(isAdminRoleGranted === true, 'Admin role was not Granted');
    });

    it('should not be able to stake, commit without initialization', async () => {
      const epoch = await getEpoch();

      const tx1 = stakeManager.connect(signers[1]).stake(epoch, tokenAmount('180000'));
      await assertRevert(tx1, 'Contract should be initialized');

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
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
      await mineToNextEpoch();

      await razor.transfer(signers[1].address, tokenAmount('423000'));
      await razor.transfer(signers[2].address, tokenAmount('190000'));
      await razor.transfer(signers[3].address, tokenAmount('180000'));

      await razor.connect(signers[1]).approve(stakeManager.address, tokenAmount('420000'));
      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('420000'));

      const votes = [];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[1]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[1]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    });

    it('should be able to propose', async function () {
      const epoch = await getEpoch();

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[1]).propose(epoch,
        [],
        iteration,
        biggestStakerId);
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
        [],
        iteration,
        biggestStakerId);

      await assertRevert(tx, 'Already proposed');
    });

    it('should be able to confirm block and receive block reward', async () => {
      await mineToNextState();
      await mineToNextState();

      let Cname;
      for (let i = 1; i <= 8; i++) {
        Cname = `Test Collection${String(i)}`;
        await collectionManager.createCollection(500000, 3, 1, [i, i + 1], Cname);
      }
      Cname = 'Test Collection9';
      await collectionManager.createCollection(500000, 3, 1, [9, 1], Cname);

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

    it('should not allow invalid proposals', async function () {
      const epoch = await getEpoch();

      await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('180000'));

      await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('180000'));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[1]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[2]).commit(epoch, commitment2);
      const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment3 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes3, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[3]).commit(epoch, commitment3);

      await mineToNextState();

      await voteManager.connect(signers[1]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[2]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[3]).reveal(epoch, votes3,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState();

      const stakerIdAcc5 = await stakeManager.stakerIds(signers[1].address);
      const staker1 = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker1, biggestStake);

      const tx = blockManager.connect(signers[1]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800],
        iteration,
        biggestStakerId);

      await assertRevert(tx, 'invalid block proposed');

      await blockManager.connect(signers[1]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);
    });

    it('should allow other proposals', async function () {
      const epoch = await getEpoch();

      const stakerIdAcc6 = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.getStaker(stakerIdAcc6);
      const firstProposedBlock = await blockManager.proposedBlocks(epoch, 0);
      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[2]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      const secondProposedBlock = (firstProposedBlock.iteration.gt(iteration))
        ? await blockManager.proposedBlocks(epoch, 0) : await blockManager.proposedBlocks(epoch, 1);

      assertBNEqual(secondProposedBlock.proposerId, toBigNumber('2'));
    });

    it('Number of proposals should be 2', async function () {
      const epoch = await getEpoch();

      const nblocks = await blockManager.getNumProposedBlocks(epoch);

      assertBNEqual(nblocks, toBigNumber('2'), 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('Give sorted should not work if given medianIndex is invalid', async function () {
      await mineToNextState();
      const epoch = await getEpoch();
      const numActiveCollections = await collectionManager.getNumActiveCollections();
      const {
        sortedStakers,
      } = await calculateDisputesData(1,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, numActiveCollections, sortedStakers); // passing numActiveCollections as medianIndex value
      await assertRevert(tx, 'Invalid MedianIndex value');
    });

    it('should be able to dispute', async function () {
      const epoch = await getEpoch();

      const {
        totalInfluenceRevealed, sortedStakers,
      } = await calculateDisputesData(1,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, sortedStakers);

      const dispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(dispute.medianIndex, toBigNumber('1'), 'collectionId should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.lastVisitedStaker, sortedStakers[sortedStakers.length - 1], 'lastVisited should match');
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

      await blockManager.connect(signers[19]).finalizeDispute(epoch, blockIndex);
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

      await razor.connect(signers[0]).transfer(signers[4].address, tokenAmount('200000'));

      const epoch = await getEpoch();

      await razor.connect(signers[4]).approve(stakeManager.address, tokenAmount('190000'));
      await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('190000'));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[2]).commit(epoch, commitment1);

      const votes2 = [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[4]).commit(epoch, commitment2);

      await mineToNextState();

      // Staker 6

      await voteManager.connect(signers[2]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      // Staker 7

      await voteManager.connect(signers[4]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      const stakerIdAcc6 = await stakeManager.stakerIds(signers[2].address);
      const staker6 = await stakeManager.getStaker(stakerIdAcc6);

      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration6 = await getIteration(voteManager, stakeManager, staker6, biggestStake);

      const stakerIdAcc7 = await stakeManager.stakerIds(signers[4].address);
      const staker7 = await stakeManager.getStaker(stakerIdAcc7);

      const iteration7 = await getIteration(voteManager, stakeManager, staker7, biggestStake);

      await mineToNextState();

      await blockManager.connect(signers[2]).propose(epoch,
        [1000, 2100, 3100, 4000, 5000, 6000, 7000, 8000, 9000],
        iteration6,
        biggestStakerId);

      await blockManager.connect(signers[4]).propose(epoch,
        [1000, 2200, 3300, 4000, 5000, 6000, 7000, 8000, 9000],
        iteration7,
        biggestStakerId);

      await mineToNextState();

      // const sortedVotes1 = [toBigNumber('2000'), toBigNumber('2010')];
      const res1 = await calculateDisputesData(1,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);

      await blockManager.connect(signers[19]).giveSorted(epoch, 1, res1.sortedStakers);
      const firstDispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(firstDispute.medianIndex, toBigNumber('1'), 'collectionId should match');
      assertBNEqual(firstDispute.accWeight, res1.totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(firstDispute.lastVisitedStaker, res1.sortedStakers[res1.sortedStakers.length - 1], 'lastVisited should match');

      // let blockId
      // let block
      // let blockIndex
      // for(i=0;i<(await blockManager.getNumProposedBlocks(epoch)); i++ ) {
      //    blockId = await blockManager.sortedProposedBlockIds(epoch,i)
      //    if(toBigNumber(blockId).eq(0)) {
      //      blockIndex = i
      //      break;
      //    }
      // }

      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0);

      const tx = blockManager.connect(signers[19]).finalizeDispute(epoch, 0);

      await assertRevert(tx, 'Block already has been disputed');
      const res2 = await calculateDisputesData(2,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);

      await blockManager.connect(signers[15]).giveSorted(epoch, 2, res2.sortedStakers);

      const secondDispute = await blockManager.disputes(epoch, signers[15].address);

      assertBNEqual(secondDispute.medianIndex, toBigNumber('2'), 'collectionId should match');
      assertBNEqual(secondDispute.accWeight, res2.totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(secondDispute.lastVisitedStaker, res2.sortedStakers[res2.sortedStakers.length - 1], 'lastVisited should match');

      await blockManager.connect(signers[15]).finalizeDispute(epoch, 1);
      // assertBNEqual(secondDispute2.median, res2.median, 'median should match');
      // assert((await proposedBlock.valid) === false);
    });

    it('if no block is valid in previous epoch, stakers should not be penalised', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      const stakerIdAcc8 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      const { stake } = staker;

      await voteManager.connect(signers[3]).commit(epoch, commitment);

      assertBNEqual((await blockManager.getBlock(epoch - 1)).proposerId, toBigNumber('0'));
      assertBNEqual(((await blockManager.getBlock(epoch - 1)).medians).length, toBigNumber('0'));
      // assert((await blockManager.getBlock(epoch - 1)).valid === false);

      await mineToNextState();

      await voteManager.connect(signers[3]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      assertBNEqual(staker.stake, stake, 'Stake should have remained the same');
    });

    it('should be able to reset dispute incase of wrong values being entered', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      await razor.transfer(signers[5].address, tokenAmount('190000'));
      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('190000'));
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('190000'));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState(); // propose
      const stakerIdAcc20 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc20);

      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[5]).propose(epoch,
        [1000, 2001, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        iteration,
        biggestStakerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('5'), 'incorrect proposalID');

      await mineToNextState(); // dispute

      const sortedStakers = [5];

      await blockManager.connect(signers[13]).giveSorted(epoch, 1, sortedStakers);

      const beforeDisputeReset = await blockManager.disputes(epoch, signers[13].address);
      assertBNEqual(beforeDisputeReset.medianIndex, toBigNumber('1'), 'collectionId should match');

      await blockManager.connect(signers[13]).resetDispute(epoch);
      const afterDisputeReset = await blockManager.disputes(epoch, signers[13].address);

      assertBNEqual(afterDisputeReset.medianIndex, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.accWeight, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.lastVisitedStaker, toBigNumber('0'));
    });

    it('should be able to dispute in batches', async function () {
      // Commit
      await mineToNextEpoch();
      await razor.transfer(signers[6].address, tokenAmount('423000'));
      await razor.transfer(signers[7].address, tokenAmount('190000'));
      let epoch = await getEpoch();

      await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[7]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('180000'));
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[6]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[7]).commit(epoch, commitment2);

      // Reveal
      await mineToNextState();

      await voteManager.connect(signers[6]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      // Staker 3

      await voteManager.connect(signers[7]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      // Propose
      await mineToNextState();

      const stakerIdAcc2 = await stakeManager.stakerIds(signers[6].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestStake, biggestStakerId } = await await getBiggestStakeAndId(stakeManager, voteManager); (stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[6]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('6'), 'incorrect proposalID');

      // Calculate Dispute data
      await mineToNextState();
      epoch = await getEpoch();
      const {
        totalInfluenceRevealed, accProd, sortedStakers,
      } = await calculateDisputesData(1,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);

      // Dispute in batches
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, [6]);
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, [7]);
      const dispute = await blockManager.disputes(epoch, signers[19].address);

      assertBNEqual(dispute.medianIndex, toBigNumber('1'), 'medianIndex should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.accProd, accProd, 'accProd should match');
      assertBNEqual(dispute.lastVisitedStaker, sortedStakers[sortedStakers.length - 1], 'lastVisited should match');
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
    });
    it('staker should not be able to propose when not elected', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerIdAcc8 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[3]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();
      const { biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getFalseIteration(voteManager, stakeManager, staker);
      const tx = blockManager.connect(signers[1]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);
      await assertRevert(tx, 'not elected');
    });
    it('staker should not be able to propose when not not revealed', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerIdAcc8 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);
      await mineToNextState();
      await mineToNextState();
      const tx = blockManager.connect(signers[3]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);
      await assertRevert(tx, 'Cannot propose without revealing');
    });
    it('staker should not be able to propose when stake below minStake', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[3]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.setStakerStake(epoch, stakerIdAcc2, 2, staker.stake, tokenAmount('19999'));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const tx = blockManager.connect(signers[3]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);
      await assertRevert(tx, 'stake below minimum stake');
    });
    it('should not be able to give sorted votes for stakers who didnt vote in epoch', async function () {
      await mineToNextState();
      const epoch = await getEpoch();
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, 0, [16]);
      await assertRevert(tx, 'staker didnt vote in this epoch');
    });
    it('For the second batch while raising dispute, assetid should match to the disputed assetid of first batch', async function () {
      await mineToNextEpoch();
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const epoch = await getEpoch();
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[7]).commit(epoch, commitment);
      await mineToNextState();// reveal
      await voteManager.connect(signers[7]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();// propose
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[7].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      await blockManager.connect(signers[7]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);
      await mineToNextState();// dispute
      await blockManager.connect(signers[19]).giveSorted(epoch, 0, [7]);
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, 1, [7]);
      await assertRevert(tx, 'MedianIndex not matching');
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
      await mineToNextState();
      const tx = blockManager.connect(signers[7]).claimBlockReward();
      await assertRevert(tx, 'incorrect state');
    });
    it('should not be able to finalise dispute if medians value is zero', async function () {
      await mineToNextEpoch();
      const votes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const epoch = await getEpoch();
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[7]).commit(epoch, commitment);
      await mineToNextState();// reveal
      await voteManager.connect(signers[7]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();// propose
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[7].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestStakerId, biggestStake } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      const medians = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      await blockManager.connect(signers[7]).propose(epoch,
        medians,
        iteration,
        biggestStakerId);
      const block = await blockManager.getProposedBlock(await getEpoch(), 0);
      assertBNEqual(block.proposerId, stakerIdAcc2, 'ID should be equal');
      assertDeepEqual(block.medians, medians, 'medians should be equal');
      assertBNEqual(block.iteration, iteration, 'iteration should be equal');
      assertBNEqual(biggestStake, block.biggestStake, 'biggest Influence should be equal');
      await mineToNextState();// dispute
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, [7]);

      const tx1 = blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
      await assertRevert(tx1, 'median can not be zero');
    });
    it('should be able to return correct data for getBlockMedians', async function () {
      const tx = (await blockManager.connect(signers[19]).getBlock(await getEpoch())).medians;
      assertDeepEqual(tx, [], 'transaction should return correct data');
    });
    it('getProposedBlock Function should work as expected', async function () {
      const block = await blockManager.connect(signers[19]).getProposedBlock(await getEpoch(), 0);
      const medians = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const { proposerId, iteration, biggestStake } = await blockManager.proposedBlocks(await getEpoch(), 0);
      assertBNEqual(block.proposerId, proposerId, 'it should return correct value');
      assertDeepEqual(block.medians, medians, 'it should return correct value');
      assertBNEqual(block.iteration, iteration, 'it should return correct value');
      assertBNEqual(block.biggestStake, biggestStake, 'it should return correct value');
    });
    it('should not be able to finalize dispute, if total influence revealed does not match', async function () {
      // commit
      await mineToNextEpoch();
      await razor.transfer(signers[8].address, tokenAmount('190000'));
      await razor.transfer(signers[9].address, tokenAmount('170000'));
      let epoch = await getEpoch();

      await razor.connect(signers[8]).approve(stakeManager.address, tokenAmount('190000'));
      await stakeManager.connect(signers[8]).stake(epoch, tokenAmount('190000'));

      await razor.connect(signers[9]).approve(stakeManager.address, tokenAmount('170000'));
      await stakeManager.connect(signers[9]).stake(epoch, tokenAmount('170000'));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[8]).commit(epoch, commitment1);

      // Reveal
      await mineToNextState();

      await voteManager.connect(signers[8]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      // Propose
      await mineToNextState();
      const stakerIdAcc9 = await stakeManager.stakerIds(signers[8].address);
      const staker = await stakeManager.getStaker(stakerIdAcc9);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      await blockManager.connect(signers[8]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      // disputed without calling giveSoted() , so totalInfluenceRevealed does not match

      await blockManager.disputes(epoch, signers[9].address);

      const tx = blockManager.connect(signers[9]).finalizeDispute(epoch, 0);
      await assertRevert(tx, 'TIR is wrong');
    });
    it('should not be able to finalize dispute, if proposed alternate block is identical to proposed blocks', async function () {
      // Commit
      await mineToNextEpoch();
      await razor.transfer(signers[10].address, tokenAmount('423000'));
      await razor.transfer(signers[11].address, tokenAmount('180000'));
      let epoch = await getEpoch();

      await razor.connect(signers[10]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[10]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[11]).approve(stakeManager.address, tokenAmount('180000'));
      await stakeManager.connect(signers[11]).stake(epoch, tokenAmount('180000'));
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[10]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[11]).commit(epoch, commitment2);

      // Reveal
      await mineToNextState();

      await voteManager.connect(signers[10]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      // Staker 13
      await voteManager.connect(signers[11]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      // Propose
      await mineToNextState();
      const stakerIdAcc12 = await stakeManager.stakerIds(signers[10].address);
      const staker12 = await stakeManager.getStaker(stakerIdAcc12);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration1 = await getIteration(voteManager, stakeManager, staker12, biggestStake);

      await blockManager.connect(signers[10]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration1,
        biggestStakerId);

      const stakerIdAcc13 = await stakeManager.stakerIds(signers[11].address);
      const staker13 = await stakeManager.getStaker(stakerIdAcc13);

      const iteration2 = await getIteration(voteManager, stakeManager, staker13, biggestStake);

      await blockManager.connect(signers[11]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration2,
        biggestStakerId);

      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      const res1 = await calculateDisputesData(1,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[10]).giveSorted(epoch, 1, res1.sortedStakers);

      await blockManager.disputes(epoch, signers[10].address);

      const tx = blockManager.connect(signers[10]).finalizeDispute(epoch, 0);

      await assertRevert(tx, 'Block proposed with same medians');
    });
    it('Blocks should be proposed according to iteration', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      await razor.transfer(signers[12].address, tokenAmount('421000'));
      await razor.transfer(signers[13].address, tokenAmount('420000'));
      await razor.transfer(signers[14].address, tokenAmount('419000'));
      await razor.transfer(signers[15].address, tokenAmount('418000'));

      await razor.connect(signers[12]).approve(stakeManager.address, tokenAmount('421000'));
      await stakeManager.connect(signers[12]).stake(epoch, tokenAmount('421000'));

      await razor.connect(signers[13]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[13]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[14]).approve(stakeManager.address, tokenAmount('419000'));
      await stakeManager.connect(signers[14]).stake(epoch, tokenAmount('419000'));

      await razor.connect(signers[15]).approve(stakeManager.address, tokenAmount('418000'));
      await stakeManager.connect(signers[15]).stake(epoch, tokenAmount('418000'));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[10]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[11]).commit(epoch, commitment2);

      const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment3 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes3, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[12]).commit(epoch, commitment3);

      const votes4 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment4 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes4, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[13]).commit(epoch, commitment4);

      const votes5 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment5 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes5, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[14]).commit(epoch, commitment5);

      const votes6 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment6 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes6, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[15]).commit(epoch, commitment6);

      await mineToNextState(); // reveal

      await voteManager.connect(signers[10]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[11]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[12]).reveal(epoch, votes3,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[13]).reveal(epoch, votes4,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[14]).reveal(epoch, votes5,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[15]).reveal(epoch, votes6,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState(); // propose state

      let sortedProposedBlockId;
      let sortedProposedBlock;

      const proposedBlocksIteration = [];

      const stakerIdAcc12 = await stakeManager.stakerIds(signers[10].address);
      let staker = await stakeManager.getStaker(stakerIdAcc12);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[10]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      const stakerIdAcc13 = await stakeManager.stakerIds(signers[11].address);
      staker = await stakeManager.getStaker(stakerIdAcc13);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[11]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      const stakerIdAcc14 = await stakeManager.stakerIds(signers[12].address);
      staker = await stakeManager.getStaker(stakerIdAcc14);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[12]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      const stakerIdAcc15 = await stakeManager.stakerIds(signers[13].address);
      staker = await stakeManager.getStaker(stakerIdAcc15);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[13]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      const stakerIdAcc16 = await stakeManager.stakerIds(signers[14].address);
      staker = await stakeManager.getStaker(stakerIdAcc16);
      iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      proposedBlocksIteration.push(iteration);
      await blockManager.connect(signers[14]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      const proposedBlocksLength = await blockManager.getNumProposedBlocks(epoch);
      const sorted = proposedBlocksIteration.slice().sort((a, b) => a - b);
      for (let i = 0; i < proposedBlocksLength; i++) { // 20341
        sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, i);
        sortedProposedBlock = await blockManager.proposedBlocks(epoch, sortedProposedBlockId);
        assertBNEqual(sorted[i], sortedProposedBlock.iteration, 'Not sorted properly');
      }
    });

    it('If Biggest Influence of subquecent, block is larger; it should replace all the other blocks, if smaller; should not be added', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[9]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[10]).commit(epoch, commitment2);

      const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment3 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes3, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[11]).commit(epoch, commitment3);

      const votes4 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment4 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes4, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[12]).commit(epoch, commitment4);

      const votes5 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment5 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes5, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[13]).commit(epoch, commitment5);

      const votes6 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment6 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes6, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[14]).commit(epoch, commitment6);

      await mineToNextState(); // reveal

      await voteManager.connect(signers[9]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[10]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[11]).reveal(epoch, votes3,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[12]).reveal(epoch, votes4,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[13]).reveal(epoch, votes5,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[14]).reveal(epoch, votes6,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState(); // propose state
      // [9,11,13,12,10]
      const stakerIds = [9, 10, 11, 12, 13];
      const stakeLargest = (await voteManager.getInfluenceSnapshot(epoch, stakerIds[1]));
      const stakeSmallest = (await voteManager.getInfluenceSnapshot(epoch, stakerIds[0]));
      const stakeMid = (await voteManager.getInfluenceSnapshot(epoch, stakerIds[4]));

      const stakerIdAcc12 = await stakeManager.stakerIds(signers[11].address);
      let staker = await stakeManager.getStaker(stakerIdAcc12);

      // Block with Mid Influence
      const iteration = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[11]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        stakerIds[4]);

      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));

      // Block with smaller stake, should not be added
      const stakerIdAcc14 = await stakeManager.stakerIds(signers[13].address);
      staker = await stakeManager.getStaker(stakerIdAcc14);
      const iteration2 = await getIteration(voteManager, stakeManager, staker, stakeSmallest);
      await blockManager.connect(signers[13]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration2,
        stakerIds[0]);
      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));

      // Another Block with Mid Influence
      const stakerIdAcc15 = await stakeManager.stakerIds(signers[14].address);
      staker = await stakeManager.getStaker(stakerIdAcc15);
      const iteration3 = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[14]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration3,
        stakerIds[4]);

      if (iteration3 > iteration) {
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('0'));
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 1), toBigNumber('1'));
      } else {
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('1'));
        assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 1), toBigNumber('0'));
      }

      // Block With Largest Influence, Should Replace Previous one
      const stakerIdAcc13 = await stakeManager.stakerIds(signers[12].address);
      staker = await stakeManager.getStaker(stakerIdAcc13);

      const iteration1 = await getIteration(voteManager, stakeManager, staker, stakeLargest);
      await blockManager.connect(signers[12]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration1,
        stakerIds[1]);
      assertBNEqual(await blockManager.sortedProposedBlockIds(epoch, 0), toBigNumber('2'));
    });

    it('Should not be able to dispute the proposedBlock if correctBiggestStakerId is incorrect', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[10]).commit(epoch, commitment1);
      await voteManager.connect(signers[9]).commit(epoch, commitment1);
      await voteManager.connect(signers[8]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[10]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await voteManager.connect(signers[9]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await voteManager.connect(signers[8]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState();
      const stakerIdAcc10 = await stakeManager.stakerIds(signers[9].address);
      let staker = await stakeManager.getStaker(stakerIdAcc10);
      const stakeMid = (await voteManager.getInfluenceSnapshot(epoch, 12));
      const iteration = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[9]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        12);

      const stakerIdAcc11 = await stakeManager.stakerIds(signers[8].address);
      staker = await stakeManager.getStaker(stakerIdAcc11);
      const iteration1 = await getIteration(voteManager, stakeManager, staker, stakeMid);
      await blockManager.connect(signers[8]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration1,
        12);

      await mineToNextState();
      let stakerId;
      if (iteration < iteration1) {
        stakerId = await stakeManager.stakerIds(signers[9].address);
      } else {
        stakerId = await stakeManager.stakerIds(signers[8].address);
      }
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(await blockManager.blockIndexToBeConfirmed(), toBigNumber('0'));
      const tx = blockManager.disputeBiggestStakeProposed(epoch, 0, 15);
      await assertRevert(tx, 'Invalid dispute : Stake');
    });

    it('Should be able to dispute the proposedBlock with incorrect influnce', async function () {
      const epoch = await getEpoch();
      let stakerId;
      const stakerIdAcc10 = await stakeManager.stakerIds(signers[9].address);
      let staker = await stakeManager.getStaker(stakerIdAcc10);
      const stakeMid = (await voteManager.getInfluenceSnapshot(epoch, 12));
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
    });

    it('proposed blocks length should not be more than maxAltBlocks', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 14;
      const maxAltBlocks = Number(await blockManager.maxAltBlocks());

      for (let i = 2; i < maxAltBlocks + 1; i++) { // i=2 since [base+1] has already staked
        await razor.transfer(signers[base + i].address, tokenAmount('420000'));
        await razor.connect(signers[base + i]).approve(stakeManager.address, tokenAmount('420000'));
        await stakeManager.connect(signers[base + i]).stake(epoch, tokenAmount('420000'));
      }

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await voteManager.connect(signers[base + i]).commit(epoch, commitment);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < maxAltBlocks + 1; i++) {
        await voteManager.connect(signers[base + i]).reveal(epoch, votes,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      }

      await mineToNextState(); // propose state

      let stakerIdAcc = await stakeManager.stakerIds(signers[base].address);
      let staker = await stakeManager.getStaker(stakerIdAcc);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      await blockManager.connect(signers[base]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      for (let i = 1; i < maxAltBlocks + 1; i++) {
        stakerIdAcc = await stakeManager.stakerIds(signers[base + i].address);
        staker = await stakeManager.getStaker(stakerIdAcc);
        iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        await blockManager.connect(signers[base + i]).propose(epoch,
          [100, 201, 300, 400, 500, 600, 700, 800, 900],
          iteration,
          biggestStakerId);
      }
      assertBNEqual(await blockManager.getNumProposedBlocks(epoch), await blockManager.maxAltBlocks());
    });
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

    it('BlockToBeConfirmed should always have lowest iteration and should be valid', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const base = 10;

      for (let i = 0; i < 4; i++) {
        await razor.transfer(signers[base + i].address, tokenAmount('420000'));
        await razor.connect(signers[base + i]).approve(stakeManager.address, tokenAmount('420000'));
        await stakeManager.connect(signers[base + i]).stake(epoch, tokenAmount('420000'));
      }

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      for (let i = 0; i < 4; i++) {
        await voteManager.connect(signers[base + i]).commit(epoch, commitment);
      }

      await mineToNextState(); // reveal

      for (let i = 0; i < 4; i++) {
        await voteManager.connect(signers[base + i]).reveal(epoch, votes,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      }

      await mineToNextState(); // propose state

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration;
      for (let i = 0; i < 4; i++) {
        const stakerIdAcc = await stakeManager.stakerIds(signers[base + i].address);
        const staker = await stakeManager.getStaker(stakerIdAcc);
        iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        await blockManager.connect(signers[base + i]).propose(epoch,
          [100, 201, 300, 400, 500, 600, 700, 800, 900],
          iteration,
          biggestStakerId);
      }

      await mineToNextState(); // dispute state
      // okay so now we have 4 invalid blcoks
      // lets say sortedProposedBlockId is [A,B,C,D]
      let blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      //  should be 0
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('0'));

      // we dispute A - 0
      const res = await calculateDisputesData(1,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);

      await blockManager.giveSorted(epoch, 1, res.sortedStakers);
      await blockManager.finalizeDispute(epoch, 0);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should be 1
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('1'));

      // we dispute C - 2
      await blockManager.finalizeDispute(epoch, 2);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should not change, be 1 only
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('1'));

      // we dispute B - 1
      await blockManager.finalizeDispute(epoch, 1);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should change to 3
      assertBNEqual(blockIndexToBeConfirmed, toBigNumber('3'));

      // we dispute D - 3
      await blockManager.finalizeDispute(epoch, 3);
      blockIndexToBeConfirmed = await blockManager.blockIndexToBeConfirmed();
      // should change to -1 ;
      assertBNEqual(Number(blockIndexToBeConfirmed), -1);
    });

    it('Penalties should be applied correctly if a block is not confirmed in the confirm state', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
      const base = 15;
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      const votesAcc17 = [100, 200, 300, 400, 500, 600, 700, 900, 900]; // (base + 2 intentionally giving wrong votes)
      const commitmentAcc17 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votesAcc17, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[base - 1]).commit(epoch, commitment); // (base-1 is commiting but not revealing)
      for (let i = 0; i < 2; i++) {
        await voteManager.connect(signers[base + i]).commit(epoch, commitment);
      }
      await voteManager.connect(signers[base + 2]).commit(epoch, commitmentAcc17);

      await mineToNextState(); // reveal

      for (let i = 0; i < 2; i++) {
        await voteManager.connect(signers[base + i]).reveal(epoch, votes,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      }
      await voteManager.connect(signers[base + 2]).reveal(epoch, votesAcc17,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState(); // propose state

      let stakerIdAcc = await stakeManager.stakerIds(signers[base].address);
      let staker = await stakeManager.getStaker(stakerIdAcc);
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      await blockManager.connect(signers[base]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      for (let i = 1; i < 3; i++) {
        stakerIdAcc = await stakeManager.stakerIds(signers[base + i].address);
        staker = await stakeManager.getStaker(stakerIdAcc);
        iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        await blockManager.connect(signers[base + i]).propose(epoch,
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          iteration,
          biggestStakerId);
      }

      await mineToNextState(); // dispute state
      await mineToNextState(); // confirm state (intentionally not confirming block)
      await mineToNextState(); // commit state
      epoch = await getEpoch();
      const stakerIdAcc14 = await stakeManager.stakerIds(signers[14].address);
      staker = await stakeManager.getStaker(stakerIdAcc14);
      const prevStakeAcc14 = staker.stake;
      const stakerIdAcc16 = await stakeManager.stakerIds(signers[base + 1].address);
      staker = await stakeManager.getStaker(stakerIdAcc16);
      const prevStakeAcc16 = staker.stake;
      const stakerIdAcc17 = await stakeManager.stakerIds(signers[base + 2].address);
      let staker17 = await stakeManager.getStaker(stakerIdAcc17);
      const stakerAgeBeforeCommittingAcc17 = staker17.age;
      await voteManager.connect(signers[base + 1]).commit(epoch, commitment); // (base + 1 gets blockReward)
      await voteManager.connect(signers[base - 1]).commit(epoch, commitment); // (base -1 commits and gets randaoPenalty)
      await voteManager.connect(signers[base + 2]).commit(epoch, commitment);
      staker17 = await stakeManager.getStaker(stakerIdAcc17);
      const age = stakerAgeBeforeCommittingAcc17 + 10000; // (adding 10000 age due to commit of base + 2)
      const epochLastRevealedAcc17 = await voteManager.getEpochLastRevealed(stakerIdAcc17);
      const blockLastEpoch = await blockManager.getBlock(epochLastRevealedAcc17);
      const { medians } = blockLastEpoch;
      let voteValues = 0;
      let prod = 1;
      let incorrectVotingPenalty = 0;
      for (let i = 0; i < medians.length; i++) {
        voteValues = await voteManager.getVoteValue(i, stakerIdAcc17);
        prod = age * voteValues;
        const tolerance = await collectionManager.getCollectionTolerance(i);
        const maxVoteTolerance = Math.round(medians[i] + ((medians[i] * tolerance) / BASE_DENOMINATOR));
        const minVoteTolerance = Math.round(medians[i] - ((medians[i] * tolerance) / BASE_DENOMINATOR));
        if (medians[i] !== 0) {
          if (voteValues > maxVoteTolerance) {
            incorrectVotingPenalty += (prod / maxVoteTolerance - age);
          } else if (voteValues < minVoteTolerance) {
            incorrectVotingPenalty += (age - prod / minVoteTolerance);
          }
        }
      }
      const ageAcc17 = incorrectVotingPenalty > age ? 0 : age - Math.floor(incorrectVotingPenalty);
      staker17 = await stakeManager.getStaker(stakerIdAcc17);
      const blockReward = await blockManager.blockReward();
      const randaoPenalty = await blockManager.blockReward();
      const staker14 = await stakeManager.getStaker(stakerIdAcc14);
      const staker16 = await stakeManager.getStaker(stakerIdAcc16);
      assertBNEqual(staker14.stake, prevStakeAcc14.sub(randaoPenalty), 'Penalty has not been applied correctly');
      assertBNEqual(staker14.age, toBigNumber('0'), 'Age randao Penalty has not been applied correctly');
      assertBNEqual(staker16.stake, prevStakeAcc16.add(blockReward), 'Reward has not been given correctly');
      assertBNEqual(staker16.age, toBigNumber('20000'), 'Age shoud increase for commit');
      assertBNEqual(staker17.age, ageAcc17);
    });
  });
});
