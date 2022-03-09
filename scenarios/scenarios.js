const {
  getState, adhocCommit, adhocReveal, getData, adhocPropose,
} = require('../test/helpers/utils');
const {
  COLLECTION_MODIFIER_ROLE,
  GRACE_PERIOD,
  WITHDRAW_LOCK_PERIOD,
  UNSTAKE_LOCK_PERIOD,
  GOVERNER_ROLE,
  WITHDRAW_INITIATION_PERIOD,
  BURN_ADDRESS,
  BASE_DENOMINATOR,
} = require('../test/helpers/constants');
const {
  assertBNEqual,
  assertBNLessThan,
  assertRevert,
  mineToNextEpoch,
  restoreSnapshot,
  takeSnapshot,
  mineToNextState,
} = require('../test/helpers/testHelpers');
const { setupContracts } = require('../test/helpers/testSetup');
const {
  calculateDisputesData,
  getEpoch,
  tokenAmount,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
  getCollectionIdPositionInBlock,
} = require('../test/helpers/utils');
const { proposeWithDeviation, commit, reveal } = require('../test/helpers/InternalEngine');

describe('Scenarios', async () => {
  let signers;
  let snapShotId;
  let blockManager;
  let collectionManager;
  let stakeManager;
  let voteManager;
  let initializeContracts;
  let razor;
  let blockReward;
  let stakedToken;
  let governance;

  let stakes = [];

  const medians = [5906456, 402349, 5914274, 402337, 5907868, 401854, 5877418, 399082, 5906773];
  const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  before(async () => {
    ({
      blockManager, razor, governance, voteManager, collectionManager, stakeManager, initializeContracts, stakedToken,
    } = await setupContracts());
    signers = await ethers.getSigners();
    blockReward = await blockManager.blockReward();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
    await Promise.all(await initializeContracts());
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

    while (Number(await getState()) !== 4) { await mineToNextState(); }

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
    await razor.transfer(signers[2].address, razors);
    await razor.transfer(signers[3].address, razors);
    await razor.transfer(signers[4].address, razors);
    await razor.transfer(signers[5].address, razors);

    await governance.connect(signers[0]).setToAssign(7);

    let stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));

    await razor.connect(signers[1]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[1]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));
    await razor.connect(signers[2]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[2]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));
    await razor.connect(signers[3]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[3]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));
    await razor.connect(signers[4]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[4]).stake(epoch, stake);
    stakes.push(stake);

    stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));
    await razor.connect(signers[5]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[5]).stake(epoch, stake);
    stakes.push(stake);
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
    stakes = [];
  });

  it('100 epochs of constant voting and participation', async () => {
    await governance.connect(signers[0]).setToAssign(7);
    const secret = [];
    secret.push('0x727d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8decbebc56bc7dec8b5555c0823ea4ececececececb');
    for (let i = 1; i <= 100; i++) {
      // commit
      const epoch = await getEpoch();
      for (let j = 1; j <= 5; j++) {
        await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
      }
      await mineToNextState();
      // reveal
      for (let j = 1; j <= 5; j++) {
        await adhocReveal(signers[j], 0, voteManager);
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 5; j++) {
        await adhocPropose(signers[j], ids, medians, stakeManager, blockManager, voteManager);
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
    let secret = [];
    secret.push('0x727d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed15ce7ac8decbebc56bc7dec8b5555c0823ea4ececececececb');
    let epoch = await getEpoch();
    // commit
    for (let j = 1; j <= 5; j++) {
      await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
    }
    await mineToNextState();
    // reveal
    for (let j = 1; j <= 5; j++) {
      await adhocReveal(signers[j], 0, voteManager);
    }
    await mineToNextState();
    // propose
    for (let j = 1; j <= 5; j++) {
      await adhocPropose(signers[j], ids, medians, stakeManager, blockManager, voteManager);
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
    secret = [];
    secret.push('0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x737d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x757d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x717d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x717e5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');

    const stakeBefore = await stakeManager.getStake(5);
    for (let i = 1; i <= GRACE_PERIOD + 1; i++) {
      // commit
      const epoch = await getEpoch();
      for (let j = 1; j <= 4; j++) {
        await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
      }

      await mineToNextState();
      // reveal
      for (let j = 1; j <= 4; j++) {
        await adhocReveal(signers[j], 0, voteManager);
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 4; j++) {
        await adhocPropose(signers[j], ids, medians, stakeManager, blockManager, voteManager);
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
    await adhocCommit(medians, signers[5], 0, voteManager, collectionManager, secret[4]);
    const stakeAfter = await stakeManager.getStake(5);
    assertBNLessThan(stakeAfter, stakeBefore, 'Inactivity Penalties have not been levied');
  }).timeout(80000);

  it('Staker unstakes such that stake becomes less than minStake, minStake() is changed such that staker particpates again', async function () {
    const secret = [];
    secret.push('0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x737d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x757d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x717d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x717e5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    for (let i = 1; i <= 3; i++) {
      // commit
      const epoch = await getEpoch();
      for (let j = 1; j <= 5; j++) {
        await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
      }
      await mineToNextState();
      // reveal
      for (let j = 1; j <= 5; j++) {
        await adhocReveal(signers[j], 0, voteManager);
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 5; j++) {
        await adhocPropose(signers[j], ids, medians, stakeManager, blockManager, voteManager);
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

    await mineToNextEpoch();
    let epoch = await getEpoch();
    // we're doing a unstake such that stake becomes less than the minStake
    for (let i = 1; i <= 5; i++) {
      const staker = await stakeManager.getStaker(i);
      const sToken = await stakedToken.attach(staker.tokenAddress);

      const amount = (await sToken.balanceOf(staker._address));
      await sToken.connect(signers[i]).approve(stakeManager.address, amount.sub(minStake).add(tokenAmount('100')));
      await stakeManager.connect(signers[i]).unstake(i, amount.sub(minStake).add(tokenAmount('100')));
    }
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    epoch = await getEpoch();
    for (let i = 1; i <= 5; i++) {
      const staker = await stakeManager.getStaker(i);
      await stakeManager.connect(signers[i]).initiateWithdraw(i);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress, 1);

      assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    }
    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    epoch = await getEpoch();
    for (let i = 1; i <= 5; i++) {
      await stakeManager.connect(signers[i]).unlockWithdraw(i);
    }
    // commit
    for (let i = 1; i <= 5; i++) {
      await adhocCommit(medians, signers[i], 0, voteManager, collectionManager, secret[i - 1]);
    }
    await mineToNextState(); // reveal
    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();
      const tx = adhocReveal(signers[i], 0, voteManager);
      await assertRevert(tx, 'not committed in this epoch');
    }
    await governance.setMinStake(toBigNumber('800'));
    await governance.setMinSafeRazor(toBigNumber('500'));

    await mineToNextState();// propose
    await mineToNextState();// dispute
    await mineToNextState();// confirm
    await mineToNextState();// commit

    for (let i = 1; i <= 5; i++) {
      await adhocCommit(medians, signers[i], 0, voteManager, collectionManager, secret[i - 1]);
    }
    await mineToNextState();

    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();
      await adhocReveal(signers[i], 0, voteManager);
    }
  });

  it('Staker remains inactive for a long period of time such that stake becomes less than minStake , no participation now in network', async function () {
    const stake = tokenAmount('20000');
    await razor.transfer(signers[6].address, stake);
    let epoch = await getEpoch();
    const secret = [];
    secret.push('0x727d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x727d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    await razor.connect(signers[6]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[6]).stake(epoch, stake);
    await mineToNextEpoch();
    epoch = await getEpoch();
    // commit

    await adhocCommit(medians, signers[6], 0, voteManager, collectionManager, secret[0]);

    await mineToNextState();
    // Reveal
    await adhocReveal(signers[6], 0, voteManager);

    await mineToNextState();

    await adhocPropose(signers[6], ids, medians, stakeManager, blockManager, voteManager);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();

    for (let i = 1; i <= 100; i++) {
      await mineToNextEpoch();
    }
    epoch = await getEpoch();

    await adhocCommit(medians, signers[6], 0, voteManager, collectionManager, secret[1]);

    await mineToNextState();
    const tx = adhocReveal(signers[6], 0, voteManager);
    await assertRevert(tx, 'not committed in this epoch');
  }).timeout(400000);

  it('Staker participates and unstakes and then increase the stake again, everything should work properly', async function () {
    let epoch = await getEpoch();
    const secret = [];
    secret.push('0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x737d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x757d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x717d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x717e5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    for (let i = 1; i <= 3; i++) {
      epoch = await getEpoch();
      // commit
      for (let j = 1; j <= 5; j++) {
        await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
      }
      await mineToNextState();
      // reveal
      for (let j = 1; j <= 5; j++) {
        await adhocReveal(signers[j], 0, voteManager);
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 5; j++) {
        await adhocPropose(signers[j], ids, medians, stakeManager, blockManager, voteManager);
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

    epoch = await getEpoch();

    const staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);
    const totalSupply = await sToken.totalSupply();
    const amount = tokenAmount('1000');
    await sToken.connect(signers[1]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[1]).unstake(1, amount);
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    epoch = await getEpoch();
    await stakeManager.connect(signers[1]).initiateWithdraw(1);
    const lock = await stakeManager.locks(staker._address, staker.tokenAddress, 1);
    const rAmount = (amount.mul(staker.stake)).div(totalSupply);
    assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
    assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    await stakeManager.connect(signers[1]).unlockWithdraw(1);

    // staking again
    for (let i = 1; i <= 5; i++) {
      epoch = await getEpoch();
      const razors = tokenAmount('20000');
      await razor.transfer(signers[i].address, razors);
      const stake = tokenAmount('20000');
      await razor.connect(signers[i]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[i]).stake(epoch, stake);

      await adhocCommit(medians, signers[i], 0, voteManager, collectionManager, secret[5 - i]);
    }

    await mineToNextState();

    for (let i = 1; i <= 5; i++) {
      await adhocReveal(signers[i], 0, voteManager);
    }
  });
  it('Staker particpates with delegator and later delegator withdraws such that stakers stake becomes less than minStake', async function () {
    // staker participating in netwrok
    const stake = tokenAmount('20000');
    await razor.transfer(signers[7].address, stake);
    let epoch = await getEpoch();
    const secret = [];
    secret.push('0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x737d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x757d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x717d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');

    await razor.connect(signers[7]).approve(stakeManager.address, stake);
    await stakeManager.connect(signers[7]).stake(epoch, stake);

    // delegator delegates it's stake to staker
    const commRate = 6;
    await stakeManager.connect(signers[7]).updateCommission(commRate);
    let stakerId = await stakeManager.stakerIds(signers[7].address);
    let staker = await stakeManager.getStaker(stakerId);
    assertBNEqual(staker.commission, commRate, 'Commission rate is not equal to requested set rate ');

    await stakeManager.connect(signers[7]).setDelegationAcceptance('true');
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);

    // await mineToNextState();
    await mineToNextEpoch();
    epoch = await getEpoch();
    // Participation In Epoch as delegators cant delegate to a staker untill they participate
    await adhocCommit(medians, signers[7], 0, voteManager, collectionManager, secret[1]);
    await mineToNextState();
    await adhocReveal(signers[7], 0, voteManager);
    await mineToNextState();
    await mineToNextState();
    await mineToNextState();
    await mineToNextEpoch();
    const { acceptDelegation } = staker;
    assert.strictEqual(acceptDelegation, true, 'Staker does not accept delgation');

    await mineToNextEpoch();
    epoch = await getEpoch();
    const delegatedStake = tokenAmount('100');
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);
    const stakeBefore = staker.stake;
    const sToken = await stakedToken.attach(staker.tokenAddress);
    await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
    await stakeManager.connect(signers[5]).delegate(stakerId, delegatedStake);
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);
    const toAssert = stakeBefore.add(delegatedStake);
    assertBNEqual(staker.stake, toAssert, 'Change in stake is incorrect');
    assertBNEqual(await sToken.balanceOf(signers[5].address), delegatedStake, 'Amount of minted sRzR is not correct');

    // staker remains inactive for more than GRACE_PERIOD time and gets inactivity penalties
    for (let i = 1; i <= 100; i++) {
      await mineToNextEpoch();
    }

    await mineToNextState();
    await mineToNextEpoch();
    epoch = await getEpoch();

    // commiting to get inactivity penalties

    await adhocCommit(medians, signers[7], 0, voteManager, collectionManager, secret[2]);

    // delegator unstakes its stake
    await mineToNextEpoch();
    epoch = await getEpoch();
    const stakerIdAcc5 = await stakeManager.getStaker(5);
    const sToken2 = await stakedToken.attach(stakerIdAcc5.tokenAddress);
    const amount = (await sToken2.balanceOf(stakerIdAcc5._address)); // unstaking total amount
    await sToken2.connect(signers[5]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[5]).unstake(stakerIdAcc5.id, amount);
    const lock = await stakeManager.locks(signers[5].address, stakerIdAcc5.tokenAddress, 0);
    assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

    // staker will not able to participate again because it's stake is now less than minimum stake
    stakerId = await stakeManager.stakerIds(signers[7].address);
    staker = await stakeManager.getStaker(stakerId);
    epoch = await getEpoch();
    await adhocCommit(medians, signers[7], 0, voteManager, collectionManager, secret[3]);
    await mineToNextState();
    const tx = adhocReveal(signers[7], 0, voteManager);
    await assertRevert(tx, 'not committed in this epoch');
  }).timeout(400000);

  it('Front-Run Unstake Call', async function () {
    // If the attacker can call unstake though they don't want to withdraw and withdraw anytime after withdraw after period is passed
    const secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);

    await mineToNextState();

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState();
    await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();

    const staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);

    const amount = (await sToken.balanceOf(staker._address));
    await sToken.connect(signers[1]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[1]).unstake(1, amount);

    // skip to last epoch of the lock period
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const withdrawWithin = await stakeManager.withdrawInitiationPeriod();

    for (let i = 0; i < withdrawWithin + 1; i++) {
      await mineToNextEpoch();
    }

    const tx = stakeManager.connect(signers[1]).initiateWithdraw(staker.id);
    await assertRevert(tx, 'Initiation Period Passed');
  });
  it('Front-Run Recurring Unstake call', async function () {
    // If the attacker can call unstake though they don't want to withdraw and withdraw anytime after withdraw after period is passed
    let epoch = await getEpoch();
    const secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);

    await mineToNextState();

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState();

    await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();
    epoch = await getEpoch();

    let staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);

    const amount = (await sToken.balanceOf(staker._address));
    await sToken.connect(signers[1]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[1]).unstake(1, amount);

    // skip to last epoch of the lock period
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const withdrawWithin = await stakeManager.withdrawInitiationPeriod();

    for (let i = 0; i < withdrawWithin + 1; i++) {
      await mineToNextEpoch();
    }

    epoch = await getEpoch();
    const tx = stakeManager.connect(signers[1]).initiateWithdraw(staker.id);
    await assertRevert(tx, 'Initiation Period Passed');

    staker = await stakeManager.getStaker(1);
    let lock = await stakeManager.locks(signers[1].address, staker.tokenAddress, 0);
    const extendUnstakeLockPenalty = await stakeManager.extendUnstakeLockPenalty();
    let lockedAmount = lock.amount;
    const penalty = ((lockedAmount).mul(extendUnstakeLockPenalty)).div(100);
    lockedAmount = lockedAmount.sub(penalty);
    staker = await stakeManager.getStaker(1);
    await stakeManager.connect(signers[1]).extendUnstakeLock(staker.id);
    staker = await stakeManager.getStaker(1);
    lock = await stakeManager.locks(signers[1].address, staker.tokenAddress, 0);
    epoch = await getEpoch();
    assertBNEqual((lock.amount), (lockedAmount), 'Stake is not equal to calculated stake');
    assertBNEqual(epoch, lock.unlockAfter, 'lock.withdrawAfter assigned incorrectly');
  });
  it('Staker unstakes and in withdraw lock period, there is a change in governance parameter and withdraw lock period is reduced', async function () {
    const secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);

    await mineToNextState();

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState();

    await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();

    const staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);

    const amount = (await sToken.balanceOf(staker._address)).div(toBigNumber('2'));
    await sToken.connect(signers[1]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[1]).unstake(1, amount);
    const tx = stakeManager.connect(signers[1]).initiateWithdraw(staker.id);
    await assertRevert(tx, 'Withdraw epoch not reached');
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    await stakeManager.connect(signers[1]).initiateWithdraw(staker.id);
    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    await stakeManager.connect(signers[1]).unlockWithdraw(staker.id);

    await governance.setWithdrawLockPeriod(0); // decreased the withdraw lock period
    await sToken.connect(signers[1]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[1]).unstake(1, amount);
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    await stakeManager.connect(signers[1]).initiateWithdraw(staker.id);
    await stakeManager.connect(signers[1]).unlockWithdraw(staker.id);
  });
  it('Staker unstakes and in withdraw release period, there is a change in governance parameter and withdraw release period is reduced', async function () {
    const secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);

    await mineToNextState();

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState();
    await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);

    await mineToNextState();
    // dispute
    await mineToNextState();
    // confirm

    await mineToNextEpoch();

    const staker = await stakeManager.getStaker(1);
    const sToken = await stakedToken.attach(staker.tokenAddress);

    const amount = (await sToken.balanceOf(staker._address)).div(toBigNumber('2'));
    await sToken.connect(signers[1]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[1]).unstake(1, amount);

    // skip to last epoch of the lock period
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    for (let i = 0; i < WITHDRAW_INITIATION_PERIOD - 1; i++) {
      await mineToNextEpoch();
    }
    await stakeManager.connect(signers[1]).initiateWithdraw(staker.id);

    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    await stakeManager.connect(signers[1]).unlockWithdraw(staker.id);

    await governance.setWithdrawInitiationPeriod(2); // withdraw release period is decreased
    await sToken.connect(signers[1]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[1]).unstake(1, amount);
    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }
    // Withdraw should fail
    for (let i = 0; i < WITHDRAW_INITIATION_PERIOD - 1; i++) {
      await mineToNextEpoch();
    }
    const tx = stakeManager.connect(signers[1]).initiateWithdraw(staker.id);
    await assertRevert(tx, 'Initiation Period Passed');
  });
  it('BlockReward changes both before or after confirming block, check for block reward', async () => {
    let secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);

    await mineToNextState(); // reveal

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState(); // propose
    const stakerId = await stakeManager.stakerIds(signers[1].address);
    await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);

    await mineToNextState(); // dispute
    const stakeBefore = await stakeManager.getStake(stakerId);
    await governance.connect(signers[0]).setBlockReward(tokenAmount('200'));

    await mineToNextState(); // confirm
    await blockManager.connect(signers[1]).claimBlockReward();
    const stakeAfter = await stakeManager.getStake(stakerId);

    assertBNEqual(stakeAfter, stakeBefore.add(tokenAmount('200')), 'Block Reward not given correctly');

    await mineToNextEpoch();

    secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555ebec0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);

    await mineToNextState(); // reveal

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState(); // propose
    await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm
    await blockManager.connect(signers[1]).claimBlockReward();
    await governance.connect(signers[0]).setBlockReward(tokenAmount('300'));

    await mineToNextEpoch();

    secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555ebec0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);

    await mineToNextState(); // reveal

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState(); // propose
    await adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);

    await mineToNextState(); // dispute
    const stakeBefore1 = await stakeManager.getStake(stakerId);

    await mineToNextState(); // confirm
    await blockManager.connect(signers[1]).claimBlockReward();
    const stakeAfter1 = await stakeManager.getStake(stakerId);

    assertBNEqual(stakeAfter1, stakeBefore1.add(tokenAmount('300')), 'Block Reward not given correctly');
  }).timeout(5000);

  it('Staker will not be able to reveal if minstake increases to currentStake of staker during reveal state', async () => {
    const secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8ebc555c0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);
    await mineToNextState(); // reveal
    // const updateMinStakeTo = stake.add(tokenAmount('100'));
    await governance.connect(signers[0]).setMinStake(tokenAmount('1000000'));
    const tx = adhocReveal(signers[1], 0, voteManager);
    await assertRevert(tx, 'stake below minimum');
    await governance.connect(signers[0]).setMinStake(tokenAmount('20000'));
  }).timeout(5000);

  it('Minstake increases more than currentStake of staker during propose states', async () => {
    // staker should not be able to propose
    const secret = '0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8ebc555c0823ea4ecececececec';
    await adhocCommit(medians, signers[1], 0, voteManager, collectionManager, secret);
    // const stakerId = await stakeManager.stakerIds(signers[1].address);
    // const stake = await stakeManager.getStaker(stakerId);

    await mineToNextState(); // reveal
    // const updateMinStakeTo = stake.add(tokenAmount('100'));

    await adhocReveal(signers[1], 0, voteManager);

    await mineToNextState(); // propose
    await governance.connect(signers[0]).setMinStake(tokenAmount('1000000'));
    const tx = adhocPropose(signers[1], ids, medians, stakeManager, blockManager, voteManager);
    await assertRevert(tx, 'stake below minimum stake');
  }).timeout(2000);

  it('Staker can jump the queue at the time of block proposal', async function () {
    let i = 0;
    let epoch;
    while (i <= 9) {
      epoch = await getEpoch();
      const secret = [];
      secret.push('0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
      secret.push('0x737d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
      secret.push('0x757d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
      secret.push('0x717d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
      secret.push('0x717e5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
      // commit
      for (let j = 1; j <= 5; j++) {
        // epoch = await getEpoch();
        await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
      }
      await mineToNextState();
      // reveal
      for (let j = 1; j <= 5; j++) {
        await adhocReveal(signers[j], 0, voteManager);
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 5; j++) {
        await adhocPropose(signers[j], ids, medians, stakeManager, blockManager, voteManager);
      }

      const proposedBlocksLength = await blockManager.getNumProposedBlocks(epoch);

      for (let i = 0; i < proposedBlocksLength - 1; i++) {
        const sortedProposedBlockId1 = await blockManager.sortedProposedBlockIds(epoch, i);
        if (sortedProposedBlockId1 === 4 && i + 1 < 4) {
          const sortedProposedBlock1 = await blockManager.proposedBlocks(epoch, sortedProposedBlockId1);
          const sortedProposedBlockId2 = await blockManager.sortedProposedBlockIds(epoch, i + 1);
          const sortedProposedBlock2 = await blockManager.proposedBlocks(epoch, sortedProposedBlockId2);
          assertBNLessThan(sortedProposedBlock1.iteration, sortedProposedBlock2.iteration, 'Staker jumps the queue');
        }
      }
      await mineToNextState();
      await mineToNextState(); // confirm
      const blockId = await blockManager.sortedProposedBlockIds(epoch, 0);
      const block = await blockManager.proposedBlocks(epoch, blockId);
      const { proposerId } = block;
      await blockManager.connect(signers[proposerId]).claimBlockReward();
      await mineToNextEpoch();
      i++;
    }
  }).timeout(50000);

  it('Passing loaclly calculated median for proposing and everything works fine', async function () {
    await governance.connect(signers[0]).setToAssign(7);
    const epoch = await getEpoch();
    const secret = [];
    secret.push('0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x737d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x757d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x717d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x717e5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    // commit
    for (let j = 1; j <= 5; j++) {
      await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
    }
    await mineToNextState();
    // reveal
    for (let j = 1; j <= 5; j++) {
      await adhocReveal(signers[j], 0, voteManager);
    }
    await mineToNextState();// propose
    // calculating median
    const mediansArray = [];
    for (let i = 1; i <= 5; i++) {
      const helper = [];
      const data = await getData(signers[i]);
      let { seqAllotedCollections } = data;
      const numActiveCollections = await collectionManager.getNumActiveCollections();
      for (let k = 0; k < numActiveCollections; k++) helper[k] = 0;
      for (let i = 0; i < 7; i++) { // [4,5,6,3,2,1,1]
        const medianIndex = seqAllotedCollections[i];
        const median = await calculateDisputesData(medianIndex,
          voteManager,
          stakeManager,
          collectionManager,
          epoch);
        helper[medianIndex] = median.median;
      }
      mediansArray.push(helper);
      seqAllotedCollections = [];
    }
    const ids = await collectionManager.getActiveCollections();
    for (let j = 1; j <= 5; j++) {
      const stakerId = await stakeManager.stakerIds(signers[j].address);
      const staker = await stakeManager.getStaker(stakerId);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      await blockManager.connect(signers[j]).propose(epoch,
        ids,
        mediansArray[j - 1],
        iteration,
        biggestStakerId);
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
  });

  it('Passing locally calculated median for proposing and disputing by a staker, dispute should work fine', async function () {
    await governance.connect(signers[0]).setToAssign(7);
    await commit(signers[1], 0, voteManager, collectionManager, '0x127d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', blockManager);
    await commit(signers[2], 0, voteManager, collectionManager, '0x827d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', blockManager);
    await commit(signers[3], 0, voteManager, collectionManager, '0x327d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd', blockManager);
    await mineToNextState();

    await reveal(signers[1], 0, voteManager, stakeManager);
    await reveal(signers[2], 0, voteManager, stakeManager);
    await reveal(signers[3], 0, voteManager, stakeManager);
    await mineToNextState();

    await proposeWithDeviation(signers[2], 10, stakeManager, blockManager, voteManager, collectionManager);
    await mineToNextState();
    // Give Sorted and FinaliseDispute on revealed asset.
    let epoch = await getEpoch();
    const data = await getData(signers[1]);
    const validActiveCollectionIndexToBeDisputed = (data.seqAllotedCollections)[0];
    const {
      sortedValues,
    } = await calculateDisputesData(validActiveCollectionIndexToBeDisputed,
      voteManager,
      stakeManager,
      collectionManager,
      epoch);
    await blockManager.connect(signers[4]).giveSorted(epoch, validActiveCollectionIndexToBeDisputed, sortedValues);

    epoch = await getEpoch();
    const stakerIdAccount = await stakeManager.stakerIds(signers[2].address);
    const stakeBeforeAcc2 = (await stakeManager.getStaker(stakerIdAccount)).stake;
    const balanceBeforeBurn = await razor.balanceOf(BURN_ADDRESS);

    const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
      signers[4], blockManager, collectionManager);
    await blockManager.connect(signers[4]).finalizeDispute(epoch, 0, collectionIndexInBlock);

    const slashNums = await stakeManager.slashNums();
    const bountySlashNum = slashNums[0];
    const burnSlashNum = slashNums[1];
    const keepSlashNum = slashNums[2];
    const amountToBeBurned = stakeBeforeAcc2.mul(burnSlashNum).div(BASE_DENOMINATOR);
    const bounty = stakeBeforeAcc2.mul(bountySlashNum).div(BASE_DENOMINATOR);
    const amountTobeKept = stakeBeforeAcc2.mul(keepSlashNum).div(BASE_DENOMINATOR);
    const slashPenaltyAmount = amountToBeBurned.add(bounty).add(amountTobeKept);
    assertBNEqual((await stakeManager.getStaker(stakerIdAccount)).stake, stakeBeforeAcc2.sub(slashPenaltyAmount), 'staker did not get slashed');

    // Bounty should be locked
    assertBNEqual(await stakeManager.bountyCounter(), toBigNumber('1'));
    const bountyLock = await stakeManager.bountyLocks(toBigNumber('1'));
    epoch = await getEpoch();
    assertBNEqual(bountyLock.bountyHunter, signers[4].address);
    assertBNEqual(bountyLock.redeemAfter, epoch + WITHDRAW_LOCK_PERIOD);
    assertBNEqual(bountyLock.amount, bounty);

    assertBNEqual(await razor.balanceOf(BURN_ADDRESS), balanceBeforeBurn.add(amountToBeBurned));

    const balanceBeforeAcc4 = await razor.balanceOf(signers[4].address);
    // Shouldnt be reedemable before withdrawlock period
    const tx = stakeManager.connect(signers[4]).redeemBounty(toBigNumber('1'));
    await assertRevert(tx, 'Redeem epoch not reached');
    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    // Anyone shouldnt be able to redeem someones elses bounty
    const tx1 = stakeManager.connect(signers[3]).redeemBounty(toBigNumber('1'));
    await assertRevert(tx1, 'Incorrect Caller');

    // Should able to redeem
    await stakeManager.connect(signers[4]).redeemBounty(toBigNumber('1'));
    assertBNEqual(await razor.balanceOf(signers[4].address), balanceBeforeAcc4.add(bountyLock.amount), 'disputer did not get bounty');

    // Should not able to redeem again
    const tx2 = stakeManager.connect(signers[4]).redeemBounty(toBigNumber('1'));
    await assertRevert(tx2, 'Incorrect Caller');
  });

  it('Delegator delegates to a staker and staker participates in network, delegator gets rewarded at time of withdraw', async function () {
    let epoch = await getEpoch();
    const secret = [];
    secret.push('0x747d5c9e6d18ed15ce7ac8decececbcbcbcbc8555555c0823ea4ecececececec');
    secret.push('0x737d5c9e6d18ed1ebcebcebcebcebc8a0e9418555555c0823ea4ecececececec');
    secret.push('0x757d5c9e6d18ed15ce7ac8dececece8abcbcbcbcbcbcbcb23ea4ecececececec');
    secret.push('0x717d5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    secret.push('0x717e5c9e6d18ed15ce7ac8dbcbcbcbcbcbcbcbc55555c0823ea4ecececececec');
    // commit
    for (let j = 1; j <= 5; j++) {
      await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
    }
    await mineToNextState();
    // reveal
    for (let j = 1; j <= 5; j++) {
      await adhocReveal(signers[j], 0, voteManager);
    }
    await mineToNextState();// propose
    const ids = await collectionManager.getActiveCollections();

    for (let j = 1; j <= 5; j++) {
      const stakerId = await stakeManager.stakerIds(signers[j].address);
      const staker = await stakeManager.getStaker(stakerId);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      await blockManager.connect(signers[j]).propose(epoch,
        ids,
        medians,
        iteration,
        biggestStakerId);
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
    // delegator delegates it's stake to staker
    const commRate = 6;
    await stakeManager.connect(signers[3]).updateCommission(commRate);
    let stakerId = await stakeManager.stakerIds(signers[3].address);
    let staker = await stakeManager.getStaker(stakerId);
    assertBNEqual(staker.commission, commRate, 'Commission rate is not equal to requested set rate ');

    await stakeManager.connect(signers[3]).setDelegationAcceptance('true');
    stakerId = await stakeManager.stakerIds(signers[3].address);
    staker = await stakeManager.getStaker(stakerId);

    await mineToNextState();
    await mineToNextEpoch();

    const { acceptDelegation } = staker;
    assert.strictEqual(acceptDelegation, true, 'Staker does not accept delgation');

    await mineToNextEpoch();
    epoch = await getEpoch();

    const delegatedStake = tokenAmount('1000');
    stakerId = await stakeManager.stakerIds(signers[3].address);
    staker = await stakeManager.getStaker(stakerId);
    const { stake } = staker;

    let sToken = await stakedToken.attach(staker.tokenAddress);
    await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
    await stakeManager.connect(signers[5]).delegate(stakerId, delegatedStake);
    stakerId = await stakeManager.stakerIds(signers[3].address);
    staker = await stakeManager.getStaker(stakerId);
    let totalSupply = await sToken.totalSupply();
    const srzrsMinted = ((delegatedStake).mul(totalSupply)).div(staker.stake);
    assertBNEqual(staker.stake.sub(stake), delegatedStake, 'Change in stake is incorrect');
    assertBNEqual(await sToken.balanceOf(signers[5].address), srzrsMinted, 'Amount of minted sRzR is not correct');

    // staker participating for 50 epochs for reward
    for (let i = 1; i <= 50; i++) {
      epoch = await getEpoch();
      // commit
      for (let j = 1; j <= 5; j++) {
        await adhocCommit(medians, signers[j], 0, voteManager, collectionManager, secret[j - 1]);
      }
      await mineToNextState();
      // reveal
      for (let j = 1; j <= 5; j++) {
        await adhocReveal(signers[j], 0, voteManager);
      }
      await mineToNextState();
      // propose
      for (let j = 1; j <= 5; j++) {
        await adhocPropose(signers[j], ids, medians, stakeManager, blockManager, voteManager);
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
    // Delagator unstakes
    epoch = await getEpoch();
    staker = await stakeManager.getStaker(stakerId);
    const stakerPrevBalance = await razor.balanceOf(staker._address);
    const prevStake = (staker.stake);
    sToken = await stakedToken.attach(staker.tokenAddress);
    const amount = await sToken.balanceOf(signers[5].address);
    await sToken.connect(signers[5]).approve(stakeManager.address, amount);
    await stakeManager.connect(signers[5]).unstake(staker.id, amount);
    let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 0);
    assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
    assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

    for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    totalSupply = await sToken.totalSupply();
    const rAmount = (amount.mul(staker.stake)).div(totalSupply);
    epoch = await getEpoch();
    const { initial } = lock;
    await stakeManager.connect(signers[5]).initiateWithdraw(staker.id);
    lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 1);
    const newStake = prevStake.sub(rAmount);
    staker = await stakeManager.getStaker(stakerId);

    assertBNEqual((staker.stake), (newStake), 'Updated stake is not equal to calculated stake');
    assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
    assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    // Delegator withdraws
    epoch = await getEpoch();
    const prevBalance = await razor.balanceOf(signers[5].address);
    await (stakeManager.connect(signers[5]).unlockWithdraw(staker.id));

    let withdawAmount = lock.amount;
    const gain = (withdawAmount.sub(initial)); // commission in accordance to gain
    const commission = ((gain).mul(staker.commission)).div(100);
    if (commission > 0) {
      withdawAmount = withdawAmount.sub(commission);
    }

    const newBalance = prevBalance.add(withdawAmount);
    const DelegatorBalance = await razor.balanceOf(signers[5].address);

    assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
    assertBNLessThan(withdawAmount, lock.amount, 'Commission Should be paid'); // gain > 0;
    assertBNEqual(await razor.balanceOf(staker._address), stakerPrevBalance.add(commission), 'Stakers should get commision'); // gain > 0

    const rAmountUnchanged = amount; // Amount to be tranferred to delegator if 1RZR = 1sRZR

    const newBalanaceUnchanged = prevBalance.add(rAmountUnchanged); // New balance of delegator after withdraw if 1RZR = 1sRZR
    assertBNLessThan(newBalanaceUnchanged, DelegatorBalance, 'Delegators should receive more amount than expected due to increase in valuation of sRZR');
  }).timeout(200000);
});
