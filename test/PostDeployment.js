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

const {
  deployPostDeploymentTestContracts, postDeploymentInitialiseContracts, postDeploymentGrantRoles, fetchDeployedContractDetails,
} = require('../migrations/migrationHelpers');

describe('PostDeployment Test', function () {
  let signers;
  let blockManagerContract;
  let collectionManagerContract;
  let voteManagerContract;
  let razorContract;
  let stakeManagerContract;
  let governanceContract;
  const stakes = [];
  let blockReward;

  const medians = [5906456, 402349, 5914274, 402337, 5907868, 401854, 5877418, 399082, 5906773];
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  before(async () => {
    const { BigNumber } = ethers;
    const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));
    await deployPostDeploymentTestContracts('Governance');
    await deployPostDeploymentTestContracts('BlockManager');
    await deployPostDeploymentTestContracts('CollectionManager');
    await deployPostDeploymentTestContracts('StakeManager');
    await deployPostDeploymentTestContracts('RewardManager');
    await deployPostDeploymentTestContracts('VoteManager');
    await deployPostDeploymentTestContracts('Delegator');
    await deployPostDeploymentTestContracts('RAZOR', [initialSupply]);
    await deployPostDeploymentTestContracts('StakedTokenFactory');
    await deployPostDeploymentTestContracts('RandomNoManager');
    // Initialise Contracts and Grant Roles using the post deployment helper functions
    await postDeploymentInitialiseContracts('test');
    await postDeploymentGrantRoles('test');

    const {
      Governance: {
        governance,
      },
      BlockManager: {
        blockManager,
      },
      CollectionManager: {
        collectionManager,
      },
      StakeManager: {
        stakeManager,
      },
      VoteManager: {
        voteManager,
      },
      RAZOR: {
        RAZOR,
      },
    } = await fetchDeployedContractDetails('test');
    blockManagerContract = blockManager;
    collectionManagerContract = collectionManager;
    voteManagerContract = voteManager;
    razorContract = RAZOR;
    stakeManagerContract = stakeManager;
    governanceContract = governance;

    signers = await ethers.getSigners();
    blockReward = await blockManagerContract.blockReward();
    await collectionManagerContract.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
    await governanceContract.grantRole(GOVERNER_ROLE, signers[0].address);

    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 9) {
      name = `test${i}`;
      await collectionManagerContract.createJob(weight, power, selectorType, name, selector, url);
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
      await collectionManagerContract.createCollection(500, 3, 1, [i, i + 1], Cname);
    }
    Cname = 'Test Collection9';
    await collectionManagerContract.createCollection(500, 3, 1, [9, 1], Cname);
    await mineToNextEpoch();
    const epoch = getEpoch();
    const razors = tokenAmount('443000');

    await razorContract.transfer(signers[1].address, razors);

    await governanceContract.connect(signers[0]).setToAssign(7);

    const stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));

    await razorContract.connect(signers[1]).approve(stakeManager.address, stake);
    await stakeManagerContract.connect(signers[1]).stake(epoch, stake);
    stakes.push(stake);
  });

  it('1 epoch of constant voting and participation', async () => {
    await governanceContract.connect(signers[0]).setToAssign(7);
    const secret = [];
    secret.push('0x727d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');

    // commit
    const epoch = await getEpoch();
    await adhocCommit(medians, signers[1], 0, voteManagerContract, collectionManagerContract, secret[0]);
    await mineToNextState();
    // reveal
    await adhocReveal(signers[1], 0, voteManagerContract);
    await mineToNextState();
    // propose
    await adhocPropose(signers[1], ids, medians, stakeManagerContract, blockManagerContract, voteManagerContract);
    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm
    const sortedProposedBlockId = await blockManagerContract.sortedProposedBlockIds(epoch, 0);
    const sortedProposedBlock = await blockManagerContract.proposedBlocks(epoch, sortedProposedBlockId);
    const stakeBefore = await stakeManagerContract.getStake(sortedProposedBlock.proposerId);
    for (let j = 1; j < 2; j++) {
      if (j === Number(sortedProposedBlock.proposerId)) {
        await blockManagerContract.connect(signers[j]).claimBlockReward();
        break;
      }
    }
    const stakeAfter = await stakeManagerContract.getStake(sortedProposedBlock.proposerId);
    assertBNEqual(stakeAfter, stakeBefore.add(blockReward), 'Staker not rewarded');
    await mineToNextEpoch();
  });
});
