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
  ASSET_MODIFIER_ROLE,
  BURN_ADDRESS,

} = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestInfluenceAndId,
  getIteration,
  getFalseIteration,
  toBigNumber,
  tokenAmount,
} = require('./helpers/utils');

const { utils } = ethers;

describe('BlockManager', function () {
  let signers;
  let blockManager;
  let assetManager;
  let voteManager;
  let razor;
  let stakeManager;
  let rewardManager;
  let parameters;
  let initializeContracts;

  before(async () => {
    ({
      blockManager,
      parameters,
      assetManager,
      razor,
      stakeManager,
      rewardManager,
      voteManager,
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

      const tx1 = stakeManager.connect(signers[6]).stake(epoch, tokenAmount('18000'));
      await assertRevert(tx1, 'Contract should be initialized');

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      const tx2 = voteManager.connect(signers[5]).commit(epoch, commitment1);

      await assertRevert(tx2, 'Contract should be initialized');
    });

    it('should not be able to initiliaze BlockManager contract without admin role', async () => {
      const tx = blockManager.connect(signers[1]).initialize(
        stakeManager.address,
        rewardManager.address,
        parameters.address,
        voteManager.address,
        assetManager.address
      );
      await assertRevert(tx, 'AccessControl');
    });

    it('should be able to initialize', async () => {
      await Promise.all(await initializeContracts());

      await assetManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      const power = -2;
      const selectorType = 0;
      let i = 0;
      while (i < 9) { await assetManager.createJob(power, selectorType, name, selector, url); i++; }

      await mineToNextEpoch();
      await razor.transfer(signers[5].address, tokenAmount('423000'));
      await razor.transfer(signers[6].address, tokenAmount('19000'));
      await razor.transfer(signers[8].address, tokenAmount('18000'));

      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('420000'));
      const epoch = await getEpoch();
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('420000'));

      const votes = [0];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    });

    it('should be able to propose', async function () {
      const epoch = await getEpoch();

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker);

      await blockManager.connect(signers[5]).propose(epoch,
        [],
        iteration,
        biggestInfluencerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('1'), 'incorrect proposalID');
    });

    it('Number of proposals should be 1', async function () {
      const epoch = await getEpoch();

      const nblocks = await blockManager.getNumProposedBlocks(epoch);
      assertBNEqual(nblocks, toBigNumber('1'), 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('should be able to confirm block and receive block reward', async () => {
      await mineToNextState();

      const Cname = 'Test Collection';
      for (let i = 1; i <= 8; i++) {
        await assetManager.createCollection([i, i + 1], 1, 3, Cname);
      }
      await assetManager.createCollection([9, 1], 1, 3, Cname);

      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();

      await mineToNextEpoch();
      const epoch = await getEpoch();
      assertBNEqual(await assetManager.getNumActiveAssets(), toBigNumber('9'));
      assertBNEqual(
        (await blockManager.getBlock(epoch - 1)).proposerId,
        await stakeManager.stakerIds(signers[5].address),
        `${await stakeManager.stakerIds(signers[5].address)} ID is the one who proposed the block `
      );
    });

    it('should not allow invalid proposals', async function () {
      const epoch = await getEpoch();

      await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('18000'));
      await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('18000'));

      await razor.connect(signers[8]).approve(stakeManager.address, tokenAmount('18000'));
      await stakeManager.connect(signers[8]).stake(epoch, tokenAmount('18000'));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[6]).commit(epoch, commitment2);
      const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment3 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes3, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[8]).commit(epoch, commitment3);

      await mineToNextState();

      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[6]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[8]).reveal(epoch, votes3,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState();

      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker1 = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker1);

      const tx = blockManager.connect(signers[5]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800],
        iteration,
        biggestInfluencerId);

      assertRevert(tx, 'invalid block proposed');

      await blockManager.connect(signers[5]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);
    });

    it('should allow other proposals', async function () {
      const epoch = await getEpoch();

      const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
      const staker = await stakeManager.getStaker(stakerIdAcc6);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const firstProposedBlock = await blockManager.proposedBlocks(epoch, 0);
      const iteration = await getIteration(voteManager, stakeManager, staker);

      await blockManager.connect(signers[6]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);

      const secondProposedBlock = (firstProposedBlock.iteration.gt(iteration))
        ? await blockManager.proposedBlocks(epoch, 0) : await blockManager.proposedBlocks(epoch, 1);

      assertBNEqual(secondProposedBlock.proposerId, toBigNumber('2'));
    });

    it('Number of proposals should be 2', async function () {
      const epoch = await getEpoch();

      const nblocks = await blockManager.getNumProposedBlocks(epoch);

      assertBNEqual(nblocks, toBigNumber('2'), 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('should be able to dispute', async function () {
      await mineToNextState();
      const epoch = await getEpoch();

      const {
        totalInfluenceRevealed, sortedStakers,
      } = await calculateDisputesData(2,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.connect(signers[19]).giveSorted(epoch, 2, sortedStakers);

      const dispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(dispute.assetId, toBigNumber('2'), 'assetId should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.lastVisitedStaker, sortedStakers[sortedStakers.length - 1], 'lastVisited should match');
    });

    it('should be able to finalize Dispute', async function () {
      const epoch = await getEpoch();

      const stakerIdAccount = await stakeManager.stakerIds(signers[5].address);
      const stakeBeforeAcc5 = (await stakeManager.getStaker(stakerIdAccount)).stake;
      const balanceBeforeAcc19 = await razor.balanceOf(signers[19].address);
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

      const slashPenaltyAmount = (stakeBeforeAcc5.mul((await parameters.slashPenaltyNum()))).div(await parameters.slashPenaltyDenom());

      assertBNEqual((await stakeManager.getStaker(stakerIdAccount)).stake, stakeBeforeAcc5.sub(slashPenaltyAmount), 'staker did not get slashed');
      assertBNEqual(await razor.balanceOf(BURN_ADDRESS), balanceBeforeBurn.add(slashPenaltyAmount.div('2')), 'half slashed amount didnt get burnt');
      assertBNEqual(await razor.balanceOf(signers[19].address), balanceBeforeAcc19.add(slashPenaltyAmount.div('2')), 'disputer did not get rewarded');

      // const dispute = await blockManager.disputes(epoch, signers[19].address);
      // assertBNEqual(dispute.median, toBigNumber(200), 'median should match');
    });

    it('block proposed by account 6 should be confirmed', async function () {
      await mineToNextState();
      await blockManager.connect(signers[6]).claimBlockReward();
      await mineToNextState();

      await razor.connect(signers[0]).transfer(signers[7].address, tokenAmount('20000'));

      const epoch = await getEpoch();

      await razor.connect(signers[7]).approve(stakeManager.address, tokenAmount('19000'));
      await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('19000'));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[6]).commit(epoch, commitment1);

      const votes2 = [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[7]).commit(epoch, commitment2);

      assertBNEqual(
        (await blockManager.getBlock(epoch - 1)).proposerId,
        await stakeManager.stakerIds(signers[6].address),
        `${await stakeManager.stakerIds(signers[6].address)} ID is the one who proposed the block `
      );

      await mineToNextState();

      // Staker 6

      await voteManager.connect(signers[6]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      // Staker 7

      await voteManager.connect(signers[7]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    });

    it('all blocks being disputed', async function () {
      const epoch = await getEpoch();
      const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
      const staker6 = await stakeManager.getStaker(stakerIdAcc6);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration6 = await getIteration(voteManager, stakeManager, staker6);

      const stakerIdAcc7 = await stakeManager.stakerIds(signers[7].address);
      const staker7 = await stakeManager.getStaker(stakerIdAcc7);

      const iteration7 = await getIteration(voteManager, stakeManager, staker7);

      await mineToNextState();

      await blockManager.connect(signers[6]).propose(epoch,
        [1000, 2100, 3100, 4000, 5000, 6000, 7000, 8000, 9000],
        iteration6,
        biggestInfluencerId);

      await blockManager.connect(signers[7]).propose(epoch,
        [1000, 2200, 3300, 4000, 5000, 6000, 7000, 8000, 9000],
        iteration7,
        biggestInfluencerId);

      await mineToNextState();

      // const sortedVotes1 = [toBigNumber('2000'), toBigNumber('2010')];
      const res1 = await calculateDisputesData(2,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.connect(signers[19]).giveSorted(epoch, 2, res1.sortedStakers);
      const firstDispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(firstDispute.assetId, toBigNumber('2'), 'assetId should match');
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

      const res2 = await calculateDisputesData(2,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.connect(signers[15]).giveSorted(epoch, 3, res2.sortedStakers);

      const secondDispute = await blockManager.disputes(epoch, signers[15].address);

      assertBNEqual(secondDispute.assetId, toBigNumber('3'), 'assetId should match');
      assertBNEqual(secondDispute.accWeight, res2.totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(secondDispute.lastVisitedStaker, res2.sortedStakers[res2.sortedStakers.length - 1], 'lastVisited should match');

      await blockManager.connect(signers[15]).finalizeDispute(epoch, 0);
      // assertBNEqual(secondDispute2.median, res2.median, 'median should match');
      // assert((await proposedBlock.valid) === false);
    });

    it('if no block is valid in previous epoch, stakers should not be penalised', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      const { stake } = staker;

      await voteManager.connect(signers[8]).commit(epoch, commitment);

      assertBNEqual((await blockManager.getBlock(epoch - 1)).proposerId, toBigNumber('0'));
      assertBNEqual(((await blockManager.getBlock(epoch - 1)).medians).length, toBigNumber('0'));
      // assert((await blockManager.getBlock(epoch - 1)).valid === false);

      await mineToNextState();

      await voteManager.connect(signers[8]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      assertBNEqual(staker.stake, stake, 'Stake should have remained the same');
    });

    it('should be able to reset dispute incase of wrong values being entered', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      await razor.connect(signers[19]).approve(stakeManager.address, tokenAmount('19000'));
      await stakeManager.connect(signers[19]).stake(epoch, tokenAmount('19000'));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[19]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[19]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState(); // propose
      const stakerIdAcc20 = await stakeManager.stakerIds(signers[19].address);
      const staker = await stakeManager.getStaker(stakerIdAcc20);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration = await getIteration(voteManager, stakeManager, staker);

      await blockManager.connect(signers[19]).propose(epoch,
        [1000, 2001, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        iteration,
        biggestInfluencerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('5'), 'incorrect proposalID');

      await mineToNextState(); // dispute

      const sortedStakers = [5];

      await blockManager.connect(signers[15]).giveSorted(epoch, 2, sortedStakers);

      const beforeDisputeReset = await blockManager.disputes(epoch, signers[15].address);
      assertBNEqual(beforeDisputeReset.assetId, toBigNumber('2'), 'assetId should match');

      await blockManager.connect(signers[15]).resetDispute(epoch);
      const afterDisputeReset = await blockManager.disputes(epoch, signers[15].address);

      assertBNEqual(afterDisputeReset.assetId, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.accWeight, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.lastVisitedStaker, toBigNumber('0'));
    });

    it('should be able to dispute in batches', async function () {
      // Commit
      await mineToNextEpoch();
      await razor.transfer(signers[2].address, tokenAmount('423000'));
      await razor.transfer(signers[3].address, tokenAmount('19000'));
      let epoch = await getEpoch();

      await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('18000'));
      await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('18000'));
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[2]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[3]).commit(epoch, commitment2);

      // Reveal
      await mineToNextState();

      await voteManager.connect(signers[2]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      // Staker 3

      await voteManager.connect(signers[3]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      // Propose
      await mineToNextState();
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration = await getIteration(voteManager, stakeManager, staker);

      await blockManager.connect(signers[2]).propose(epoch,
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('6'), 'incorrect proposalID');

      // Calculate Dispute data
      await mineToNextState();
      epoch = await getEpoch();
      const {
        totalInfluenceRevealed, accProd, sortedStakers,
      } = await calculateDisputesData(2,
        voteManager,
        stakeManager,
        epoch);

      // Dispute in batches
      await blockManager.connect(signers[19]).giveSorted(epoch, 2, [6]);
      await blockManager.connect(signers[19]).giveSorted(epoch, 2, [7]);
      const dispute = await blockManager.disputes(epoch, signers[19].address);

      assertBNEqual(dispute.assetId, toBigNumber('2'), 'assetId should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.accProd, accProd, 'accProd should match');
      assertBNEqual(dispute.lastVisitedStaker, sortedStakers[sortedStakers.length - 1], 'lastVisited should match');
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
    });
    it('staker should not be able to propose when not elected', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[8]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[8]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getFalseIteration(voteManager, stakeManager, staker);
      const tx = blockManager.connect(signers[5]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);
      assertRevert(tx, 'not elected');
    });
    it('staker should not be able to propose when not not revealed', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker);
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[8]).commit(epoch, commitment1);
      await mineToNextState();
      await mineToNextState();
      const tx = blockManager.connect(signers[8]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);
      assertRevert(tx, 'Cannot propose without revealing');
    });
    it('staker should not be able to propose when stake below minStake', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[8].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[8]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[8]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await parameters.setSlashPenaltyNum(9500);
      await stakeManager.slash(epoch, stakerIdAcc2, signers[11].address);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker);
      const tx = blockManager.connect(signers[8]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);
      assertRevert(tx, 'stake below minimum stake');
    });
    it('should not be able to give sorted votes for stakers who didnt vote in epoch', async function () {
      await mineToNextState();
      const epoch = await getEpoch();
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, 1, [8]);
      assertRevert(tx, 'epoch in vote doesnt match with current');
    });
    it('For the second batch while raising dispute, assetid should match to the disputed assetid of first batch', async function () {
      await mineToNextEpoch();
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const epoch = await getEpoch();
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment);
      await mineToNextState();// reveal
      await voteManager.connect(signers[3]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();// propose
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker);
      await blockManager.connect(signers[3]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);
      await mineToNextState();// dispute
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, [7]);
      const tx = blockManager.connect(signers[19]).giveSorted(epoch, 2, [7]);
      assertRevert(tx, 'AssetId not matching');
    });
    it('Only valid staker can call the claimBlockReward function', async function () {
      await mineToNextState(); // confirm state
      const tx = blockManager.connect(signers[1]).claimBlockReward(); // Signer[1] is not a staker
      assertRevert(tx, 'Structs.Staker does not exist');
    });
    it('if Staker other than BlockProposer tries to call ClaimBlockReward should revert', async function () {
      const tx = blockManager.connect(signers[2]).claimBlockReward(); // Signer[2] never proposed a block
      assertRevert(tx, 'Block can be confirmed by proposer of the block');
    });
    it('If block is already confirmed Block Proposer should not be able to confirm using ClaimBlockReward()', async function () {
      await blockManager.connect(signers[3]).claimBlockReward();// BlockProposer confirms the block
      const tx = blockManager.connect(signers[3]).claimBlockReward(); // it again tries to confirm block
      assertRevert(tx, 'Block already confirmed');
    });
    it('claimBlockReward should be called in confirm state', async function () {
      await mineToNextState();
      const tx = blockManager.connect(signers[3]).claimBlockReward();
      assertRevert(tx, 'incorrect state');
    });
    it('should not be able to finalise dispute if medians value is zero', async function () {
      await mineToNextEpoch();
      const votes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const epoch = await getEpoch();
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment);
      await mineToNextState();// reveal
      await voteManager.connect(signers[3]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextState();// propose
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestInfluencerId, biggestInfluence } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker);
      const medians = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      await blockManager.connect(signers[3]).propose(epoch,
        medians,
        iteration,
        biggestInfluencerId);
      const block = await blockManager.proposedBlocks(await getEpoch(), 0);
      const median = await blockManager.connect(signers[19]).getProposedBlockMedians(await getEpoch(), 0);
      assertBNEqual(block.proposerId, stakerIdAcc2, 'ID should be equal');
      assertDeepEqual(median, medians, 'medians should be equal');
      assertBNEqual(block.iteration, iteration, 'iteration should be equal');
      assertBNEqual(biggestInfluence, block.biggestInfluence, 'biggest Influence should be equal');
      await mineToNextState();// dispute
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, [7]);

      const tx = blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
      assertRevert(tx, 'median can not be zero');
    });
    it('should be able to return correct data for getBlockMedians', async function () {
      const tx = await blockManager.connect(signers[19]).getBlockMedians(await getEpoch());
      assertDeepEqual(tx, [], 'transaction should return correct data');
    });
    it('getProposedBlock Function should work as expected', async function () {
      const tx = await blockManager.connect(signers[19]).getProposedBlock(await getEpoch(), 0);
      const medians = await blockManager.connect(signers[19]).getProposedBlockMedians(await getEpoch(), 0);
      const { proposerId, iteration, biggestInfluence } = await blockManager.proposedBlocks(await getEpoch(), 0);
      assertBNEqual(tx._block.proposerId, proposerId, 'it should return correct value');
      assertDeepEqual(tx._block.medians, medians, 'it should return correct value');
      assertBNEqual(tx._block.iteration, iteration, 'it should return correct value');
      assertBNEqual(tx._block.biggestInfluence, biggestInfluence, 'it should return correct value');
    });
    it('should not be able to finalize dispute, if total influence revealed does not match', async function () {
      // commit
      await mineToNextEpoch();
      await razor.transfer(signers[9].address, tokenAmount('19000'));
      await razor.transfer(signers[10].address, tokenAmount('17000'));
      let epoch = await getEpoch();

      await razor.connect(signers[9]).approve(stakeManager.address, tokenAmount('19000'));
      await stakeManager.connect(signers[9]).stake(epoch, tokenAmount('19000'));

      await razor.connect(signers[10]).approve(stakeManager.address, tokenAmount('17000'));
      await stakeManager.connect(signers[10]).stake(epoch, tokenAmount('17000'));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[9]).commit(epoch, commitment1);

      // Reveal
      await mineToNextState();

      await voteManager.connect(signers[9]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      // Propose
      await mineToNextState();
      const stakerIdAcc9 = await stakeManager.stakerIds(signers[9].address);
      const staker = await stakeManager.getStaker(stakerIdAcc9);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration = await getIteration(voteManager, stakeManager, staker);

      await blockManager.connect(signers[9]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestInfluencerId);

      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      // disputed without calling giveSoted() , so totalInfluenceRevealed does not match

      await blockManager.disputes(epoch, signers[10].address);

      const tx = blockManager.connect(signers[10]).finalizeDispute(epoch, 0);
      await assertRevert(tx, 'Total influence revealed doesnt match');
    });
    it('should not be able to finalize dispute, if proposed alternate block is identical to proposed blocks', async function () {
      // Commit
      await mineToNextEpoch();
      await razor.transfer(signers[12].address, tokenAmount('423000'));
      await razor.transfer(signers[13].address, tokenAmount('19000'));
      let epoch = await getEpoch();

      await razor.connect(signers[12]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[12]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[13]).approve(stakeManager.address, tokenAmount('18000'));
      await stakeManager.connect(signers[13]).stake(epoch, tokenAmount('18000'));
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[12]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment2 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[13]).commit(epoch, commitment2);

      // Reveal
      await mineToNextState();

      await voteManager.connect(signers[12]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      // Staker 13
      await voteManager.connect(signers[13]).reveal(epoch, votes2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      // Propose
      await mineToNextState();
      const stakerIdAcc12 = await stakeManager.stakerIds(signers[12].address);
      const staker12 = await stakeManager.getStaker(stakerIdAcc12);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration1 = await getIteration(voteManager, stakeManager, staker12);

      await blockManager.connect(signers[12]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration1,
        biggestInfluencerId);

      const stakerIdAcc13 = await stakeManager.stakerIds(signers[13].address);
      const staker13 = await stakeManager.getStaker(stakerIdAcc13);

      const iteration2 = await getIteration(voteManager, stakeManager, staker13);

      await blockManager.connect(signers[13]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration2,
        biggestInfluencerId);

      // dispute
      await mineToNextState();
      epoch = await getEpoch();

      const res1 = await calculateDisputesData(2,
        voteManager,
        stakeManager,
        epoch);

      await blockManager.connect(signers[10]).giveSorted(epoch, 1, res1.sortedStakers);

      await blockManager.disputes(epoch, signers[10].address);

      const tx = blockManager.connect(signers[10]).finalizeDispute(epoch, 0);

      await assertRevert(tx, 'Proposed Alternate block is identical to proposed block');
    });
  });
});
