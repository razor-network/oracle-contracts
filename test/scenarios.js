const { utils } = require('ethers');
const {
  ASSET_MODIFIER_ROLE,
  GRACE_PERIOD,
} = require('./helpers/constants');
const {
  assertBNEqual,
  assertBNLessThan,
  mineToNextEpoch,
  restoreSnapshot,
  takeSnapshot,
  mineToNextState,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  getEpoch,
  tokenAmount,
  getBiggestInfluenceAndId,
  getIteration,
} = require('./helpers/utils');

describe('Scenarios', async () => {
  let signers;
  let snapShotId;
  let blockManager;
  let parameters;
  let assetManager;
  let stakeManager;
  let voteManager;
  let initializeContracts;
  let razor;
  let blockReward;
  let stakes = [];

  before(async () => {
    ({
      blockManager, razor, parameters, voteManager, assetManager, stakeManager, initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
    blockReward = await parameters.blockReward();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
    await Promise.all(await initializeContracts());
    await assetManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address);
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    const name = 'test';
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 9) { await assetManager.createJob(weight, power, selectorType, name, selector, url); i++; }

    while (Number(await parameters.getState()) !== 4) { await mineToNextState(); }

    const Cname = 'Test Collection';
    for (let i = 1; i <= 8; i++) {
      await assetManager.createCollection([i, i + 1], 1, 3, Cname);
    }
    await assetManager.createCollection([9, 1], 1, 3, Cname);

    await mineToNextEpoch();
    const epoch = getEpoch();
    const razors = tokenAmount('443000');
    await razor.transfer(signers[1].address, razors);
    await razor.transfer(signers[2].address, razors);
    await razor.transfer(signers[3].address, razors);
    await razor.transfer(signers[4].address, razors);
    await razor.transfer(signers[5].address, razors);

    let stake = razors.sub(tokenAmount(Math.floor((Math.random() * 442000) + 1000)));
    await razor.connect(signers[1]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[1]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 441000) + 1000)));
    await razor.connect(signers[2]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[2]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 441000) + 1000)));
    await razor.connect(signers[3]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[3]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 441000) + 1000)));
    await razor.connect(signers[4]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[4]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 441000) + 1000)));
    await razor.connect(signers[5]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[5]).stake(epoch, stake);
    stakes.push(stake);
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
    stakes = [];
  });

  it('50 epochs of constant voting and participation', async () => {
    let epoch = await getEpoch();
    for (let i = 1; i <= 50; i++) {
      // commit
      for (let j = 1; j <= 5; j++) {
        epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment = utils.solidityKeccak256(
          ['uint32', 'uint48[]', 'bytes32'],
          [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        await voteManager.connect(signers[j]).commit(epoch, commitment);
      }
      await mineToNextState();
      // reveal
      for (let j = 1; j <= 5; j++) {
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        await voteManager.connect(signers[j]).reveal(epoch, votes,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 5; j++) {
        const stakerId = await stakeManager.stakerIds(signers[j].address);
        const staker = await stakeManager.getStaker(stakerId);

        const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
        const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        await blockManager.connect(signers[j]).propose(epoch,
          medians,
          iteration,
          biggestInfluencerId);
      }
      await mineToNextState();
      // dispute
      await mineToNextState();
      // confirm
      const sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, 0);
      const sortedProposedBlock = await blockManager.proposedBlocks(epoch, sortedProposedBlockId);
      const stakeBefore = await stakeManager.getStake(sortedProposedBlock.proposerId);
      for (let j = 1; j <= 5; j++) {
        if (j === Number(sortedProposedBlock.proposerId)) {
          await blockManager.connect(signers[j]).claimBlockReward();
          break;
        }
      }
      const stakeAfter = await stakeManager.getStake(sortedProposedBlock.proposerId);
      assertBNEqual(stakeAfter, stakeBefore.add(blockReward), 'Staker not rewarded');
      await mineToNextEpoch();
    }
  }).timeout(400000);

  it('Inactivity Penalties should be levied if inactive for more than the grace period', async () => {
    let epoch = await getEpoch();
    // commit
    for (let j = 1; j <= 5; j++) {
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[j]).commit(epoch, commitment);
    }
    await mineToNextState();
    // reveal
    for (let j = 1; j <= 5; j++) {
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      await voteManager.connect(signers[j]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    }
    await mineToNextState();
    // propose
    for (let j = 1; j <= 5; j++) {
      const stakerId = await stakeManager.stakerIds(signers[j].address);
      const staker = await stakeManager.getStaker(stakerId);

      const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
      const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      await blockManager.connect(signers[j]).propose(epoch,
        medians,
        iteration,
        biggestInfluencerId);
    }
    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm
    const sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, 0);
    const sortedProposedBlock = await blockManager.proposedBlocks(epoch, sortedProposedBlockId);
    for (let j = 1; j <= 5; j++) {
      if (j === Number(sortedProposedBlock.proposerId)) {
        await blockManager.connect(signers[j]).claimBlockReward();
        break;
      }
    }
    await mineToNextEpoch();

    const stakeBefore = await stakeManager.getStake(5);
    for (let i = 1; i <= GRACE_PERIOD + 1; i++) {
      // commit
      for (let j = 1; j <= 4; j++) {
        epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = utils.solidityKeccak256(
          ['uint32', 'uint48[]', 'bytes32'],
          [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        await voteManager.connect(signers[j]).commit(epoch, commitment);
      }
      await mineToNextState();
      // reveal
      for (let j = 1; j <= 4; j++) {
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        await voteManager.connect(signers[j]).reveal(epoch, votes,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 4; j++) {
        const stakerId = await stakeManager.stakerIds(signers[j].address);
        const staker = await stakeManager.getStaker(stakerId);

        const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
        const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        await blockManager.connect(signers[j]).propose(epoch,
          medians,
          iteration,
          biggestInfluencerId);
      }
      await mineToNextState();
      // dispute
      await mineToNextState();
      // confirm
      const sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, 0);
      const sortedProposedBlock = await blockManager.proposedBlocks(epoch, sortedProposedBlockId);
      const stakeBefore = await stakeManager.getStake(sortedProposedBlock.proposerId);
      for (let j = 1; j <= 4; j++) {
        if (j === Number(sortedProposedBlock.proposerId)) {
          await blockManager.connect(signers[j]).claimBlockReward();
          break;
        }
      }
      const stakeAfter = await stakeManager.getStake(sortedProposedBlock.proposerId);
      assertBNEqual(stakeAfter, stakeBefore.add(blockReward), 'Staker not rewarded');
      await mineToNextEpoch();
    }
    epoch = await getEpoch();
    const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const commitment = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[5]).commit(epoch, commitment);
    const stakeAfter = await stakeManager.getStake(5);
    assertBNLessThan(stakeAfter, stakeBefore, 'Inactivity Penalties have not been levied');
  });
});
