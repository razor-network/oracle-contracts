const { utils } = require('ethers');
const {
  ASSET_MODIFIER_ROLE,
  GRACE_PERIOD,
  WITHDRAW_LOCK_PERIOD,
  STAKE_MODIFIER_ROLE,
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

  let stakes = [];

  before(async () => {
    ({
      blockManager, razor, parameters, voteManager, assetManager, stakeManager, initializeContracts, stakedToken,
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
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 9) {
      name = `test${i}`;
      await assetManager.createJob(weight, power, selectorType, name, selector, url);
      i++;
    }

    while (Number(await parameters.getState()) !== 4) { await mineToNextState(); }

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

  it('Staker participate in network and then unstakes his some amount, which makes his stake less than the minimum stake and now by using the setMinStake() minStake is changed then staker should be able to participate in network again', async function () {
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

    const minStake = await parameters.minStake();

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

    await parameters.setMinStake(toBigNumber('800'));

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

  it('Staker partcipating in network and then remains inactive for long time such that stake becomes less than the minimum stake, then staker should not be able to participate in network', async function () {
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

  it('Staker participates in network and then unstakes some amount and then particpate again and increase the stake again, everything should work properly.', async function () {
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
  it('Staker should be able to participate if minStake is decreased after getting slashed', async () => {
    let epoch = await getEpoch();
    const razors = tokenAmount('444000');
    await razor.transfer(signers[6].address, razors);
    const stake = tokenAmount('442000');
    await razor.connect(signers[6]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[6]).stake(epoch, stake);
    const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const commitment = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[6]).commit(epoch, commitment);

    await mineToNextState(); // reveal
    let stakerId = await stakeManager.stakerIds(signers[6].address);
    let staker = await stakeManager.getStaker(stakerId);
    console.log(Number(staker.stake));

    await voteManager.connect(signers[6]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

    await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await parameters.setSlashParams(500, 9480, 0); // slashing only half stake
    await stakeManager.slash(epoch, stakerId, signers[6].address); // slashing signers[6]

    staker = await stakeManager.getStaker(stakerId);
    console.log(Number(staker.stake));

    await mineToNextState(); // propose

    const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
    let iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
    let medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const tx = blockManager.connect(signers[6]).propose(epoch,
      medians,
      iteration,
      biggestInfluencerId);

    await assertRevert(tx, 'stake below minimum stake');
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm
    stakerId = await stakeManager.stakerIds(signers[6].address);
    staker = await stakeManager.getStaker(stakerId);

    let amount = staker.stake;
    let newMinStake = amount.sub(tokenAmount('10'));
    await parameters.connect(signers[0]).setMinStake(newMinStake);
    await mineToNextEpoch(); // commit
    epoch = await getEpoch();
    const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const commitment1 = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[6]).commit(epoch, commitment1);
    stakerId = await stakeManager.stakerIds(signers[6].address);
    staker = await stakeManager.getStaker(stakerId);
    let commitmentAcc1 = await voteManager.getCommitment(stakerId);
    assertBNEqual(epoch, commitmentAcc1.epoch, 'Staker is not able to participate');
    await mineToNextState(); // reveal
    await voteManager.connect(signers[6]).reveal(epoch, votes,
      '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
    await mineToNextState(); // propose

    iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
    medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    await blockManager.connect(signers[6]).propose(epoch,
      medians,
      iteration,
      biggestInfluencerId);

    await mineToNextState(); // Dispute
    await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await parameters.setSlashParams(500, 9480, 0); // slashing only half stake
    await stakeManager.slash(epoch, stakerId, signers[6].address); // slashing signers[6]
    await mineToNextState(); // Confirm
    stakerId = await stakeManager.stakerIds(signers[6].address);
    staker = await stakeManager.getStaker(stakerId);
    amount = staker.stake;
    newMinStake = amount.sub(tokenAmount('1'));
    await parameters.connect(signers[0]).setMinStake(newMinStake);
    await mineToNextEpoch(); // commit

    epoch = await getEpoch();
    const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    const commitment2 = utils.solidityKeccak256(
      ['uint32', 'uint48[]', 'bytes32'],
      [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
    );
    await voteManager.connect(signers[6]).commit(epoch, commitment2);
    stakerId = await stakeManager.stakerIds(signers[6].address);
    staker = await stakeManager.getStaker(stakerId);
    commitmentAcc1 = await voteManager.getCommitment(stakerId);
    assertBNEqual(epoch, commitmentAcc1.epoch, 'Staker is not able to participate');
  });
});
