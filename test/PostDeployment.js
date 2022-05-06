/* eslint-disable prefer-destructuring */
// @dev : above is a quick fix for this linting error
// I couldnt understand what it meant, to solve it

const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  mineBlock,
} = require('./helpers/testHelpers');
const {
  COLLECTION_MODIFIER_ROLE,
  GOVERNER_ROLE,
} = require('./helpers/constants');
const {
  getEpoch,
  getState,
  tokenAmount,
  adhocCommit,
  adhocReveal,
  adhocPropose,
} = require('./helpers/utils');

const { utils } = ethers;
const { setupContracts } = require('./helpers/testSetup');

describe('PostDeploymentSetup', function () {
  let signers;
  let blockManager;
  let collectionManager;
  let voteManager;
  let razor;
  let stakeManager;
  let initializeContracts;
  let governance;
  const stakes = [];
  let blockReward;

  const medians = [5906456, 402349, 5914274, 402337, 5907868, 401854, 5877418, 399082, 5906773];
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  before(async () => {
    ({
      blockManager,
      governance,
      collectionManager,
      razor,
      stakeManager,
      voteManager,
      initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
    await Promise.all(await initializeContracts());
    blockReward = await blockManager.blockReward();
    await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
    await governance.grantRole(GOVERNER_ROLE, signers[0].address);

    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 9) {
      name = `test${i}`;
      await collectionManager.createJob(weight, power, selectorType, name, selector, url);
      i++;
    }

    while (Number(await getState()) !== 4) {
      if (Number(await getState()) === -1) {
        await mineBlock();
      } else {
        await mineToNextState();
      }
    }

    let Cname;
    for (let i = 1; i <= 8; i++) {
      Cname = `Test Collection${String(i)}`;
      await collectionManager.createCollection(500, 3, 1, [i, i + 1], Cname);
    }
    Cname = 'Test Collection9';
    await collectionManager.createCollection(500, 3, 1, [9, 1], Cname);
    await mineToNextEpoch();
    const epoch = getEpoch();
    const razors = tokenAmount('443000');

    await razor.transfer(signers[1].address, razors);

    await governance.connect(signers[0]).setToAssign(7);

    const stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));

    await razor.connect(signers[1]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[1]).stake(epoch, stake);
    stakes.push(stake);
  });

  it('1 epoch of constant voting and participation', async () => {
    await governance.connect(signers[0]).setToAssign(7);
    const secret = [];
    secret.push('0x727d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8decbebc56bc7dec8b5555c0823ea4ececececececb');
    for (let i = 1; i <= 2; i++) {
      // commit
      const epoch = await getEpoch();
      await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret[0]);
      await mineToNextState();
      // reveal
      await adhocReveal(signers[1], 0, voteManager);
      await mineToNextState();
      // propose
      await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);
      await mineToNextState();
      // dispute
      await mineToNextState();
      // confirm
      const sortedProposedBlockId = await blockManager.sortedProposedBlockIds(epoch, 0);
      const sortedProposedBlock = await blockManager.proposedBlocks(epoch, sortedProposedBlockId);
      const stakeBefore = await stakeManager.getStake(sortedProposedBlock.proposerId);
      for (let j = 1; j < 2; j++) {
        if (j === Number(sortedProposedBlock.proposerId)) {
          await blockManager.connect(signers[j]).claimBlockReward();
          break;
        }
      }
      const stakeAfter = await stakeManager.getStake(sortedProposedBlock.proposerId);
      assertBNEqual(stakeAfter, stakeBefore.add(blockReward), 'Staker not rewarded');
      await mineToNextEpoch();
    }
  });
});
