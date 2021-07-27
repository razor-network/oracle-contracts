/* TODO:
test same vote values, stakes
test penalizeEpochs */

const merkle = require('@razor-network/merkle');
const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestInfluenceAndId,
  getIteration,
  toBigNumber,
  tokenAmount,
  getAssignedAssets,
} = require('./helpers/utils');

const { utils } = ethers;

describe('BlockManager', function () {
  let signers;
  let blockManager;
  let assetManager;
  let voteManager;
  let random;
  let razor;
  let stakeManager;
  let rewardManager;
  let parameters;
  let initializeContracts;
  let maxAssetsPerStaker;
  let numAssets;
  let weightsPerRevealedAssets = {};
  let blockThisEpoch = {
    ids: [], medians: [],
  };
  let toBeDisputedAssetId = 0;
  let disputedAssetIdIndexInBlock = 0;
  before(async () => {
    ({
      blockManager,
      parameters,
      assetManager,
      random,
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
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
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

      // Before Staker could commit even if there were no jobs, now as we are moving to assgined jobs, we need to create them first, and then only commit
      await assetManager.grantRole(await parameters.getAssetModifierHash(), signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      const repeat = true;
      let i = 0;
      while (i < 9) { await assetManager.createJob(url, selector, name, repeat); i++; }
      // By default its 2 setting it 5
      await parameters.setmaxAssetsPerStaker(5);
      maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
      numAssets = Number(await assetManager.getNumAssets());

      await mineToNextEpoch();
      await razor.transfer(signers[5].address, tokenAmount('423000'));
      await razor.transfer(signers[6].address, tokenAmount('19000'));
      await razor.transfer(signers[8].address, tokenAmount('18000'));

      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('420000'));
      const epoch = await getEpoch();
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('420000'));

      await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('18000'));
      await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('18000'));

      await razor.connect(signers[8]).approve(stakeManager.address, tokenAmount('18000'));
      await stakeManager.connect(signers[8]).stake(epoch, tokenAmount('18000'));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree2 = merkle('keccak256').sync(votes2);

      const root2 = tree2.root();
      const commitment2 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[6]).commit(epoch, commitment2);

      const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree3 = merkle('keccak256').sync(votes3);

      const root3 = tree3.root();
      const commitment3 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root3, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[8]).commit(epoch, commitment3);

      await mineToNextState();

      // Staker 5
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }

      const assignedAssets = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[5].address), votes, proof, maxAssetsPerStaker, random);
      const assigneedAssetsVotes = assignedAssets[0];
      const assigneedAssetsProofs = assignedAssets[1];

      await voteManager.connect(signers[5]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[5].address);

      // Staker 6
      const proof2 = [];
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true));
      }

      const assignedAssets2 = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[6].address), votes2, proof2, maxAssetsPerStaker, random);
      const assigneedAssetsVotes2 = assignedAssets2[0];
      const assigneedAssetsProofs2 = assignedAssets2[1];

      await voteManager.connect(signers[6]).reveal(epoch, tree2.root(), assigneedAssetsVotes2, assigneedAssetsProofs2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[6].address);

      // Staker 8
      const proof3 = [];
      for (let i = 0; i < votes3.length; i++) {
        proof3.push(tree3.getProofPath(i, true, true));
      }

      const assignedAssets3 = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[8].address), votes3, proof3, maxAssetsPerStaker, random);
      const assigneedAssetsVotes3 = assignedAssets3[0];
      const assigneedAssetsProofs3 = assignedAssets3[1];

      await voteManager.connect(signers[8]).reveal(epoch, tree3.root(), assigneedAssetsVotes3, assigneedAssetsProofs3,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[8].address);

      // To Form Block Proposal On basis of revealed assets this epoch
      const assetRevealedByStaker = {};
      const assetRevealedByStaker2 = {};
      const assetRevealedByStaker3 = {};

      const stakerIdAccount1 = await stakeManager.stakerIds(signers[5].address);
      const stakerIdAccount2 = await stakeManager.stakerIds(signers[6].address);
      const stakerIdAccount3 = await stakeManager.stakerIds(signers[8].address);

      const influence1 = await stakeManager.getInfluence(stakerIdAccount1);
      const influence2 = await stakeManager.getInfluence(stakerIdAccount2);
      const influence3 = await stakeManager.getInfluence(stakerIdAccount3);

      for (let i = 0; i < maxAssetsPerStaker; i++) {
        if (typeof weightsPerRevealedAssets[assigneedAssetsVotes[i].id] === 'undefined') weightsPerRevealedAssets[assigneedAssetsVotes[i].id] = [];
        if (typeof weightsPerRevealedAssets[assigneedAssetsVotes2[i].id] === 'undefined') weightsPerRevealedAssets[assigneedAssetsVotes2[i].id] = [];
        if (typeof weightsPerRevealedAssets[assigneedAssetsVotes3[i].id] === 'undefined') weightsPerRevealedAssets[assigneedAssetsVotes3[i].id] = [];

        // To have figure how much stake was revealed for that asset

        // Staker 5
        if (!assetRevealedByStaker[assigneedAssetsVotes[i].id]) {
          weightsPerRevealedAssets[assigneedAssetsVotes[i].id].push(influence1);
          assetRevealedByStaker[assigneedAssetsVotes[i].id] = true;
        }

        // Staker 6
        if (!assetRevealedByStaker2[assigneedAssetsVotes2[i].id]) {
          weightsPerRevealedAssets[assigneedAssetsVotes2[i].id].push(influence2);
          assetRevealedByStaker2[assigneedAssetsVotes2[i].id] = true;
        }

        // Staker 8
        if (!assetRevealedByStaker3[assigneedAssetsVotes3[i].id]) {
          weightsPerRevealedAssets[assigneedAssetsVotes3[i].id].push(influence3);
          assetRevealedByStaker3[assigneedAssetsVotes3[i].id] = true;
        }
      }

      // To find a asset id revealed by max no of stakers for better test coverage
      let maxRevealsForAsset = 0;
      for (const assetId of Object.keys(weightsPerRevealedAssets)) {
        if (maxRevealsForAsset < weightsPerRevealedAssets[assetId].length) {
          maxRevealsForAsset = weightsPerRevealedAssets[assetId].length;
          toBeDisputedAssetId = assetId;
        }
      }
      // Forming block
      // Purposefully proposing malicious value for assetTobeDisputed
      for (let i = 1; i <= numAssets; i++) {
        if (typeof weightsPerRevealedAssets[i] !== 'undefined') {
          blockThisEpoch.ids.push(i);
          if (i === parseInt(toBeDisputedAssetId, 10)) {
            disputedAssetIdIndexInBlock = blockThisEpoch.medians.length;
            blockThisEpoch.medians.push(i * 100 + 1);
          } else blockThisEpoch.medians.push(i * 100);
        }
      }
    });

    it('should be able to propose', async function () {
      const epoch = await getEpoch();

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(stakeManager, random, staker);

      await blockManager.connect(signers[5]).propose(epoch,
        blockThisEpoch.ids,
        blockThisEpoch.medians,
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

    it('should allow another proposal', async function () {
      const epoch = await getEpoch();

      const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
      const staker = await stakeManager.getStaker(stakerIdAcc6);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const firstProposedBlock = await blockManager.proposedBlocks(epoch, 0);
      const iteration = await getIteration(stakeManager, random, staker);

      // Correcting Invalid Value
      blockThisEpoch.medians[disputedAssetIdIndexInBlock]--;

      await blockManager.connect(signers[6]).propose(epoch,
        blockThisEpoch.ids,
        blockThisEpoch.medians,
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

      const sortedVotes = [toBigNumber(toBeDisputedAssetId * 100)];
      let weights = tokenAmount('0');
      for (let i = 0; i < weightsPerRevealedAssets[toBeDisputedAssetId].length; i++) {
        weights = weights.add(weightsPerRevealedAssets[toBeDisputedAssetId][i]);
      }

      const {
        median, totalInfluenceRevealed,
      } = await calculateDisputesData(
        voteManager,
        epoch,
        sortedVotes,
        [weights], // initial weights,
        toBeDisputedAssetId - 1
      );
      await blockManager.connect(signers[19]).giveSorted(epoch, toBeDisputedAssetId - 1, sortedVotes);
      const dispute = await blockManager.disputes(epoch, signers[19].address);

      assertBNEqual(dispute.assetId, toBigNumber(toBeDisputedAssetId - 1), 'assetId should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.median, median, 'median should match');
      assertBNEqual(dispute.lastVisited, sortedVotes[sortedVotes.length - 1], 'lastVisited should match');
    });

    it('should be able to finalize Dispute', async function () {
      const epoch = await getEpoch();

      const firstProposedBlock = await blockManager.proposedBlocks(epoch, 0);
      const secondProposedBlock = await blockManager.proposedBlocks(epoch, 1);

      const firstProposedBlockIndex = (firstProposedBlock.proposerId.gt(secondProposedBlock.proposerId))
        ? 1 : 0;
      const stakerIdAccount = await stakeManager.stakerIds(signers[5].address);
      const stakeBeforeAcc5 = (await stakeManager.getStaker(stakerIdAccount)).stake;
      const balanceBeforeAcc19 = await razor.balanceOf(signers[19].address);
      const balanceBeforeBurn = await razor.balanceOf(parameters.burnAddress());

      await blockManager.connect(signers[19]).finalizeDispute(epoch, firstProposedBlockIndex, disputedAssetIdIndexInBlock);
      const proposedBlock = await blockManager.proposedBlocks(epoch, firstProposedBlockIndex);

      assert((await proposedBlock.valid) === false);

      const slashPenaltyAmount = (stakeBeforeAcc5.mul((await parameters.slashPenaltyNum()))).div(await parameters.slashPenaltyDenom());

      assertBNEqual((await stakeManager.getStaker(stakerIdAccount)).stake, stakeBeforeAcc5.sub(slashPenaltyAmount));
      assertBNEqual(await razor.balanceOf(parameters.burnAddress()), balanceBeforeBurn.add(slashPenaltyAmount.div('2')));
      assertBNEqual(await razor.balanceOf(signers[19].address), balanceBeforeAcc19.add(slashPenaltyAmount.div('2')));
    });

    it('block proposed by account 6 should be confirmed', async function () {
      await mineToNextState();
      await razor.connect(signers[0]).transfer(signers[7].address, tokenAmount('20000'));

      const epoch = await getEpoch();

      await razor.connect(signers[7]).approve(stakeManager.address, tokenAmount('19000'));
      await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('19000'));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[6]).commit(epoch, commitment1);

      const votes2 = [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010];
      const tree2 = merkle('keccak256').sync(votes2);

      const root2 = tree2.root();
      const commitment2 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[7]).commit(epoch, commitment2);

      assertBNEqual(
        (await blockManager.getBlock(epoch - 1)).proposerId,
        await stakeManager.stakerIds(signers[6].address),
        `${await stakeManager.stakerIds(signers[6].address)} ID is the one who proposed the block `
      );

      await mineToNextState();

      // Staker 6
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      const assignedAssets = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[6].address), votes, proof, maxAssetsPerStaker, random);
      const assigneedAssetsVotes = assignedAssets[0];
      const assigneedAssetsProofs = assignedAssets[1];
      await voteManager.connect(signers[6]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[6].address);

      // Staker 7
      const proof2 = [];
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true));
      }
      const assignedAssets2 = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[7].address), votes2, proof2, maxAssetsPerStaker, random);
      const assigneedAssetsVotes2 = assignedAssets2[0];
      const assigneedAssetsProofs2 = assignedAssets2[1];
      await voteManager.connect(signers[7]).reveal(epoch, tree2.root(), assigneedAssetsVotes2, assigneedAssetsProofs2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[7].address);

      blockThisEpoch = {
        ids: [], medians: [],
      };
      weightsPerRevealedAssets = {};

      // To Form Block Proposal On basis of revealed assets this epoch
      const assetRevealedByStaker = {};
      const assetRevealedByStaker2 = {};

      const stakerIdAccount1 = await stakeManager.stakerIds(signers[6].address);
      const stakerIdAccount2 = await stakeManager.stakerIds(signers[7].address);

      const influence1 = await stakeManager.getInfluence(stakerIdAccount1);
      const influence2 = await stakeManager.getInfluence(stakerIdAccount2);

      for (let i = 0; i < maxAssetsPerStaker; i++) {
        if (typeof weightsPerRevealedAssets[assigneedAssetsVotes[i].id] === 'undefined') weightsPerRevealedAssets[assigneedAssetsVotes[i].id] = [];
        if (typeof weightsPerRevealedAssets[assigneedAssetsVotes2[i].id] === 'undefined') weightsPerRevealedAssets[assigneedAssetsVotes2[i].id] = [];

        // To have figure how much stake was revealed for that asset

        // Staker 6
        if (!assetRevealedByStaker[assigneedAssetsVotes[i].id]) {
          weightsPerRevealedAssets[assigneedAssetsVotes[i].id].push(influence1);
          assetRevealedByStaker[assigneedAssetsVotes[i].id] = true;
        }

        // Staker 7
        if (!assetRevealedByStaker2[assigneedAssetsVotes2[i].id]) {
          weightsPerRevealedAssets[assigneedAssetsVotes2[i].id].push(influence2);
          assetRevealedByStaker2[assigneedAssetsVotes2[i].id] = true;
        }
      }

      // To find a asset id revealed by max no of stakers for better test coverage
      let maxRevealsForAsset = 0;
      for (const assetId of Object.keys(weightsPerRevealedAssets)) {
        if (maxRevealsForAsset < weightsPerRevealedAssets[assetId].length) {
          maxRevealsForAsset = weightsPerRevealedAssets[assetId].length;
          toBeDisputedAssetId = assetId;
        }
      }

      // Forming block
      // Purposefully proposing malicious value for assetTobeDisputed
      for (let i = 1; i <= numAssets; i++) {
        if (typeof weightsPerRevealedAssets[i] !== 'undefined') {
          blockThisEpoch.ids.push(i);
          if (i === parseInt(toBeDisputedAssetId, 10)) {
            disputedAssetIdIndexInBlock = blockThisEpoch.medians.length;
            blockThisEpoch.medians.push(i * 1000 + 1);
          } else blockThisEpoch.medians.push(i * 1000);
        }
      }
    });

    it('all blocks being disputed', async function () {
      const epoch = await getEpoch();
      const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
      const staker6 = await stakeManager.getStaker(stakerIdAcc6);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration6 = await getIteration(stakeManager, random, staker6);

      const stakerIdAcc7 = await stakeManager.stakerIds(signers[7].address);
      const staker7 = await stakeManager.getStaker(stakerIdAcc7);

      const iteration7 = await getIteration(stakeManager, random, staker7);

      await mineToNextState();

      await blockManager.connect(signers[6]).propose(epoch,
        blockThisEpoch.ids,
        blockThisEpoch.medians,
        iteration6,
        biggestInfluencerId);

      await blockManager.connect(signers[7]).propose(epoch,
        blockThisEpoch.ids,
        blockThisEpoch.medians,
        iteration7,
        biggestInfluencerId);

      await mineToNextState();

      let sortedVotes1;
      let weights;

      const stakerIdAccount1 = await stakeManager.stakerIds(signers[6].address);
      const stakerIdAccount2 = await stakeManager.stakerIds(signers[7].address);

      const influence1 = await stakeManager.getInfluence(stakerIdAccount1);
      const influence2 = await stakeManager.getInfluence(stakerIdAccount2);

      if (weightsPerRevealedAssets[toBeDisputedAssetId].length === 2) { // If toBeDisputedAssetId is revealed by both stakers
        sortedVotes1 = [toBigNumber(toBeDisputedAssetId * 1000), toBigNumber(toBeDisputedAssetId * 1000 + 10)];
        weights = [influence1, influence2];
      } else if (weightsPerRevealedAssets[toBeDisputedAssetId][0] === influence1) {
        sortedVotes1 = [toBigNumber(toBeDisputedAssetId * 1000)];
        weights = [influence1];
      } else {
        sortedVotes1 = [toBigNumber(toBeDisputedAssetId * 1000 + 10)];
        weights = [influence2];
      }

      const {
        median: median1,
        totalInfluenceRevealed: totalInfluenceRevealed1,
      } = await calculateDisputesData(
        voteManager,
        epoch,
        sortedVotes1,
        weights, // initial weights
        toBeDisputedAssetId - 1
      );

      await blockManager.connect(signers[19]).giveSorted(epoch, toBeDisputedAssetId - 1, sortedVotes1);

      const firstDispute = await blockManager.disputes(epoch, signers[19].address);
      assertBNEqual(firstDispute.assetId, toBigNumber(toBeDisputedAssetId - 1), 'assetId should match');
      assertBNEqual(firstDispute.accWeight, totalInfluenceRevealed1, 'totalInfluenceRevealed should match');
      assertBNEqual(firstDispute.median, median1, 'median should match');
      assertBNEqual(firstDispute.lastVisited, sortedVotes1[sortedVotes1.length - 1], 'lastVisited should match');

      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0, disputedAssetIdIndexInBlock);
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assert((await proposedBlock.valid) === false);

      const {
        median: median2,
        totalInfluenceRevealed: totalInfluenceRevealed2,
      } = await calculateDisputesData(
        voteManager,
        epoch,
        sortedVotes1,
        weights, // initial weights
        toBeDisputedAssetId - 1
      );

      await blockManager.connect(signers[15]).giveSorted(epoch, toBeDisputedAssetId - 1, sortedVotes1);

      const secondDispute = await blockManager.disputes(epoch, signers[15].address);

      assertBNEqual(secondDispute.assetId, toBigNumber(toBeDisputedAssetId - 1), 'assetId should match');
      assertBNEqual(secondDispute.accWeight, totalInfluenceRevealed2, 'totalInfluenceRevealed should match');
      assertBNEqual(secondDispute.median, median2, 'median should match');
      assertBNEqual(secondDispute.lastVisited, sortedVotes1[sortedVotes1.length - 1], 'lastVisited should match');

      await blockManager.connect(signers[15]).finalizeDispute(epoch, 1, disputedAssetIdIndexInBlock);
      proposedBlock = await blockManager.proposedBlocks(epoch, 1);
      assert((await proposedBlock.valid) === false);
    });

    it('if no block is valid in previous epoch, stakers should not be penalised', async function () {
      await mineToNextState();
      const epoch = await getEpoch();

      const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
      const staker = await stakeManager.getStaker(stakerIdAcc8);

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      const { stake } = staker;

      await voteManager.connect(signers[8]).commit(epoch, commitment);

      assertBNEqual((await blockManager.getBlock(epoch - 1)).proposerId, toBigNumber('0'));
      assertBNEqual(((await blockManager.getBlock(epoch - 1)).medians).length, toBigNumber('0'));
      assert((await blockManager.getBlock(epoch - 1)).valid === false);

      await mineToNextState();

      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      const assignedAssets = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[8].address), votes, proof, maxAssetsPerStaker, random);
      const assigneedAssetsVotes = assignedAssets[0];
      const assigneedAssetsProofs = assignedAssets[1];
      await voteManager.connect(signers[8]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[8].address);

      assertBNEqual(staker.stake, stake, 'Stake should have remained the same');
    });

    it('should be able to reset dispute incase of wrong values being entered', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      await razor.connect(signers[19]).approve(stakeManager.address, tokenAmount('19000'));
      await stakeManager.connect(signers[19]).stake(epoch, tokenAmount('19000'));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[19]).commit(epoch, commitment1);

      await mineToNextState();

      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      const assignedAssets = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[19].address), votes, proof, maxAssetsPerStaker, random);
      const assigneedAssetsVotes = assignedAssets[0];
      const assigneedAssetsProofs = assignedAssets[1];
      await voteManager.connect(signers[19]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[19].address);

      await mineToNextState();
      const stakerIdAcc20 = await stakeManager.stakerIds(signers[19].address);
      const staker = await stakeManager.getStaker(stakerIdAcc20);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration = await getIteration(stakeManager, random, staker);

      // To Form Block Proposal On basis of revealed assets this epoch
      const revealedAssetsThisEpoch = {};
      for (let i = 0; i < maxAssetsPerStaker; i++) {
        revealedAssetsThisEpoch[assigneedAssetsVotes[i].id] = true;
      }
      blockThisEpoch = {
        ids: [], medians: [],
      };
      // Purposefully Proposing invalid value for 1st asset of block
      let firstAsset = true;
      for (let i = 1; i <= numAssets; i++) {
        if (revealedAssetsThisEpoch[i]) {
          blockThisEpoch.ids.push(i);
          firstAsset && (toBeDisputedAssetId = i);
          // Purposefully Proposing invalid value for 1st asset of block
          firstAsset ? blockThisEpoch.medians.push(i * 1000 + 1) : blockThisEpoch.medians.push(i * 1000);
          firstAsset = false;
        }
      }

      await blockManager.connect(signers[19]).propose(epoch,
        blockThisEpoch.ids,
        blockThisEpoch.medians,
        iteration,
        biggestInfluencerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('5'), 'incorrect proposalID');

      await mineToNextState();

      // By Mistake Raising Wrong Dispute
      const sortedVotes = [toBigNumber(toBeDisputedAssetId * 10000)];

      await blockManager.connect(signers[15]).giveSorted(epoch, toBeDisputedAssetId - 1, sortedVotes);

      const beforeDisputeReset = await blockManager.disputes(epoch, signers[15].address);
      assertBNEqual(beforeDisputeReset.assetId, toBigNumber(toBeDisputedAssetId - 1), 'assetId should match');

      await blockManager.connect(signers[15]).resetDispute(epoch);
      const afterDisputeReset = await blockManager.disputes(epoch, signers[15].address);

      assertBNEqual(afterDisputeReset.assetId, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.median, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.accWeight, toBigNumber('0'));
      assertBNEqual(afterDisputeReset.lastVisited, toBigNumber('0'));
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
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[2]).commit(epoch, commitment1);

      const votes2 = [105, 205, 305, 405, 505, 605, 705, 805, 905];
      const tree2 = merkle('keccak256').sync(votes2);
      const root2 = tree2.root();
      const commitment2 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[3]).commit(epoch, commitment2);

      // Reveal
      await mineToNextState();
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      // Staker 2
      const assignedAssets = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[2].address), votes, proof, maxAssetsPerStaker, random);
      const assigneedAssetsVotes = assignedAssets[0];
      const assigneedAssetsProofs = assignedAssets[1];

      await voteManager.connect(signers[2]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[2].address);

      // Staker 3
      const proof2 = [];
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true));
      }
      const assignedAssets2 = await getAssignedAssets(numAssets, await stakeManager.stakerIds(signers[3].address), votes2, proof2, maxAssetsPerStaker, random);
      const assigneedAssetsVotes2 = assignedAssets2[0];
      const assigneedAssetsProofs2 = assignedAssets2[1];
      await voteManager.connect(signers[3]).reveal(epoch, tree2.root(), assigneedAssetsVotes2, assigneedAssetsProofs2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[3].address);
      // Propose
      blockThisEpoch = {
        ids: [], medians: [],
      };
      weightsPerRevealedAssets = {};

      // To Form Block Proposal On basis of revealed assets this epoch
      const assetRevealedByStaker = {};
      const assetRevealedByStaker2 = {};
      const stakerIdAccount1 = await stakeManager.stakerIds(signers[2].address);
      const stakerIdAccount2 = await stakeManager.stakerIds(signers[3].address);

      const influence1 = await stakeManager.getInfluence(stakerIdAccount1);
      const influence2 = await stakeManager.getInfluence(stakerIdAccount2);
      for (let i = 0; i < maxAssetsPerStaker; i++) {
        if (typeof weightsPerRevealedAssets[assigneedAssetsVotes[i].id] === 'undefined') weightsPerRevealedAssets[assigneedAssetsVotes[i].id] = [];
        if (typeof weightsPerRevealedAssets[assigneedAssetsVotes2[i].id] === 'undefined') weightsPerRevealedAssets[assigneedAssetsVotes2[i].id] = [];

        // To have figure how much stake was revealed for that asset

        // Staker 2
        if (!assetRevealedByStaker[assigneedAssetsVotes[i].id]) {
          weightsPerRevealedAssets[assigneedAssetsVotes[i].id].push(influence1);
          assetRevealedByStaker[assigneedAssetsVotes[i].id] = true;
        }

        // Staker 3
        if (!assetRevealedByStaker2[assigneedAssetsVotes2[i].id]) {
          weightsPerRevealedAssets[assigneedAssetsVotes2[i].id].push(influence2);
          assetRevealedByStaker2[assigneedAssetsVotes2[i].id] = true;
        }
      }

      // To find a asset id revealed by max no of stakers for better test coverage
      let maxRevealsForAsset = 0;
      for (const assetId of Object.keys(weightsPerRevealedAssets)) {
        if (maxRevealsForAsset < weightsPerRevealedAssets[assetId].length) {
          maxRevealsForAsset = weightsPerRevealedAssets[assetId].length;
          toBeDisputedAssetId = assetId;
        }
      }
      // Forming block
      // Purposefully proposing malicious value for assetTobeDisputed
      for (let i = 1; i <= numAssets; i++) {
        if (typeof weightsPerRevealedAssets[i] !== 'undefined') {
          blockThisEpoch.ids.push(i);
          if (i === parseInt(toBeDisputedAssetId, 10)) {
            disputedAssetIdIndexInBlock = blockThisEpoch.medians.length;
            blockThisEpoch.medians.push(i * 1000 + 1);
          } else blockThisEpoch.medians.push(i * 100);
        }
      }
      await mineToNextState();
      const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.getStaker(stakerIdAcc2);
      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

      const iteration = await getIteration(stakeManager, random, staker);

      await blockManager.connect(signers[2]).propose(epoch,
        blockThisEpoch.ids,
        blockThisEpoch.medians,
        iteration,
        biggestInfluencerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assertBNEqual(proposedBlock.proposerId, toBigNumber('6'), 'incorrect proposalID');

      // Calculate Dispute data
      await mineToNextState();
      epoch = await getEpoch();
      let sortedVotes;
      let weights;
      if (weightsPerRevealedAssets[toBeDisputedAssetId].length === 2) { // If toBeDisputedAssetId is revealed by both stakers
        sortedVotes = [toBigNumber(votes[toBeDisputedAssetId - 1]), toBigNumber(votes2[toBeDisputedAssetId - 1])];
        weights = [influence1, influence2];
      } else if (weightsPerRevealedAssets[toBeDisputedAssetId][0] === influence1) {
        sortedVotes = [toBigNumber(votes[toBeDisputedAssetId - 1])];
        weights = [influence1];
      } else {
        sortedVotes = [toBigNumber(votes2[toBeDisputedAssetId - 1])];
        weights = [influence2];
      }
      const {
        median, totalInfluenceRevealed,
      } = await calculateDisputesData(
        voteManager,
        epoch,
        sortedVotes,
        weights, // initial weights
        toBeDisputedAssetId - 1
      );
      // Dispute in batches
      if (sortedVotes.length === 2) {
        await blockManager.connect(signers[19]).giveSorted(epoch, toBeDisputedAssetId - 1, [sortedVotes[0]]);
        await blockManager.connect(signers[19]).giveSorted(epoch, toBeDisputedAssetId - 1, [sortedVotes[1]]);
      } else { await blockManager.connect(signers[19]).giveSorted(epoch, toBeDisputedAssetId - 1, [sortedVotes[0]]); }

      const dispute = await blockManager.disputes(epoch, signers[19].address);

      assertBNEqual(dispute.assetId, toBigNumber(toBeDisputedAssetId - 1), 'assetId should match');
      assertBNEqual(dispute.accWeight, totalInfluenceRevealed, 'totalInfluenceRevealed should match');
      assertBNEqual(dispute.median, median, 'median should match');
      assertBNEqual(dispute.lastVisited, sortedVotes[sortedVotes.length - 1], 'lastVisited should match');
    });
  });
});
