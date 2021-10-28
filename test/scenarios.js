const { utils } = require('ethers');
const {
  ASSET_MODIFIER_ROLE,
  GRACE_PERIOD,
  WITHDRAW_LOCK_PERIOD,
  GOVERNER_ROLE,
} = require('./helpers/constants');
const {
  assertBNEqual,
  assertBNLessThan,
  assertRevert,
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
  toBigNumber,
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
  let stakedToken;
  let governance;

  let stakes = [];

  before(async () => {
    ({
      blockManager, razor, parameters, governance, voteManager, assetManager, stakeManager, initializeContracts, stakedToken,
    } = await setupContracts());
    signers = await ethers.getSigners();
    blockReward = await blockManager.blockReward();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
    await Promise.all(await initializeContracts());
    await assetManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address);
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
      await assetManager.createJob(weight, power, selectorType, name, selector, url);
      i++;
    }

    while (Number(await stakeManager.getState(await stakeManager.epochLength())) !== 4) { await mineToNextState(); }

    let Cname;
    for (let i = 1; i <= 8; i++) {
      Cname = `Test Collection${String(i)}`;
      await assetManager.createCollection([i, i + 1], 1, 3, Cname);
    }
    Cname = 'Test Collection9';
    await assetManager.createCollection([9, 1], 1, 3, Cname);

    await mineToNextEpoch();
    const epoch = getEpoch();
    const razors = tokenAmount('443000');

    await razor.transfer(signers[1].address, razors);
    await razor.transfer(signers[2].address, razors);
    await razor.transfer(signers[3].address, razors);
    await razor.transfer(signers[4].address, razors);
    await razor.transfer(signers[5].address, razors);

    let stake = razors.sub(tokenAmount(Math.floor((Math.random() * 442000))));

    await razor.connect(signers[1]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[1]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 442000))));
    await razor.connect(signers[2]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[2]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 442000))));
    await razor.connect(signers[3]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[3]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 442000))));
    await razor.connect(signers[4]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[4]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 442000))));
    await razor.connect(signers[5]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[5]).stake(epoch, stake);
    stakes.push(stake);
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
    stakes = [];
  });

  it('100 epochs of constant voting and participation', async () => {
    let epoch = await getEpoch();
    for (let i = 1; i <= 100; i++) {
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

  it('Staker is initially active and then becomes inactive more than the GRACE PERIOD', async () => {
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
  }).timeout(50000);

  it('Staker unsatkes such that stake becomes less than minStake, minStake() is changed such that staker particpates again', async function () {
    let epoch = await getEpoch();
    for (let i = 1; i <= 3; i++) {
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

    const minStake = await stakeManager.minStake();

    for (let i = 1; i <= 5; i++) {
      await mineToNextEpoch();
      epoch = await getEpoch();
      // we're doing a unstake such that stake becomes less than the minStake

      const staker = await stakeManager.getStaker(i);
      const sToken = await stakedToken.attach(staker.tokenAddress);

      const amount = (await sToken.balanceOf(staker._address));

      await stakeManager.connect(signers[i]).unstake(epoch, i, amount.sub(minStake).add(tokenAmount('100')));
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);

      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    }

    // commit
    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[i]).commit(epoch, commitment);
    }
    await mineToNextState(); // reveal

    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tx = voteManager.connect(signers[i]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await assertRevert(tx, 'not committed in this epoch');
    }

    await governance.setMinStake(toBigNumber('800'));

    await mineToNextState();// propose
    await mineToNextState();// dispute
    await mineToNextState();// confirm
    await mineToNextState();// commit

    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[i]).commit(epoch, commitment);
    }
    await mineToNextState();

    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      await voteManager.connect(signers[i]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    }
  });

  it('Staker remains inactive for a long period of time such that stake becomes less than minStake , no participation now in network', async function () {
    const stake = tokenAmount('1000');
    await razor.transfer(signers[6].address, stake);
    let epoch = await getEpoch();

    await razor.connect(signers[6]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[6]).stake(epoch, stake);
    await mineToNextEpoch();
    epoch = await getEpoch();

    // commit
    const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

    const commitment = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[6]).commit(epoch, commitment);

    await mineToNextState();
    // Reveal
    await voteManager.connect(signers[6]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await mineToNextState();

    const stakerId = await stakeManager.stakerIds(signers[6].address);
    const staker = await stakeManager.getStaker(stakerId);

    const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
    const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
    const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    await blockManager.connect(signers[6]).propose(epoch,
      medians,
      iteration,
      biggestInfluencerId);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();

    for (let i = 1; i <= 100; i++) {
      await mineToNextEpoch();
    }
    epoch = await getEpoch();

    const commitment1 = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );

    await voteManager.connect(signers[6]).commit(epoch, commitment1);

    await mineToNextState();
    const tx = voteManager.connect(signers[6]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await assertRevert(tx, 'not committed in this epoch');
  }).timeout(400000);

  it('Staker participates and unstakes and then increase the stake again, everything should work properly', async function () {
    let epoch = await getEpoch();
    for (let i = 1; i <= 3; i++) {
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

    for (let i = 1; i <= 5; i++) {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      // we're doing a partial unstake here , though full unstake has the same procedure

      const staker = await stakeManager.getStaker(i);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      const amount = tokenAmount('1000');

      await stakeManager.connect(signers[i]).unstake(epoch, i, amount);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      const rAmount = (amount.mul(staker.stake)).div(totalSupply);
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    }

    // staking again
    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();
      const razors = tokenAmount('1000');
      await razor.transfer(signers[i].address, razors);
      const stake = tokenAmount('1000');
      await razor.connect(signers[i]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[i]).stake(epoch, stake);

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[i]).commit(epoch, commitment);
    }

    await mineToNextState();

    for (let i = 1; i <= 5; i++) {
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      await voteManager.connect(signers[i]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    }
  });
  it('Staker particpates with delegator and later delegator withdraws such that stakers stake becomes less than minStake', async function () {
    // staker participating in netwrok
    const stake = tokenAmount('1000');
    await razor.transfer(signers[7].address, stake);
    let epoch = await getEpoch();

    await razor.connect(signers[7]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[7]).stake(epoch, stake);
    await mineToNextEpoch();
    epoch = await getEpoch();

    // commit
    const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

    const commitment = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[7]).commit(epoch, commitment);

    await mineToNextState();
    // Reveal
    await voteManager.connect(signers[7]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await mineToNextState();

    let stakerId = await stakeManager.stakerIds(signers[7].address);
    let staker = await stakeManager.getStaker(stakerId);

    const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
    const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
    const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    await blockManager.connect(signers[7]).propose(epoch,
      medians,
      iteration,
      biggestInfluencerId);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    // delegator delegates it's stake to staker
    const commRate = 6;
    await stakeManager.connect(signers[7]).setCommission(commRate);
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);
    assertBNEqual(staker.commission, commRate, 'Commission rate is not equal to requested set rate ');

    await stakeManager.connect(signers[7]).setDelegationAcceptance('true');
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);

    await mineToNextState();
    await mineToNextEpoch();
    epoch = await getEpoch();
    // Participation In Epoch as delegators cant delegate to a staker untill they participate

    const commitment1 = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[7]).commit(epoch, commitment1);
    await mineToNextState();
    await voteManager.connect(signers[7]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    await mineToNextEpoch();
    const { acceptDelegation } = staker;
    assert.strictEqual(acceptDelegation, true, 'Staker does not accept delgation');

    await mineToNextEpoch();
    epoch = await getEpoch();

    const delegatedStake = tokenAmount('10');
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);
    const sToken = await stakedToken.attach(staker.tokenAddress);
    await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
    await stakeManager.connect(signers[5]).delegate(epoch, stakerId, delegatedStake);
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);
    assertBNEqual(staker.stake, tokenAmount('1010'), 'Change in stake is incorrect');
    assertBNEqual(await sToken.balanceOf(signers[5].address), delegatedStake, 'Amount of minted sRzR is not correct');

    // staker remains inactive for more than GRACE_PERIOD time and gets inactivity penalties
    for (let i = 1; i <= 100; i++) {
      await mineToNextEpoch();
    }

    await mineToNextState();
    await mineToNextEpoch();
    epoch = await getEpoch();

    // commiting to get inactivity penalties

    const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const commitment2 = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[7]).commit(epoch, commitment2);

    // delegator unstakes its stake
    await mineToNextEpoch();
    epoch = await getEpoch();
    const stakerIdAcc5 = await stakeManager.getStaker(5);
    const sToken2 = await stakedToken.attach(stakerIdAcc5.tokenAddress);
    const amount = (await sToken2.balanceOf(stakerIdAcc5._address)); // unstaking total amount

    await stakeManager.connect(signers[5]).unstake(epoch, stakerIdAcc5.id, amount);
    const lock = await stakeManager.locks(signers[5].address, stakerIdAcc5.tokenAddress);
    assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

    // staker will not able to participate again because it's stake is now less than minimum stake
    epoch = await getEpoch();
    const votes3 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const commitment3 = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes3, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );

    await voteManager.connect(signers[7]).commit(epoch, commitment3);

    await mineToNextState();
    const tx = voteManager.connect(signers[7]).reveal(epoch, votes3,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await assertRevert(tx, 'not committed in this epoch');
  }).timeout(400000);

  it('Front-Run Unstake Call', async function () {
    // If the attacker can call unstake though they don't want to withdraw and withdraw anytime after withdraw after period is passed
    let epoch = await getEpoch();
    const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

    const commitment = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[1]).commit(epoch, commitment);

    await mineToNextState();

    await voteManager.connect(signers[1]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await mineToNextState();

    const stakerId = await stakeManager.stakerIds(signers[1].address);
    let staker = await stakeManager.getStaker(stakerId);

    const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
    const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
    const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    await blockManager.connect(signers[1]).propose(epoch,
      medians,
      iteration,
      biggestInfluencerId);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();
    epoch = await getEpoch();

    staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);

    const amount = (await sToken.balanceOf(staker._address));

    await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);

    // skip to last epoch of the lock period
    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const withdrawWithin = await stakeManager.withdrawReleasePeriod();

    for (let i = 0; i < withdrawWithin + 1; i++) {
      await mineToNextEpoch();
    }

    epoch = await getEpoch();
    const tx = stakeManager.connect(signers[1]).withdraw(epoch, staker.id);
    assertRevert(tx, 'Release Period Passed');

    staker = await stakeManager.getStaker(1);
    let lock = await stakeManager.locks(signers[1].address, staker.tokenAddress);
    const extendLockPenalty = await stakeManager.extendLockPenalty();
    let lockedAmount = lock.amount;
    const penalty = ((lockedAmount).mul(extendLockPenalty)).div(100);
    lockedAmount = lockedAmount.sub(penalty);
    staker = await stakeManager.getStaker(1);
    await stakeManager.connect(signers[1]).extendLock(staker.id);
    staker = await stakeManager.getStaker(1);
    lock = await stakeManager.locks(signers[1].address, staker.tokenAddress);
    epoch = await getEpoch();
    assertBNEqual((lock.amount), (lockedAmount), 'Stake is not equal to calculated stake');
    assertBNEqual(epoch, lock.withdrawAfter, 'new sToken balance is not equal to calculated sToken balance');
  });
  it('Staker unstakes and in withdraw lock period, there is a change in governance parameter and withdraw lock period is reduced', async function () {
    let epoch = await getEpoch();
    const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

    const commitment = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[1]).commit(epoch, commitment);

    await mineToNextState();

    await voteManager.connect(signers[1]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await mineToNextState();

    const stakerId = await stakeManager.stakerIds(signers[1].address);
    let staker = await stakeManager.getStaker(stakerId);

    const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
    const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
    const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    await blockManager.connect(signers[1]).propose(epoch,
      medians,
      iteration,
      biggestInfluencerId);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();
    epoch = await getEpoch();

    staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);

    const amount = (await sToken.balanceOf(staker._address)).div(toBigNumber('2'));

    await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
    const tx = stakeManager.connect(signers[1]).withdraw(epoch, staker.id);
    await assertRevert(tx, 'Withdraw epoch not reached');

    await mineToNextEpoch();
    epoch = await getEpoch();
    await stakeManager.connect(signers[1]).withdraw(epoch, staker.id);

    await governance.setWithdrawLockPeriod(0); // decreased the withdraw lock period

    await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
    await stakeManager.connect(signers[1]).withdraw(epoch, staker.id);
  });
  it('Staker unstakes and in withdraw release period, there is a change in governance parameter and withdraw release period is reduced', async function () {
    let epoch = await getEpoch();
    const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

    const commitment = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[1]).commit(epoch, commitment);

    await mineToNextState();

    await voteManager.connect(signers[1]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await mineToNextState();

    const stakerId = await stakeManager.stakerIds(signers[1].address);
    let staker = await stakeManager.getStaker(stakerId);

    const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
    const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
    const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    await blockManager.connect(signers[1]).propose(epoch,
      medians,
      iteration,
      biggestInfluencerId);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();
    epoch = await getEpoch();

    staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);

    const amount = (await sToken.balanceOf(staker._address));

    await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);

    // skip to last epoch of the lock period
    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    await governance.setWithdrawReleasePeriod(2); // withdraw release period is increased
    epoch = await getEpoch();
    await stakeManager.connect(signers[1]).withdraw(epoch, staker.id);
  });
});
