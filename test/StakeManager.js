/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const { assert } = require('chai');
const {
  DEFAULT_ADMIN_ROLE_HASH, GRACE_PERIOD, UNSTAKE_LOCK_PERIOD, COLLECTION_MODIFIER_ROLE,
  STAKE_MODIFIER_ROLE,
  WITHDRAW_LOCK_PERIOD,
  GOVERNER_ROLE,
  GOVERNANCE_ROLE,
  PAUSE_ROLE,
  WITHDRAW_INITIATION_PERIOD,
  BASE_DENOMINATOR,
} = require('./helpers/constants');
const {
  assertBNEqual,
  assertBNLessThan,
  assertBNNotEqual,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
  takeSnapshot,
  restoreSnapshot,
} = require('./helpers/testHelpers');
const {
  commit, reveal, propose, reset,
} = require('./helpers/InternalEngine');
const {
  getEpoch,
  toBigNumber,
  tokenAmount,
  maturity,
  getSecret,
} = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');

const { BigNumber } = ethers;

describe('StakeManager', function () {
  let signers;
  let snapShotId;
  let razor;
  let blockManager;
  let governance;
  let stakeManager;
  let rewardManager;
  let voteManager;
  let initializeContracts;
  let stakedToken;
  let stakedTokenFactory;
  let collectionManager;

  before(async () => {
    ({
      razor,
      blockManager,
      collectionManager,
      stakeManager,
      rewardManager,
      governance,
      voteManager,
      initializeContracts,
      stakedToken,
      stakedTokenFactory,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('RAZOR', async function () {
    it('admin role should be granted', async () => {
      const isAdminRoleGranted = await stakeManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
      assert(isAdminRoleGranted === true, 'Admin role was not Granted');
    });

    it('pause role should be granted', async () => {
      const DEFAULT_PAUSE_ROLE_HASH = PAUSE_ROLE;
      await stakeManager.grantRole(DEFAULT_PAUSE_ROLE_HASH, signers[0].address);
      const isPauseRoleGranted = await stakeManager.hasRole(DEFAULT_PAUSE_ROLE_HASH, signers[0].address);
      assert(isPauseRoleGranted === true, 'Pause role was not Granted');
    });

    it('should not be able to stake without initialization', async () => {
      const tx = stakeManager.connect(signers[6]).stake(await getEpoch(), tokenAmount('180000'));
      await assertRevert(tx, 'Contract should be initialized');
    });

    it('should not be able to initiliaze StakeManager contract without admin role', async () => {
      const tx = stakeManager.connect(signers[1]).initialize(
        razor.address,
        rewardManager.address,
        voteManager.address,
        stakedTokenFactory.address
      );
      await assertRevert(tx, 'AccessControl');
    });

    it('should be able to initialize', async function () {
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
      Cname = 'Test Collection9';
      await collectionManager.createCollection(500, 3, 1, [9, 1], Cname);

      await mineToNextEpoch();
      const stake1 = tokenAmount('443000');
      await razor.transfer(signers[1].address, stake1);
      await razor.transfer(signers[2].address, stake1);
      await razor.transfer(signers[3].address, stake1);
      await razor.transfer(signers[4].address, stake1); // Chosen Staker by the Delegator
      await razor.transfer(signers[5].address, stake1); // Delegator
      await razor.transfer(signers[6].address, stake1); // new Delegator
      await razor.transfer(signers[7].address, stake1);
      await razor.transfer(signers[8].address, stake1);
      await razor.transfer(signers[9].address, stake1);
      await razor.transfer(signers[10].address, stake1);
      await razor.transfer(signers[12].address, stake1);
      await razor.transfer(signers[17].address, stake1);
      await razor.transfer(signers[18].address, stake1);
      await razor.transfer(signers[19].address, stake1);

      snapShotId = await takeSnapshot();
    });

    it('should not allow non admin to pause', async function () {
      const tx1 = stakeManager.connect(signers[1]).pause();
      await assertRevert(tx1, 'AccessControl');
    });

    it('should not be able to stake if contract is paused', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');

      await razor.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[0]).pause();

      const tx = stakeManager.connect(signers[1]).stake(epoch, stake1);
      await assertRevert(tx, 'pause');
    });

    it('should not allow pause if already paused', async function () {
      const tx = stakeManager.connect(signers[0]).pause();
      await assertRevert(tx, 'pause');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Staker should not be able to stake if epoch is not current epoch', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');
      await razor.connect(signers[1]).approve(stakeManager.address, stake1);
      const tx = stakeManager.connect(signers[1]).stake(epoch + 1, stake1);
      await assertRevert(tx, 'incorrect epoch');
    });

    it('Staker should not be able to stake more than his rzr balance', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');
      await razor.connect(signers[1]).approve(stakeManager.address, stake1);
      const tx = stakeManager.connect(signers[1]).stake(epoch, tokenAmount('430000'));
      await assertRevert(tx, 'ERC20: insufficient allowance');
    });

    it('should be able to stake and sToken should be deployed', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');
      const age1 = 10000;
      const maturity1 = await maturity(age1);
      const influence1 = stake1.mul(toBigNumber(maturity1));

      await razor.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[1]).stake(epoch, stake1);
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.stakers(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const newAge = await stakeManager.getAge(stakerId);
      // Mint, Burn of sToken should not be accesible to anyone beside StakeManager;
      await assertRevert(sToken.mint(signers[0].address, tokenAmount('1000'), tokenAmount('1000')), 'Ownable: caller is not the owner');
      await assertRevert(sToken.burn(signers[1].address, tokenAmount('1000')), 'Ownable: caller is not the owner');

      assertBNEqual(stakerId, toBigNumber('1'));
      const numStakers = await stakeManager.numStakers();
      assertBNEqual(numStakers, toBigNumber('1'));
      assertBNEqual(staker.id, toBigNumber('1'));
      assertBNEqual(staker.stake, stake1, 'Change in stake is incorrect');
      assertBNEqual(newAge, age1, 'age is incorrect');
      assertBNEqual(await stakeManager.getEpochFirstStakedOrLastPenalized(stakerId), epoch, 'epoch staked is incorrect');
      assertBNEqual(await stakeManager.getInfluence(staker.id), influence1, 'influence is incorrect');
      assertBNEqual(await sToken.balanceOf(staker._address), stake1, 'Amount of minted sRzR is not correct');
    });

    it('should not be able to createStakedToken from zero address', async function () {
      const tx = stakedTokenFactory.createStakedToken('0x0000000000000000000000000000000000000000', 1);
      await assertRevert(tx, 'zero address check');
    });

    it('should not be able to get amount of rzr deposited if srzr exceeds balance of user', async function () {
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = tokenAmount('500000');
      const tx = sToken.getRZRDeposited(signers[1].address, amount);
      await assertRevert(tx, 'Amount Exceeds Balance');
    });

    it('should handle second staker correctly', async function () {
      const epoch = await getEpoch();
      const stake = tokenAmount('190000');

      await razor.connect(signers[2]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[2]).stake(epoch, stake);
      const stakerId = await stakeManager.stakerIds(signers[2].address);
      const staker = await stakeManager.stakers(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);

      assertBNEqual(stakerId, toBigNumber('2'));
      const numStakers = await stakeManager.numStakers();
      assertBNEqual(numStakers, toBigNumber('2'));
      assertBNEqual(staker.id, toBigNumber('2'));
      assertBNEqual(staker.stake, stake, 'Change in stake is incorrect');
      assertBNEqual(await sToken.balanceOf(staker._address), stake, 'Amount of minted sRzR is not correct');
    });

    it('getters should work as expected', async function () {
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      assertBNEqual(stakerId, await stakeManager.getStakerId(signers[1].address));
      const numStakers = await stakeManager.numStakers();
      assertBNEqual(numStakers, await stakeManager.getNumStakers());
      const staker = await stakeManager.stakers(1);
      const staker2 = await stakeManager.getStaker(1);
      assertBNEqual(staker.id, staker2.id);
      assertBNEqual(staker.stake, staker2.stake);
    });

    it('should be able to increase stake', async function () {
      const stake = tokenAmount('3000');
      const stake2 = tokenAmount('423000');
      await mineToNextEpoch();
      await razor.connect(signers[1]).approve(stakeManager.address, stake);

      const epoch = await getEpoch();
      let staker = await stakeManager.getStaker(1);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      const prevBalance = await sToken.balanceOf(staker._address);

      await stakeManager.connect(signers[1]).stake(epoch, stake);
      const sAmount = ((stake).mul(totalSupply)).div(staker.stake);

      staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, stake2, 'Change in stake is incorrect');
      assertBNEqual(await sToken.balanceOf(staker._address), prevBalance.add(sAmount), 'Amount of minted sRzR is not correct');
    });

    it('Staker should not be able to initiate withdraw if didnt unstake', async function () {
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const tx = stakeManager.connect(signers[1]).initiateWithdraw(stakerId);
      await assertRevert(tx, 'Did not unstake');
    });

    it('Staker should not be able to unlock withdraw if didnt unstake', async function () {
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const tx = stakeManager.connect(signers[1]).unlockWithdraw(stakerId);
      await assertRevert(tx, 'Did not initiate withdraw');
    });

    it('Staker should not be able to unstake zero amount', async function () {
      const amount = tokenAmount('0');
      const tx = stakeManager.connect(signers[1]).unstake(1, amount);
      await assertRevert(tx, 'Non-Positive Amount');
    });

    it('Staker should not be able to call resetUnstakeLock if lock amount is zero', async function () {
      const tx = stakeManager.connect(signers[1]).resetUnstakeLock(1);
      await assertRevert(tx, 'Unstake Lock doesnt exist');
    });

    it('Staker should not be able to unstake more than his sRZR balance', async function () {
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc1);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = await sToken.balanceOf(staker._address);
      const tx = stakeManager.connect(signers[1]).unstake(1, amount + 1);
      await assertRevert(tx, 'Invalid Amount');
    });

    it('Staker should be able to unstake when there is no existing lock', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      // we're doing a partial unstake here , though full unstake has the same procedure
      const amount = tokenAmount('200000');
      const staker = await stakeManager.getStaker(1);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await sToken.connect(signers[1]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[1]).unstake(1, amount);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(await sToken.balanceOf(stakeManager.address), amount, 'sToken not transferred to stakeManager');
      assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    });

    it('Staker should not be able to unstake when there is an existing unstake lock', async function () {
      const amount = tokenAmount('200000');
      const tx = stakeManager.connect(signers[1]).unstake(1, amount);
      await assertRevert(tx, 'Existing Unstake Lock');
    });

    it('Staker should not be able to initiate withdraw in unstake lock period', async function () {
      // skip to last epoch of the lock period
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }

      let staker = await stakeManager.getStaker(1);
      const prevStake = staker.stake;
      const tx = stakeManager.connect(signers[1]).initiateWithdraw(1);
      await assertRevert(tx, 'Withdraw epoch not reached');
      staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, prevStake, 'Stake should not change');
    });

    it('Staker should be able to initiate withdraw after lock period', async function () {
      let staker = await stakeManager.getStaker(1);

      const prevStake = staker.stake;
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      let lock = await stakeManager.locks(staker._address, staker.tokenAddress, 0);
      const rAmount = (lock.amount.mul(staker.stake)).div(totalSupply);
      await mineToNextEpoch();

      await (stakeManager.connect(signers[1]).initiateWithdraw(1));
      lock = await stakeManager.locks(staker._address, staker.tokenAddress, 1);
      staker = await stakeManager.getStaker(1);
      assertBNEqual(await sToken.balanceOf(stakeManager.address), toBigNumber('0'), 'sToken not transferred to stakeManager');
      assertBNEqual(rAmount, lock.amount, 'incorrect Amount locked');
      assertBNEqual(staker.stake.add(lock.amount), prevStake, 'Stake not reduced');
    });

    it('Staker should not be able to unstake when there is an existing withdraw lock', async function () {
      const amount = tokenAmount('200000');
      const tx = stakeManager.connect(signers[1]).unstake(1, amount);
      await assertRevert(tx, 'Existing Withdraw Lock');
    });

    it('Staker should be able to unlock withdraw after lock period', async function () {
      let staker = await stakeManager.getStaker(1);

      const prevStake = staker.stake;
      const prevBalance = await razor.balanceOf(signers[1].address);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress, 1);
      for (let i = 0; i <= WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      await (stakeManager.connect(signers[1]).unlockWithdraw(1));
      staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, prevStake, 'Stake should not change');
      assertBNEqual(prevBalance.add(lock.amount), await razor.balanceOf(signers[1].address), 'Balance should be equal');
    });

    it('should allow staker to add stake after withdraw if either withdrawnAmount is not the whole stake', async function () {
      const epoch = await getEpoch();
      const stake = tokenAmount('200000');
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const stakeBeforeAcc1 = (await stakeManager.stakers(stakerIdAcc1)).stake;
      await razor.connect(signers[1]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[1]).stake(epoch, stake); // adding stake after withdraw
      const stakeAfterAcc1 = (await stakeManager.stakers(stakerIdAcc1)).stake;
      assertBNEqual(stakeAfterAcc1, stakeBeforeAcc1.add(stake), 'Stake did not increase on staking after withdraw');
    });

    it('should not allow staker to add stake after withdrawing whole amount', async function () {
      let epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      let staker = await stakeManager.getStaker(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = await sToken.balanceOf(staker._address);
      await sToken.connect(signers[1]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[1]).unstake(1, amount);
      let lock = await stakeManager.locks(staker._address, staker.tokenAddress, 0);
      assertBNEqual(await sToken.balanceOf(staker._address), toBigNumber('0'), 'whole amount not unstaked');
      assertBNEqual(await sToken.balanceOf(stakeManager.address), amount, 'sToken not transferred to stakeManager');

      for (let i = 0; i <= UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      await stakeManager.connect(signers[1]).initiateWithdraw(1);
      lock = await stakeManager.locks(staker._address, staker.tokenAddress, 1);
      assertBNEqual(staker.stake, lock.amount, 'stake not locked');
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(await sToken.balanceOf(stakeManager.address), toBigNumber('0'), 'sToken stake not burnt');
      assertBNEqual(staker.stake, toBigNumber('0'), 'stake not removed');

      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      const prevBalance = await razor.balanceOf(staker._address);
      await mineToNextEpoch();
      epoch = await getEpoch();
      await (stakeManager.connect(signers[1]).unlockWithdraw(1));
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(await razor.balanceOf(staker._address), prevBalance.add(lock.amount), 'Balance should be equal');
      const stake = await razor.balanceOf(staker._address);
      await razor.connect(signers[1]).approve(stakeManager.address, stake);
      const tx = stakeManager.connect(signers[1]).stake(epoch, stake);
      await assertRevert(tx, 'Stakers Stake is 0');
    });

    it('Staker should not be able to unstake if his stake is zero', async function () {
      const tx = stakeManager.connect(signers[1]).unstake(1, tokenAmount('1000'));
      await assertRevert(tx, 'Nonpositive stake');
    });

    it('staker should be able to withdraw even if they have participated in the unstake and withdraw lock period', async function () {
      // @notice: Checking for Staker 2
      const stake = tokenAmount('100000');
      let epoch = await getEpoch();
      let staker = await stakeManager.getStaker(2);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await sToken.connect(signers[2]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[2]).unstake(2, stake);
      let lock = await stakeManager.locks(staker._address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, stake, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.unlockAfter, toBigNumber(epoch + UNSTAKE_LOCK_PERIOD), 'Withdraw after for the lock is incorrect');
      // Next Epoch
      await mineToNextEpoch();
      epoch = await getEpoch();
      let secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[2], 0, voteManager, stakeManager, collectionManager);

      // Next Epoch
      await mineToNextEpoch(); // propose
      epoch = await getEpoch();
      staker = await stakeManager.getStaker(2);
      const totalSupply = await sToken.totalSupply();
      const rAmount = (stake.mul(staker.stake)).div(totalSupply);
      const prevStake = staker.stake;
      await stakeManager.connect(signers[2]).initiateWithdraw(2);
      lock = await stakeManager.locks(staker._address, staker.tokenAddress, 1);
      staker = await stakeManager.getStaker(2);
      assertBNEqual(prevStake.sub(rAmount), staker.stake, 'Stake not correct');
      // Next Epoch
      await mineToNextEpoch();

      // Participation In Epoch

      epoch = await getEpoch();
      secret = await getSecret(signers[2]);
      await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[2], 0, voteManager, stakeManager, collectionManager);

      // Next Epoch
      await mineToNextEpoch();
      epoch = await getEpoch();
      const prevBalance = await razor.balanceOf(signers[2].address);
      await stakeManager.connect(signers[2]).unlockWithdraw(2);
      const newBalance = await razor.balanceOf(signers[2].address);
      assertBNEqual(prevBalance.add(rAmount), newBalance, 'Could not Withdraw');
    });

    it('should penalize staker if number of inactive epochs is greater than grace_period', async function () {
      let epoch = await getEpoch();
      const stake = tokenAmount('420000');
      await razor.connect(signers[3]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[3]).stake(epoch, stake);
      let staker = await stakeManager.getStaker(3);
      // Staker 3 stakes in epoch 13

      const epochsJumped = GRACE_PERIOD + 2;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }
      // Current Epoch is 23 . Staker 3 was inactive for 23 - 13 - 1 = 9 epochs

      // commit
      epoch = await getEpoch();
      const secret = await getSecret(signers[3]);
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);

      staker = await stakeManager.stakers(3);
      assertBNNotEqual(staker.stake, stake, 'Stake should have decreased due to penalty');
    });

    it('should penalize staker age if number of inactive epochs is greater than grace_period', async function () {
      let staker = await stakeManager.getStaker(3);
      const ageBefore = staker.age;

      const epochsJumped = GRACE_PERIOD + 2;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }

      // commit
      const secret = await getSecret(signers[3]);
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);

      staker = await stakeManager.stakers(3);
      assertBNLessThan(toBigNumber(staker.age), toBigNumber(ageBefore), 'Staker age should have decreased due to penalty');
    });

    it('Staker age should be penalized based on penaltyAgeNotRevealNum', async function () {
      const penaltyAgeNotRevealNum = await rewardManager.penaltyAgeNotRevealNum();
      const penaltyPercentage = penaltyAgeNotRevealNum / BASE_DENOMINATOR;

      await mineToNextEpoch();
      const secret = '0x727d5c9e6d18ed45ce7ac8d3cee6ec8a0e9c02481415c0823ea49d847ccb9cdd';
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

      let staker = await stakeManager.getStaker(3);
      const ageBefore = staker.age;

      const epochsJumped = GRACE_PERIOD + 2;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }
      // commit
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

      const penaltyAge = penaltyPercentage * epochsJumped * ageBefore;
      const expectedAge = Math.round(ageBefore - penaltyAge);
      staker = await stakeManager.stakers(3);

      assertBNEqual(staker.age, expectedAge, 'Staker age should decrease based on penaltyAgeNotRevealNum');
    });

    it('should not penalize staker if number of inactive epochs is smaller than / equal to grace_period', async function () {
      await mineToNextEpoch();
      let staker = await stakeManager.getStaker(3);
      const { stake } = staker;

      // Current epoch is 24.
      // Staker 3 epochLastRevealed = 23 ( previous test )
      const epochsJumped = GRACE_PERIOD;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }
      // Current epoch is 32
      // Staker 3 was inactive for 32 - 23 - 1 = 8 epochs

      // commit
      const secret = await getSecret(signers[3]);
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState(); // reveal
      // Staker is not penalised because no. of inactive epochs (8) <= max allowed inactive epochs i.e grace_period (8)
      await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
      staker = await stakeManager.stakers(3);
      assertBNEqual(staker.stake, stake, 'Stake should not change');
    });

    it('should penalize staker even if they restake and not do commit/reveal in grace_period', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
      let staker = await stakeManager.getStaker(3);

      // current epoch is 33
      const epochsJumped = GRACE_PERIOD;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      // current epoch is 41 .
      // epochLastRevealed for staker 3  = 32 ( last test)
      // Staker 3 was inactive for 41- 32 - 1 = 8 epochs.
      const stake2 = tokenAmount('23000');
      await razor.connect(signers[3]).approve(stakeManager.address, stake2);
      await stakeManager.connect(signers[3]).stake(epoch, stake2);
      // Staker 3 restakes during grace_period
      // But epochFirstStaked is not updated , this epoch would still remain be considered as an inactive epoch for staker 3 .
      // no commit/reveal in this epoch

      await mineToNextEpoch();
      epoch = await getEpoch();
      staker = await stakeManager.getStaker(3);
      const newStake = staker.stake;
      // commit in epoch 42 , outside grace_period
      const secret = await getSecret(signers[3]);
      await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
      staker = await stakeManager.getStaker(3);
      // Total no of inactive epochs = 42 - 32 - 1 = 9
      // Staker 3 is penalised because total inactive epochs(9) > max allowed inactive epochs i.e grace_period (8)
      assertBNNotEqual(staker.stake, newStake, 'Stake should have decreased due to inactivity penalty');
    });

    it('Staker should not be able to unstake,withdraw,setDelegationAcceptance,updateCommission if the staker has not staked yet',
      async function () {
        const amount = tokenAmount('100000');

        const stakerId = await stakeManager.stakerIds(signers[7].address);
        // const staker = await stakeManager.getStaker(stakerId);
        const tx1 = stakeManager.connect(signers[7]).unstake(stakerId, amount);
        await assertRevert(tx1, 'staker.id = 0');
        const tx2 = stakeManager.connect(signers[7]).initiateWithdraw(stakerId);
        await assertRevert(tx2, 'staker doesnt exist');
        const tx3 = stakeManager.connect(signers[7]).setDelegationAcceptance('true');
        await assertRevert(tx3, 'staker id = 0');
        const tx4 = stakeManager.connect(signers[7]).updateCommission(7);
        await assertRevert(tx4, 'staker id = 0');
        const tx5 = stakeManager.connect(signers[7]).unlockWithdraw(stakerId);
        await assertRevert(tx5, 'staker doesnt exist');
      });

    it('Staker should not be able to accept delegation if comission is not set', async function () {
      const tx = stakeManager.connect(signers[1]).setDelegationAcceptance('true');
      await assertRevert(tx, 'comission not set');
    });

    it('Delegator should not be able to delegate if delegation not accepted', async function () {
      const stake1 = tokenAmount('420000');
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await razor.connect(signers[4]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[4]).stake(epoch, stake1);
      const amount = tokenAmount('420000');
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      await razor.connect(signers[5]).approve(stakeManager.address, amount);
      const tx = stakeManager.connect(signers[5]).delegate(stakerId, amount);
      await assertRevert(tx, 'Delegetion not accpected');
    });

    it('Staker should not be able to updateCommission if it exceeds maximum limit', async function () {
      const commRate = await stakeManager.maxCommission();
      const tx = stakeManager.connect(signers[4]).updateCommission(commRate + 1);
      await assertRevert(tx, 'Commission exceeds maxlimit');
    });

    it('stakeManager setter functions should revert as expected', async function () {
      await stakeManager.grantRole(GOVERNANCE_ROLE, signers[1].address);
      let tx = stakeManager.connect(signers[1]).setMinSafeRazor(tokenAmount('200000'));
      await assertRevert(tx, 'minSafeRazor beyond minStake');
      tx = stakeManager.connect(signers[1]).setSlashParams(toBigNumber('500000'), toBigNumber('9500000'), toBigNumber('500000'));
      await assertRevert(tx, 'params sum exceeds denominator');
    });

    it('Staker should not be able to updateCommission if it exceeds the change limit which is delta commission', async function () {
      const deltaCommission = 3;
      await stakeManager.connect(signers[1]).updateCommission(4);
      await governance.grantRole(GOVERNER_ROLE, signers[0].address);
      await governance.connect(signers[0]).setEpochLimitForUpdateCommission(5);
      for (let i = 0; i < 5; i++) await mineToNextEpoch();
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerId);
      const currentCommission = staker.commission;
      const commission = currentCommission + deltaCommission;
      const tx = stakeManager.connect(signers[1]).updateCommission(commission + 1);
      await assertRevert(tx, 'Invalid Commission Update');
    });

    it('Staker should be able to update commission', async function () {
      let staker = await stakeManager.getStaker(4);
      const commRate = 6;
      await stakeManager.connect(signers[4]).updateCommission(commRate);
      staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.commission, commRate, 'Commission rate is not equal to requested set rate ');
    });

    it('Staker should not be able to update commission before reaching epoch limit', async function () {
      const tx = stakeManager.connect(signers[4]).updateCommission(5);
      await assertRevert(tx, 'Invalid Epoch For Updation');
    });

    it('staker should accept delegation', async function () {
      await stakeManager.connect(signers[4]).setDelegationAcceptance('true');
      const staker = await stakeManager.getStaker(4);
      // Participation In Epoch as delegators cant delegate to a staker untill they participate
      const secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
      await mineToNextEpoch();
      const { acceptDelegation } = staker;
      assert.strictEqual(acceptDelegation, true, 'Staker does not accept delgation');
    });

    it('Staker should not be able to delegate to themself', async function () {
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const tx = stakeManager.connect(signers[4]).delegate(stakerId, tokenAmount('1000'));
      await assertRevert(tx, 'Staker cannot delegate themself');
    });

    it('Delegator should not be able to delegate more than his rzr balance', async function () {
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const tx = stakeManager.connect(signers[5]).delegate(stakerId, tokenAmount('500000'));
      await assertRevert(tx, 'ERC20: insufficient allowance');
    });

    it('chosen staker should stake atleast once', async function () {
      const staker = await stakeManager.getStaker(4);
      const notAStakerId = toBigNumber('0');
      assertBNNotEqual(staker.id, notAStakerId, 'Staker did not stake even once');
    });

    it('delegator should be able to delegate stake to staker', async function () {
      await mineToNextEpoch();

      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const delegatedStake = tokenAmount('100000');
      const stake2 = tokenAmount('520000');
      let staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[5]).delegate(stakerId, delegatedStake);
      staker = await stakeManager.stakers(4);
      assertBNEqual(staker.stake, stake2, 'Change in stake is incorrect');
      assertBNEqual(await sToken.balanceOf(signers[5].address), delegatedStake, 'Amount of minted sRzR is not correct');
    });

    it('Delegator should not be able to unstake if contract is paused', async function () {
      await stakeManager.connect(signers[0]).pause();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const amount = tokenAmount('200000');
      const tx = stakeManager.connect(signers[5]).unstake(stakerId, amount);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Delegator should not be able to initiate withdraw if didnt unstake', async function () {
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const tx = stakeManager.connect(signers[5]).initiateWithdraw(stakerId);
      await assertRevert(tx, 'Did not unstake');
    });

    it('Staker should not be able to unlock withdraw if didnt unstake', async function () {
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const tx = stakeManager.connect(signers[5]).unlockWithdraw(stakerId);
      await assertRevert(tx, 'Did not initiate withdraw');
    });

    it('Delegator should be able to unstake when there is no existing lock', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
      const amount = tokenAmount('10000'); // unstaking partial amount
      let staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await sToken.connect(signers[5]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[5]).unstake(staker.id, amount);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 0);
      const prevStake = staker.stake;
      const totalSupply = await sToken.totalSupply();
      const rAmount = (amount.mul(staker.stake)).div(totalSupply);
      await stakeManager.connect(signers[5]).initiateWithdraw(staker.id);
      staker = await stakeManager.getStaker(4);

      lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 1);
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(prevStake.sub(lock.amount), staker.stake, 'Stake not reduced');
      assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    });

    it('Delegator should not be able to unstake when there is an existing lock', async function () {
      const amount = tokenAmount('10000');
      const staker = await stakeManager.getStaker(4);
      const tx = stakeManager.connect(signers[5]).unstake(staker.id, amount);
      await assertRevert(tx, 'Existing Withdraw Lock');
    });

    it('Delegator should not be able to withdraw in withdraw lock period', async function () {
      // skip to last epoch of the lock period
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }
      const staker = await stakeManager.getStaker(4);
      const tx = stakeManager.connect(signers[5]).unlockWithdraw(staker.id);
      await assertRevert(tx, 'Withdraw epoch not reached');
    });

    it('Delegator should not be able to withdraw if contract is paused', async function () {
      await mineToNextEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[5]).unlockWithdraw(stakerId);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Delegator should be able to withdraw after withdraw lock period', async function () {
      const staker = await stakeManager.getStaker(4);
      const prevBalance = await razor.balanceOf(signers[5].address);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 1);

      await (stakeManager.connect(signers[5]).unlockWithdraw(staker.id));
      const DelegatorBalance = await razor.balanceOf(signers[5].address);
      const newBalance = prevBalance.add(lock.amount);

      assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
    });

    it('Delegators should receive more amount than expected after withdraw due to increase in valuation of sRZR when chosen staker is rewarded',
      async function () {
        await mineToNextEpoch();
        let epoch = await getEpoch();
        let staker = await stakeManager.getStaker(4);

        // commit
        epoch = await getEpoch();
        const secret = await getSecret(signers[4]);
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

        await mineToNextState(); // reveal
        await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
        // propose
        await mineToNextState();
        await propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);
        await reset();
        const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
        assertBNEqual(proposedBlock.proposerId, toBigNumber('4'), 'incorrect proposalID'); // 4th staker proposed

        staker = await stakeManager.getStaker(4);
        const stakeBefore = staker.stake;
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[4]).claimBlockReward();
        await mineToNextState(); // commit again in order to get block reward
        epoch = await getEpoch();
        staker = await stakeManager.getStaker(4);
        const stakeAfter = staker.stake;
        assertBNLessThan(stakeBefore, stakeAfter, 'Not rewarded'); // Staker 4 gets Block Reward results in increase of valuation of sRZR
        // Delagator unstakes
        epoch = await getEpoch();
        const amount = tokenAmount('10000'); // unstaking partial amount
        staker = await stakeManager.getStaker(4);
        const prevStake = (staker.stake);
        const sToken = await stakedToken.attach(staker.tokenAddress);
        await sToken.connect(signers[5]).approve(stakeManager.address, amount);
        await stakeManager.connect(signers[5]).unstake(staker.id, amount);
        let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 0);
        assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');

        assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

        for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        const totalSupply = await sToken.totalSupply();
        const rAmount = (amount.mul(staker.stake)).div(totalSupply);
        epoch = await getEpoch();
        await stakeManager.connect(signers[5]).initiateWithdraw(staker.id);
        lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 1);
        const newStake = prevStake.sub(rAmount);
        staker = await stakeManager.getStaker(4);

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

        const newBalance = prevBalance.add(lock.amount);
        const DelegatorBalance = await razor.balanceOf(signers[5].address);

        assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
        // As staker 4 takes in Block Rewards ,so there is increase in valuation of sRZR
        // due to which rAmount > rAmountUnchanged (Case Unchanged is when 1RZR = 1SRZR)
        const rAmountUnchanged = amount; // Amount to be tranferred to delegator if 1RZR = 1sRZR

        const newBalanaceUnchanged = prevBalance.add(rAmountUnchanged); // New balance of delegator after withdraw if 1RZR = 1sRZR
        assertBNLessThan(newBalanaceUnchanged, DelegatorBalance, 'Delegators should receive more amount than expected due to increase in valuation of sRZR');
      });

    it('Delegators should receive less amount than expected after withdraw due to decrease in valuation of sRZR when chosen staker is penalized',
      async function () {
        let staker = await stakeManager.getStaker(4);
        // triggering the inactivity penalty for chosen staker
        const epochsJumped = GRACE_PERIOD + 2;
        for (let i = 0; i < epochsJumped; i++) {
          await mineToNextEpoch();
        }
        // commit
        let epoch = await getEpoch();
        const secret = await getSecret(signers[4]);
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

        await mineToNextState(); // reveal
        await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
        // Staker 4 is penalised because no of inactive epochs (9) > max allowed inactive epochs i.e grace_period (8)
        // Delagator unstakes
        await mineToNextEpoch();
        epoch = await getEpoch();
        const amount = tokenAmount('10000'); // unstaking partial amount
        staker = await stakeManager.getStaker(4);
        const prevStake = (staker.stake);
        const sToken = await stakedToken.attach(staker.tokenAddress);
        await sToken.connect(signers[5]).approve(stakeManager.address, amount);
        await stakeManager.connect(signers[5]).unstake(staker.id, amount);
        let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 0);
        assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
        assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

        for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        const totalSupply = await sToken.totalSupply();
        const rAmount = (amount.mul(staker.stake)).div(totalSupply);
        epoch = await getEpoch();
        await stakeManager.connect(signers[5]).initiateWithdraw(staker.id);
        lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 1);
        const newStake = prevStake.sub(rAmount);
        staker = await stakeManager.getStaker(4);

        assertBNEqual((staker.stake), (newStake), 'Updated stake is not equal to calculated stake');
        assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
        assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        // Delegator withdraws
        const prevBalance = await razor.balanceOf(signers[5].address);
        epoch = await getEpoch();
        await (stakeManager.connect(signers[5]).unlockWithdraw(staker.id));
        const DelegatorBalance = await razor.balanceOf(signers[5].address);

        const newBalance = prevBalance.add(lock.amount);
        assertBNEqual(DelegatorBalance, newBalance, 'Delagators balance does not match the calculated balance');

        // As staker 4 takes in inactivity penalty ,so there is decrease in valuation of sRZR
        // due to which rAmount < rAmountUnchanged (Case Unchanged is when 1RZR = 1SRZR)
        const rAmountUnchanged = amount; // Amount to be tranferred to delegator if 1RZR = 1sRZR

        const newBalanaceUnchanged = prevBalance.add(rAmountUnchanged); // New balance of delegator after withdraw if 1RZR = 1sRZR
        assertBNLessThan(DelegatorBalance, newBalanaceUnchanged, 'Delegators should receive less amount than expected due to decrease in valuation of sRZR');
      });

    it('Delegators should not be able to withdraw if withdraw within period passes', async function () {
      const amount = tokenAmount('10000'); // unstaking partial amount
      const staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await sToken.connect(signers[5]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[5]).unstake(staker.id, amount);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      const withdrawWithin = await stakeManager.withdrawInitiationPeriod();
      // Delegator withdraws
      for (let i = 0; i < withdrawWithin + 1; i++) {
        await mineToNextEpoch();
      }

      const tx = stakeManager.connect(signers[5]).initiateWithdraw(staker.id);
      await assertRevert(tx, 'Initiation Period Passed');
    }).timeout(100000);

    it('Delegator/Staker should not be able to call resetLock if contract is paused', async function () {
      const staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[5]).resetUnstakeLock(staker.id);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Delegetor/Staker should be penalized when calling reset lock', async function () {
      let staker = await stakeManager.getStaker(4);
      let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 0);
      const resetUnstakeLockPenalty = await stakeManager.resetUnstakeLockPenalty();
      let lockedAmount = lock.amount;
      const penalty = ((lockedAmount).mul(resetUnstakeLockPenalty)).div(toBigNumber('10000000'));
      lockedAmount = lockedAmount.sub(penalty);
      staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const prevTotalSupply = await sToken.totalSupply();
      await stakeManager.connect(signers[5]).resetUnstakeLock(staker.id);
      lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 0);
      staker = await stakeManager.getStaker(4);
      const epoch = await getEpoch();
      assertBNEqual((lock.amount), (lockedAmount), 'Stake is not equal to calculated stake');
      assertBNEqual(prevTotalSupply.sub(penalty), await sToken.totalSupply(), 'sToken not burnt');
      assertBNEqual(lockedAmount, await sToken.balanceOf(stakeManager.address), 'sToken not burnt');
      assertBNEqual(epoch + UNSTAKE_LOCK_PERIOD, lock.unlockAfter, 'unlockAfter not changed');
    });

    it('Delegetor/Staker should be able to withdraw after reset lock', async function () {
      const staker = await stakeManager.getStaker(4);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      const prevDBalance = await razor.balanceOf(signers[5].address);
      await stakeManager.connect(signers[5]).initiateWithdraw(staker.id);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress, 1);
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      await stakeManager.connect(signers[5]).unlockWithdraw(staker.id);
      const newDBalance = await razor.balanceOf(signers[5].address);
      assertBNEqual(prevDBalance.add(lock.amount), newDBalance, 'Locked amount is not equal to requested lock amount');
    });

    it('if delegator transfer its sRZR to other account,than other account becomes the delegator who can unstake/withdraw', async function () {
      let staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const sAmount = await sToken.balanceOf(signers[5].address);
      await sToken.connect(signers[5]).transfer(signers[6].address, sAmount); // signers[6] becomes new delegator.

      // new delegator should be able to unstake
      let epoch = await getEpoch();
      const amount = tokenAmount('10000'); // unstaking partial amount
      staker = await stakeManager.getStaker(4);
      const prevStake = (staker.stake);
      await sToken.connect(signers[6]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[6]).unstake(staker.id, amount);
      let lock = await stakeManager.locks(signers[6].address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      const totalSupply = await sToken.totalSupply();
      const rAmount = (amount.mul(staker.stake)).div(totalSupply);
      epoch = await getEpoch();
      await stakeManager.connect(signers[6]).initiateWithdraw(staker.id);
      lock = await stakeManager.locks(signers[6].address, staker.tokenAddress, 1);
      const newStake = prevStake.sub(rAmount);
      staker = await stakeManager.getStaker(4);

      assertBNEqual((staker.stake), (newStake), 'Updated stake is not equal to calculated stake');
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      // Delegator withdraws
      const prevBalance = await razor.balanceOf(signers[6].address);
      await (stakeManager.connect(signers[6]).unlockWithdraw(staker.id));
      staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.stake, newStake, 'Updated stake is not equal to calculated stake');

      const DelegatorBalance = await razor.balanceOf(signers[6].address);
      const newBalance = prevBalance.add(rAmount);
      assertBNEqual(DelegatorBalance, newBalance, 'Delagators balance does not match the calculated balance');
    });

    it('should not allow staker to add stake after being slashed', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('423000');
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await governance.grantRole(GOVERNER_ROLE, signers[0].address);
      await razor.connect(signers[7]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[7]).stake(epoch, stake1);
      const stakerIdAcc7 = await stakeManager.stakerIds(signers[7].address);

      const staker = await stakeManager.getStaker(stakerIdAcc7);
      const sToken = await stakedToken.attach(staker.tokenAddress);

      await sToken.connect(signers[7]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[7]).unstake(stakerIdAcc7, stake1);
      await governance.setSlashParams(500000, 9500000, 0);
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.slash(epoch, stakerIdAcc7, signers[10].address); // slashing whole stake of signers[7]
      const stake2 = tokenAmount('200000');
      await razor.connect(signers[7]).approve(stakeManager.address, stake2);
      const tx = stakeManager.connect(signers[7]).stake(epoch, stake2);
      await assertRevert(tx, 'staker is slashed');
    });

    it('should not allow staker to unstake if he is not going to receive any RAZORs,', async function () {
      const stakerId = await stakeManager.getStakerId(signers[7].address);

      for (let i = 0; i <= UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      const tx = stakeManager.connect(signers[7]).initiateWithdraw(stakerId);
      await assertRevert(tx, 'No razor to withdraw');
    });

    it('non admin should not be able to withdraw funds in emergency', async function () {
      const balanceContractBefore = await razor.balanceOf(stakeManager.address);
      const balanceAdminBefore = await razor.balanceOf(signers[1].address);
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[1]).escape(signers[1].address);

      await assertRevert(tx, 'AccessControl');

      const balanceContractAfter = await razor.balanceOf(stakeManager.address);
      const balanceAdminAfter = await razor.balanceOf(signers[1].address);
      assertBNEqual(balanceContractBefore, balanceContractAfter, 'contract balance changed');
      assertBNEqual(balanceAdminBefore, balanceAdminAfter, 'staker balance changed');
    });

    it('admin should be able to withdraw funds in emergency', async function () {
      const balanceContractBefore = await razor.balanceOf(stakeManager.address);
      const balanceAdminBefore = await razor.balanceOf(signers[0].address);
      await stakeManager.connect(signers[0]).escape(signers[0].address);
      const balanceContractAfter = await razor.balanceOf(stakeManager.address);
      const balanceAdminAfter = await razor.balanceOf(signers[0].address);
      assertBNEqual(balanceContractBefore, balanceAdminAfter.sub(balanceAdminBefore), 'admin didnt get entire balance');
      assertBNEqual(balanceContractAfter, toBigNumber(0), 'stakeManager still has balance');
      await razor.connect(signers[0]).transfer(stakeManager.address, balanceContractBefore);
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Staker should not be able to withdraw if the stakemanager contract is out of funds', async function () {
      const stakerIdacc3 = await stakeManager.stakerIds(signers[3].address);
      const staker = await stakeManager.getStaker(stakerIdacc3);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await sToken.connect(signers[3]).approve(stakeManager.address, tokenAmount('1000'));
      await stakeManager.connect(signers[3]).unstake(stakerIdacc3, tokenAmount('1000'));
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      const balanceContractBefore = await razor.balanceOf(stakeManager.address);
      await stakeManager.connect(signers[0]).pause();
      await stakeManager.connect(signers[0]).escape(signers[0].address);
      await stakeManager.connect(signers[0]).unpause();
      await stakeManager.connect(signers[3]).initiateWithdraw(stakerIdacc3);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      const tx = stakeManager.connect(signers[3]).unlockWithdraw(stakerIdacc3);
      await assertRevert(tx, 'ERC20: transfer amount exceeds balance');
      await razor.connect(signers[0]).transfer(stakeManager.address, balanceContractBefore);
    });

    it('admin should not be able to withdraw funds if escape hatch is disabled', async function () {
      await stakeManager.connect(signers[0]).pause();
      await razor.connect(signers[0]).transfer(stakeManager.address, toBigNumber(10000));
      const balanceContractBefore = await razor.balanceOf(stakeManager.address);
      const balanceAdminBefore = await razor.balanceOf(signers[0].address);
      await governance.connect(signers[0]).disableEscapeHatch();
      const tx = stakeManager.connect(signers[0]).escape(signers[0].address);
      await assertRevert(tx, 'escape hatch is disabled');
      const balanceContractAfter = await razor.balanceOf(stakeManager.address);
      const balanceAdminAfter = await razor.balanceOf(signers[0].address);
      assertBNEqual(balanceContractBefore, balanceContractAfter, 'contract balance changed');
      assertBNEqual(balanceAdminBefore, balanceAdminAfter, 'staker balance changed');
    });

    it('admin should not be able to withdraw funds if contract is not paused', async function () {
      await razor.connect(signers[0]).transfer(stakeManager.address, toBigNumber(100000));
      const balanceContractBefore = await razor.balanceOf(stakeManager.address);
      const balanceAdminBefore = await razor.balanceOf(signers[0].address);
      await stakeManager.connect(signers[0]).unpause();
      const tx = stakeManager.connect(signers[0]).escape(signers[0].address);
      await assertRevert(tx, 'paused');
      const balanceContractAfter = await razor.balanceOf(stakeManager.address);
      const balanceAdminAfter = await razor.balanceOf(signers[0].address);
      assertBNEqual(balanceContractBefore, balanceContractAfter, 'contract balance changed');
      assertBNEqual(balanceAdminBefore, balanceAdminAfter, 'staker balance changed');
    });

    it('Delegator should not be able to delegate if contract is paused', async function () {
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const delegatedStake = tokenAmount('100000');
      await stakeManager.connect(signers[0]).pause();
      await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
      const tx = stakeManager.connect(signers[5]).delegate(stakerId, delegatedStake);
      await assertRevert(tx, 'paused');
    });

    it('Staker should not be able to unstake if contract is paused', async function () {
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const amount = tokenAmount('200');
      const tx = stakeManager.connect(signers[4]).unstake(stakerId, amount);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Staker should not be able to withdraw if contract is paused', async function () {
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      let staker = await stakeManager.getStaker(stakerId);
      const amount = tokenAmount('200');
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await sToken.connect(signers[4]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[4]).unstake(stakerId, amount);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }

      const prevBalance = await razor.balanceOf(staker._address);
      await mineToNextEpoch();

      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[4]).initiateWithdraw(stakerId);
      const presentBalance = await razor.balanceOf(staker._address);
      staker = await stakeManager.getStaker(stakerId);
      await assertRevert(tx, 'paused');
      assertBNEqual(prevBalance, presentBalance, "Staker's razor balance changed");
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Staker with minStake staked, should be able to participate', async function () {
      const stakeOfStaker = tokenAmount('20000');
      await razor.transfer(signers[9].address, stakeOfStaker);
      let epoch = await getEpoch();

      await razor.connect(signers[9]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[9]).stake(epoch, stakeOfStaker);
      await mineToNextEpoch();

      // Participation In Epoch
      epoch = await getEpoch();
      const secret = await getSecret(signers[9]);
      await commit(signers[9], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[9], 0, voteManager, stakeManager, collectionManager);
      // Next Epoch
      await mineToNextEpoch();
    });

    it('should be given out inactivity penalties at the time of unstaking', async function () {
      let staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[4]).resetUnstakeLock(staker.id);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      await stakeManager.connect(signers[4]).initiateWithdraw(staker.id);
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      await stakeManager.connect(signers[4]).unlockWithdraw(staker.id);
      const epochsJumped = GRACE_PERIOD + 2;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }

      staker = await stakeManager.getStaker(4);
      const prevStake = staker.stake;
      const amount = tokenAmount('100');
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();

      await sToken.connect(signers[4]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[4]).unstake(staker.id, amount);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      await stakeManager.connect(signers[4]).initiateWithdraw(staker.id);
      const rAmount = (amount.mul(staker.stake)).div(totalSupply);
      staker = await stakeManager.getStaker(4);
      assertBNLessThan((staker.stake).add(rAmount), prevStake, 'Inactivity penalties have not been applied');
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      await stakeManager.connect(signers[4]).unlockWithdraw(staker.id);
    });

    it('should not levy inactivity penalities during commit if it has been given out during unstake', async function () {
      let staker = await stakeManager.getStaker(4);
      const prevStake = staker.stake;
      // commit
      // const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

      staker = await stakeManager.getStaker(4);
      assertBNEqual(prevStake, staker.stake, 'Inactivity penalties have been levied');
      // const epochsJumped = WITHDRAW_INITIATION_PERIOD + 1;
      // for (let i = 0; i <= epochsJumped; i++) {
      //  await mineToNextEpoch();
      // }
      // await stakeManager.connect(signers[4]).resetUnstakeLock(staker.id);
    });

    it('should not be able to escape inactivity penalties by unstaking multiple times', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
      const stake = tokenAmount('105000');
      let amount = tokenAmount('100000');
      await razor.transfer(signers[15].address, stake);
      await razor.connect(signers[15]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[15]).stake(epoch, stake);
      await mineToNextEpoch();
      amount = tokenAmount('1');
      const epochsJumped = GRACE_PERIOD + 2;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[15].address);
      let staker = await stakeManager.getStaker(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await sToken.connect(signers[15]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[15]).unstake(stakerId, amount);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      const epochPenalized = epoch;
      await stakeManager.connect(signers[15]).initiateWithdraw(stakerId);
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(staker.epochFirstStakedOrLastPenalized, epochPenalized, 'Staker not penalized');
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      await stakeManager.connect(signers[15]).unlockWithdraw(stakerId);
      for (let i = 0; i < Math.ceil(GRACE_PERIOD / (UNSTAKE_LOCK_PERIOD + WITHDRAW_LOCK_PERIOD)); i++) {
        epoch = await getEpoch();
        await sToken.connect(signers[15]).approve(stakeManager.address, amount);
        await stakeManager.connect(signers[15]).unstake(stakerId, amount);
        for (let j = 0; j < UNSTAKE_LOCK_PERIOD; j++) {
          await mineToNextEpoch();
        }
        epoch = await getEpoch();
        await stakeManager.connect(signers[15]).initiateWithdraw(stakerId);
        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }
        epoch = await getEpoch();
        await stakeManager.connect(signers[15]).unlockWithdraw(stakerId);
        staker = await stakeManager.getStaker(stakerId);
        assertBNEqual(staker.epochFirstStakedOrLastPenalized, epochPenalized, 'Staker has been penalized');
      }
      await mineToNextEpoch();
      epoch = await getEpoch();
      await sToken.connect(signers[15]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[15]).unstake(stakerId, amount);
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      await stakeManager.connect(signers[15]).initiateWithdraw(stakerId);
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(staker.epochFirstStakedOrLastPenalized, epoch, 'Staker not penalized');
    });
    it('staker should be able to increase stake by any number of RZR token', async () => {
      let staker = await stakeManager.getStaker(4);
      const epoch = await getEpoch();
      const amount = tokenAmount('1');
      const prevStake = staker.stake;
      await razor.connect(signers[4]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[4]).stake(epoch, amount);
      staker = await stakeManager.getStaker(4);
      assertBNEqual(prevStake.add(amount), staker.stake, 'stakeAmount should increase');
    });

    it('staker should be able to decrease the commission by any amount not less than zero after epoch limit', async function () {
      let staker = await stakeManager.getStaker(4);
      await governance.connect(signers[0]).setEpochLimitForUpdateCommission(5);
      for (let i = 0; i < 5; i++) {
        await mineToNextEpoch();
      }
      const earlierCommission = 6; // Current Commission : 6% for staker 4
      const updatedCommission = earlierCommission - 1; // 5%
      await stakeManager.connect(signers[4]).updateCommission(updatedCommission);
      staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.commission, updatedCommission, 'Commission Should Decrease');
    });
    it('staker should be able to increase the commission by only alloted commission increase percentage after epoch limit', async function () {
      let staker = await stakeManager.getStaker(4);
      await governance.connect(signers[0]).setEpochLimitForUpdateCommission(10);
      for (let i = 0; i < 10; i++) {
        await mineToNextEpoch();
      }
      const earlierCommission = staker.commission; // Current Commission : 5% for staker 4
      const updatedCommission = (earlierCommission + 2); // 7%
      await stakeManager.connect(signers[4]).updateCommission(updatedCommission);
      staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.commission, updatedCommission, 'Commission Should Increase');
    });

    it('Once the commision is set it can also be decreased to zero after the epoch limit', async function () {
      for (let i = 0; i < 10; i++) {
        await mineToNextEpoch();
      }
      await stakeManager.connect(signers[4]).updateCommission(0);
      const staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.commission, toBigNumber('0'));
    });

    it('Unstake should be blocked in Propose and Dispute', async function () {
      await mineToNextEpoch();

      await mineToNextState();
      await mineToNextState();

      // Propose
      const stakerIdAcc = await stakeManager.stakerIds(signers[4].address);
      const tx = stakeManager.connect(signers[4]).initiateWithdraw(stakerIdAcc);
      await assertRevert(tx, 'Unstake: NA Propose');
      await mineToNextState();

      // Dispute
      const tx1 = stakeManager.connect(signers[4]).initiateWithdraw(stakerIdAcc);
      await assertRevert(tx1, 'Unstake: NA Dispute');
    });

    it('Delegator should not be able to delegate funds to slashed Staker', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
      const secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
      await governance.setSlashParams(500, 4500, 0); // slashing only half stake
      await stakeManager.slash(epoch, stakerIdAcc4, signers[10].address); // slashing signers[1]
      const amount = tokenAmount('1000');
      const tx = stakeManager.connect(signers[10]).delegate(stakerIdAcc4, amount);
      await assertRevert(tx, 'Staker is slashed');
    });

    it('Staker should be able to stake amount less than minStake', async function () {
      await mineToNextEpoch();
      const stakeOfStaker = tokenAmount('12000');
      await razor.transfer(signers[9].address, stakeOfStaker);
      const epoch = await getEpoch();

      await razor.connect(signers[9]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[9]).stake(epoch, stakeOfStaker);
    });
    it('Staker should be able to stake amount more than minStake', async function () {
      await mineToNextEpoch();
      const stakeOfStaker = tokenAmount('22000');
      await razor.transfer(signers[9].address, stakeOfStaker);
      const epoch = await getEpoch();

      await razor.connect(signers[9]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[9]).stake(epoch, stakeOfStaker);
    });

    it('Staker should be able to stake amount same as minStake', async function () {
      await mineToNextEpoch();
      const stakeOfStaker = tokenAmount('20000');
      await razor.transfer(signers[9].address, stakeOfStaker);
      const epoch = await getEpoch();

      await razor.connect(signers[9]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[9]).stake(epoch, stakeOfStaker);
    });

    it('Staker should be able to stake amount more than minSafeRazor', async function () {
      await mineToNextEpoch();
      const stakeOfStaker = tokenAmount('11000');
      await razor.transfer(signers[14].address, stakeOfStaker);
      const epoch = await getEpoch();

      await razor.connect(signers[14]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[14]).stake(epoch, stakeOfStaker);
    });

    it('Staker should be able to stake amount same as minSafeRazor', async function () {
      await mineToNextEpoch();

      const stakeOfStaker = tokenAmount('10000');

      await razor.transfer(signers[16].address, stakeOfStaker);
      const epoch = await getEpoch();

      await razor.connect(signers[16]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[16]).stake(epoch, stakeOfStaker);
    });

    it('Staker should not be able to stake amount less than minSafeRazor', async function () {
      await mineToNextEpoch();

      const stakeOfStaker = tokenAmount(100);

      await razor.transfer(signers[17].address, stakeOfStaker);

      const epoch = await getEpoch();

      await razor.connect(signers[17]).approve(stakeManager.address, stakeOfStaker);

      const tx = stakeManager.connect(signers[17]).stake(epoch, stakeOfStaker);
      await assertRevert(tx, 'less than minimum safe Razor');
    });

    // Test for Issue : https://github.com/razor-network/contracts/issues/202
    it('Conversion between RZR <> sRZR should work as expected', async function () {
      /// Staker comes in network
      await governance.setMinStake(1);
      await governance.setMinSafeRazor(0);

      const stakeOfStaker = tokenAmount('1000');
      await razor.transfer(signers[8].address, stakeOfStaker); // new Delegator

      // -------------------- @Step1 : Staker Stakes First Time --------------------
      let epoch = await getEpoch();

      await razor.connect(signers[8]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[8]).stake(epoch, stakeOfStaker);
      await stakeManager.connect(signers[8]).updateCommission('2');
      await stakeManager.connect(signers[8]).setDelegationAcceptance(true);
      const stakerId = await stakeManager.stakerIds(signers[8].address);
      let staker = await stakeManager.stakers(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);

      // sRZRs Minted should be at 1 RZR == 1 sRZR
      assertBNEqual(await sToken.balanceOf(staker._address), staker.stake, 'Amount of minted sRzR is not correct');

      // TotalSupply of sRZR : 1000 ** 10 **18, 1000 sRZR
      // Current Stake : 1000 ** 10 ** 18, 1000 RZR
      assertBNEqual(await sToken.totalSupply(), tokenAmount('1000'), 'Total Supply MisMatch');
      assertBNEqual(await staker.stake, tokenAmount('1000'), 'Stake MisMatch');

      // Participation In Epoch as delegators cant delegate to a staker untill they participate
      const secret = await getSecret(signers[8]);
      await commit(signers[8], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[8], 0, voteManager, stakeManager, collectionManager);

      // -------------------- @Step 2 : Lets say staker is rewarded multiple times and his stake is now 2000 ** 10 ** 18, 2000 RZR --------------------
      await mineToNextEpoch();
      epoch = await getEpoch();
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.setStakerStake(epoch, stakerId, 1, tokenAmount('100'), tokenAmount('2000'));
      staker = await stakeManager.stakers(stakerId);

      // TotalSupply of sRZR : 1000 ** 10 **18, 1000 sRZR
      // Current Stake : 2000 ** 10 ** 18, 2000 RZR
      assertBNEqual(await sToken.totalSupply(), tokenAmount('1000'), 'Total Supply MisMatch');
      assertBNEqual(await staker.stake, tokenAmount('2000'), 'Stake MisMatch');

      // -------------------- @Step 3 : A delegator comes in network and stake 1 RZR (1 * 10 ** 18), now he should get 0.5 sRZR (0.5* 10 ** 18) ---------

      await mineToNextEpoch();
      epoch = await getEpoch();

      const stakeOfDelegator = tokenAmount('1');
      await razor.transfer(signers[9].address, stakeOfDelegator); // new Delegator
      await razor.connect(signers[9]).approve(stakeManager.address, stakeOfDelegator);
      await stakeManager.connect(signers[9]).delegate(stakerId, stakeOfDelegator);
      staker = await stakeManager.stakers(stakerId);

      // TotalSupply of sRZR : 1000.5 ** 10 **18, 1000.5 sRZR
      // Current Stake of staker : 2001 ** 10 ** 18, 1001 RZR
      // sRZRs Staker hold : 1000 ** 10 ** 18, 1000 sRZR
      // sRZR Delegator hold : .5 ** 10** 18, 0.5 sRZR

      assertBNEqual(await sToken.totalSupply(), toBigNumber('10005').mul(BigNumber.from(10).pow(BigNumber.from(17))), 'Total Supply MisMatch');
      assertBNEqual(await staker.stake, tokenAmount('2001'), 'Stake MisMatch');
      assertBNEqual(await sToken.balanceOf(signers[8].address), tokenAmount('1000'), 'Staker Balance MisMatch');
      assertBNEqual(await sToken.balanceOf(signers[9].address), toBigNumber('5').mul(BigNumber.from(10).pow(BigNumber.from(17))), 'Delegator Balance MisMatch');
    });

    // Delegation Gain Scenario  https://docs.google.com/spreadsheets/d/1b8ks98mRczDIX9tayjgCxI5NvD7Hq27JSYVWyqCfXmg/edit?usp=sharing
    it('Scenario Test : Delegation Gain and Quotient ', async function () {
      let epoch = await getEpoch();

      const stake = tokenAmount('1000');
      await razor.transfer(signers[11].address, stake);
      await razor.connect(signers[11]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[11]).stake(epoch, stake);
      await stakeManager.connect(signers[11]).updateCommission(5);
      await stakeManager.connect(signers[11]).setDelegationAcceptance(true);
      const stakerId = await stakeManager.stakerIds(signers[11].address);
      let staker = await stakeManager.stakers(stakerId);

      // Participation In Epoch as delegators cant delegate to a staker untill they participate
      const secret = await getSecret(signers[11]);
      await commit(signers[11], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[11], 0, voteManager, stakeManager, collectionManager);
      await mineToNextEpoch();

      epoch = await getEpoch();
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.setStakerStake(epoch, stakerId, 1, tokenAmount('100'), tokenAmount('2000')); // Staker Rewarded

      // Step 2 : Delegation 1
      const delegation1 = tokenAmount('2000');
      await razor.transfer(signers[13].address, delegation1);
      await razor.connect(signers[13]).approve(stakeManager.address, delegation1);
      await stakeManager.connect(signers[13]).delegate(stakerId, delegation1);

      // All checks
      let sRZRBalance = await sToken.balanceOf(signers[13].address);
      let initial = await sToken.getRZRDeposited(signers[13].address, sRZRBalance);
      let totalSupply = await sToken.totalSupply();
      staker = await stakeManager.stakers(stakerId);
      let withdrawable = (sRZRBalance.mul(staker.stake)).div(totalSupply);

      assertBNEqual(sRZRBalance, tokenAmount('1000'), 'sRZR mismatch');
      assertBNEqual(initial, tokenAmount('2000'), 'initial mismatch');
      assertBNEqual(withdrawable, tokenAmount('2000'), 'withdrawable mismatch');

      // Step 3 : Delegation 2
      await stakeManager.setStakerStake(epoch, stakerId, 1, tokenAmount('100'), tokenAmount('6000')); // Staker Rewarded

      const delegation2 = tokenAmount('3000');
      await razor.transfer(signers[13].address, delegation2);
      await razor.connect(signers[13]).approve(stakeManager.address, delegation2);
      await stakeManager.connect(signers[13]).delegate(stakerId, delegation2);

      // All checks
      sRZRBalance = await sToken.balanceOf(signers[13].address);
      initial = await sToken.getRZRDeposited(signers[13].address, sRZRBalance);
      totalSupply = await sToken.totalSupply();
      staker = await stakeManager.stakers(stakerId);
      withdrawable = (sRZRBalance.mul(staker.stake)).div(totalSupply);

      assertBNEqual(sRZRBalance, tokenAmount('2000'), 'sRZR mismatch');
      assertBNEqual(initial, tokenAmount('5000'), 'initial mismatch');
      assertBNEqual(withdrawable, tokenAmount('6000'), 'withdrawable mismatch');

      // Step 4 : Delegation 3
      await stakeManager.setStakerStake(epoch, stakerId, 1, tokenAmount('100'), tokenAmount('3000')); // Staker Slashed

      const delegation3 = tokenAmount('3000');
      await razor.transfer(signers[13].address, delegation3);
      await razor.connect(signers[13]).approve(stakeManager.address, delegation3);
      await stakeManager.connect(signers[13]).delegate(stakerId, delegation3);

      // All checks
      sRZRBalance = await sToken.balanceOf(signers[13].address);
      initial = await sToken.getRZRDeposited(signers[13].address, sRZRBalance);
      totalSupply = await sToken.totalSupply();
      staker = await stakeManager.stakers(stakerId);
      withdrawable = (sRZRBalance.mul(staker.stake)).div(totalSupply);

      assertBNEqual(sRZRBalance, tokenAmount('5000'), 'sRZR mismatch');
      assertBNEqual(initial, tokenAmount('8000'), 'initial mismatch');
      assertBNEqual(withdrawable, tokenAmount('5000'), 'withdrawable mismatch');
    });

    it('delegators should be able to unstake properly if there are 2 or more delegators to a staker', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
      const stake = tokenAmount('20000');
      await razor.connect(signers[17]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[17]).stake(epoch, stake);
      const stakerId = await stakeManager.getStakerId(signers[17].address);
      await stakeManager.connect(signers[17]).updateCommission(10);
      await stakeManager.connect(signers[17]).setDelegationAcceptance('true');
      let staker = await stakeManager.getStaker(stakerId);
      const secret = await getSecret(signers[17]);
      await commit(signers[17], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[17], 0, voteManager, stakeManager, collectionManager);

      // propose
      await mineToNextState();
      await propose(signers[17], stakeManager, blockManager, voteManager, collectionManager);
      await reset();

      staker = await stakeManager.getStaker(stakerId);
      const stakeBefore = staker.stake;
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await blockManager.connect(signers[17]).claimBlockReward();
      await mineToNextState(); // commit again in order to get block reward
      staker = await stakeManager.getStaker(stakerId);
      const stakeAfter = staker.stake;
      assertBNLessThan(stakeBefore, stakeAfter, 'Not rewarded');
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = tokenAmount('50');
      epoch = await getEpoch();
      await stakeManager.setStakerStake(epoch, stakerId, 1, staker.stake, tokenAmount('10000'));
      await razor.connect(signers[18]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[18]).delegate(stakerId, amount);
      await mineToNextEpoch();

      epoch = await getEpoch();
      await stakeManager.setStakerStake(epoch, stakerId, 1, tokenAmount('10000'), tokenAmount('40000'));
      const amount2 = tokenAmount('30');
      epoch = await getEpoch();
      await razor.connect(signers[19]).approve(stakeManager.address, amount2);
      await stakeManager.connect(signers[19]).delegate(stakerId, amount2);

      await mineToNextEpoch();

      staker = await stakeManager.getStaker(stakerId);
      epoch = await getEpoch();
      const sAmount = await sToken.balanceOf(signers[18].address);
      await sToken.connect(signers[18]).approve(stakeManager.address, sAmount);
      await stakeManager.connect(signers[18]).unstake(stakerId, sAmount);
      let lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, sAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(await sToken.balanceOf(stakeManager.address), sAmount, 'sToken not transferred to stakeManager');
      assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      const sAmount2 = await sToken.balanceOf(signers[19].address);
      await sToken.connect(signers[19]).approve(stakeManager.address, sAmount2);
      await stakeManager.connect(signers[19]).unstake(stakerId, sAmount2);
      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, sAmount2, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(await sToken.balanceOf(stakeManager.address), sAmount.add(sAmount2), 'sToken not transferred to stakeManager');
      assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 0);
      let prevStake = staker.stake;
      let totalSupply = await sToken.totalSupply();
      let rAmount = (sAmount.mul(staker.stake)).div(totalSupply);
      await stakeManager.connect(signers[18]).initiateWithdraw(stakerId);
      staker = await stakeManager.getStaker(stakerId);

      lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 1);
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(prevStake.sub(lock.amount), staker.stake, 'Stake not reduced');
      assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 0);
      prevStake = staker.stake;
      totalSupply = await sToken.totalSupply();
      rAmount = (sAmount2.mul(staker.stake)).div(totalSupply);
      await stakeManager.connect(signers[19]).initiateWithdraw(stakerId);
      staker = await stakeManager.getStaker(stakerId);

      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 1);
      assertBNEqual(amount2, rAmount, 'Incorrect rAmount calculation');
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(prevStake.sub(lock.amount), staker.stake, 'Stake not reduced');
      assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      // Delegator withdraws
      epoch = await getEpoch();
      let prevBalance = await razor.balanceOf(signers[18].address);
      lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 1);
      await (stakeManager.connect(signers[18]).unlockWithdraw(staker.id));

      let newBalance = prevBalance.add(lock.amount);
      let DelegatorBalance = await razor.balanceOf(signers[18].address);

      assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');

      prevBalance = await razor.balanceOf(signers[19].address);
      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 1);
      await (stakeManager.connect(signers[19]).unlockWithdraw(staker.id));

      newBalance = prevBalance.add(lock.amount);
      DelegatorBalance = await razor.balanceOf(signers[19].address);

      assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
    });

    it('delegator should be able to unstake properly even after reseting lock when multiple delegators unstake', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
      const secret = await getSecret(signers[17]);
      await commit(signers[17], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[17], 0, voteManager, stakeManager, collectionManager);

      const stakerId = await stakeManager.getStakerId(signers[17].address);
      let staker = await stakeManager.getStaker(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = tokenAmount('50');
      await stakeManager.setStakerStake(epoch, stakerId, 1, staker.stake, tokenAmount('10000'));
      await razor.connect(signers[18]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[18]).delegate(stakerId, amount);
      await mineToNextEpoch();

      epoch = await getEpoch();
      await stakeManager.setStakerStake(epoch, stakerId, 1, tokenAmount('10000'), tokenAmount('40000'));
      const amount2 = tokenAmount('30');
      epoch = await getEpoch();
      await razor.connect(signers[19]).approve(stakeManager.address, amount2);
      await stakeManager.connect(signers[19]).delegate(stakerId, amount2);

      await mineToNextEpoch();

      staker = await stakeManager.getStaker(stakerId);
      epoch = await getEpoch();
      const sAmount = await sToken.balanceOf(signers[18].address);
      await sToken.connect(signers[18]).approve(stakeManager.address, sAmount);
      await stakeManager.connect(signers[18]).unstake(stakerId, sAmount);
      let lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, sAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(await sToken.balanceOf(stakeManager.address), sAmount, 'sToken not transferred to stakeManager');
      assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      const sAmount2 = await sToken.balanceOf(signers[19].address);
      await sToken.connect(signers[19]).approve(stakeManager.address, sAmount2);
      await stakeManager.connect(signers[19]).unstake(stakerId, sAmount2);
      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, sAmount2, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(await sToken.balanceOf(stakeManager.address), sAmount.add(sAmount2), 'sToken not transferred to stakeManager');
      assertBNEqual(lock.unlockAfter, epoch + UNSTAKE_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      for (let i = 0; i < UNSTAKE_LOCK_PERIOD + WITHDRAW_INITIATION_PERIOD + 1; i++) {
        await mineToNextEpoch();
      }

      epoch = await getEpoch();
      lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 0);
      let totalSupply = await sToken.totalSupply();
      let rAmount = (sAmount.mul(staker.stake)).div(totalSupply);
      const tx = stakeManager.connect(signers[18]).initiateWithdraw(stakerId);
      await assertRevert(tx, 'Initiation Period Passed');

      const resetUnstakeLockPenalty = await stakeManager.resetUnstakeLockPenalty();
      let lockedAmount = lock.amount;
      const penalty = ((lockedAmount).mul(resetUnstakeLockPenalty)).div(toBigNumber('10000000'));
      lockedAmount = lockedAmount.sub(penalty);
      const prevTotalSupply = await sToken.totalSupply();
      let rPenalty = (penalty.mul(staker.stake)).div(prevTotalSupply);
      let prevStake = staker.stake;
      await stakeManager.connect(signers[18]).resetUnstakeLock(stakerId);
      staker = await stakeManager.getStaker(stakerId);
      lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 0);
      assertBNEqual(lock.amount, lockedAmount, 'Locked amount is not equal to lock amount after giving the penalty');
      assertBNEqual(prevTotalSupply.sub(penalty), await sToken.totalSupply(), 'sToken not burnt');
      assertBNEqual(staker.stake, prevStake.sub(rPenalty), 'not removed from stake');

      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      await commit(signers[17], 0, voteManager, collectionManager, secret, blockManager);

      staker = await stakeManager.getStaker(stakerId);
      prevStake = staker.stake;
      totalSupply = await sToken.totalSupply();
      rAmount = ((lock.amount).mul(staker.stake)).div(totalSupply);
      await stakeManager.connect(signers[18]).initiateWithdraw(stakerId);
      staker = await stakeManager.getStaker(stakerId);
      epoch = await getEpoch();
      lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 1);
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(prevStake.sub(lock.amount), staker.stake, 'Stake not reduced');
      assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 0);
      prevStake = staker.stake;
      totalSupply = await sToken.totalSupply();
      rAmount = (sAmount2.mul(staker.stake)).div(totalSupply);
      const tx2 = stakeManager.connect(signers[19]).initiateWithdraw(stakerId);
      await assertRevert(tx2, 'Initiation Period Passed');

      lockedAmount = lock.amount;
      const penalty2 = ((lockedAmount).mul(resetUnstakeLockPenalty)).div(toBigNumber('10000000'));
      lockedAmount = lockedAmount.sub(penalty2);
      const prevTotalSupply2 = await sToken.totalSupply();
      rPenalty = (penalty2.mul(staker.stake)).div(prevTotalSupply2);
      await stakeManager.connect(signers[19]).resetUnstakeLock(stakerId);

      for (let i = 0; i < UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      staker = await stakeManager.getStaker(stakerId);
      prevStake = staker.stake;
      totalSupply = await sToken.totalSupply();
      rAmount = (lockedAmount.mul(staker.stake)).div(totalSupply);
      await stakeManager.connect(signers[19]).initiateWithdraw(stakerId);
      staker = await stakeManager.getStaker(stakerId);
      epoch = await getEpoch();
      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 1);
      // assertBNEqual(amount2.sub(rPenalty), rAmount, 'Incorrect rAmount calculation');
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(prevStake.sub(lock.amount), staker.stake, 'Stake not reduced');
      assertBNEqual(lock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      // Delegator withdraws
      epoch = await getEpoch();
      let prevBalance = await razor.balanceOf(signers[18].address);
      lock = await stakeManager.locks(signers[18].address, staker.tokenAddress, 1);
      await (stakeManager.connect(signers[18]).unlockWithdraw(staker.id));

      let newBalance = prevBalance.add(lock.amount);
      let DelegatorBalance = await razor.balanceOf(signers[18].address);

      assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');

      prevBalance = await razor.balanceOf(signers[19].address);
      lock = await stakeManager.locks(signers[19].address, staker.tokenAddress, 1);
      await (stakeManager.connect(signers[19]).unlockWithdraw(staker.id));

      newBalance = prevBalance.add(lock.amount);
      DelegatorBalance = await razor.balanceOf(signers[19].address);

      assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
    });

    it('Staker should be able to reset unstake lock during reset lock period', async function () {
      await mineToNextEpoch();
      const stakeOfStaker = tokenAmount('11000');
      const stakerId = await stakeManager.getStakerId(signers[14].address);

      let staker = await stakeManager.getStaker(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await governance.setUnstakeLockPeriod(toBigNumber('10'));
      await sToken.connect(signers[14]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[14]).unstake(stakerId, stakeOfStaker);

      for (let i = 0; i < 5; i++) {
        await mineToNextEpoch();
      }

      staker = await stakeManager.getStaker(stakerId);
      let lock = await stakeManager.locks(signers[14].address, staker.tokenAddress, 0);
      const resetUnstakeLockPenalty = await stakeManager.resetUnstakeLockPenalty();
      let lockedAmount = lock.amount;
      const penalty = ((lockedAmount).mul(resetUnstakeLockPenalty)).div(toBigNumber('10000000'));
      lockedAmount = lockedAmount.sub(penalty);
      const prevTotalSupply = await sToken.totalSupply();
      await stakeManager.connect(signers[14]).resetUnstakeLock(stakerId);
      lock = await stakeManager.locks(signers[14].address, staker.tokenAddress, 0);
      staker = await stakeManager.getStaker(stakerId);
      const epoch = await getEpoch();
      assertBNEqual((lock.amount), (lockedAmount), 'Stake is not equal to calculated stake');
      assertBNEqual(prevTotalSupply.sub(penalty), await sToken.totalSupply(), 'sToken not burnt');
      assertBNEqual(lockedAmount, await sToken.balanceOf(stakeManager.address), 'sToken not burnt');
      assertBNEqual(epoch + 10, lock.unlockAfter, 'unlockAfter not changed');
    });
  });
  describe('Stake Manager: part 2', async function () {
    /// signers[1] - staker ID: 1
    /// signers[2] - delagator to staker 1
    /// signers[3] - delagator to staker 1
    /// signers[4] - staker ID: 2
    /// signers[5] - delagator to staker 2
    it('Mal staker should not be able to drain funds when resetting lock after he has initiated withdraw', async function () {
      await restoreSnapshot(snapShotId);
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');

      await razor.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[1]).stake(epoch, stake1);
      await stakeManager.connect(signers[1]).updateCommission(6);
      await stakeManager.connect(signers[1]).setDelegationAcceptance('true');

      await mineToNextEpoch();
      const secret = await getSecret(signers[1]);
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[1], 0, voteManager, stakeManager, collectionManager);

      await mineToNextEpoch();

      const delegatedStake = tokenAmount('100000');
      const staker = await stakeManager.getStaker(1);
      await razor.connect(signers[2]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[2]).delegate(staker.id, delegatedStake);
      await razor.connect(signers[3]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[3]).delegate(staker.id, delegatedStake);

      await mineToNextEpoch();
      const sToken = await stakedToken.attach(staker.tokenAddress);
      // staker unstake
      await sToken.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[1]).unstake(1, stake1);
      // delegator unstake
      await sToken.connect(signers[2]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[2]).unstake(1, delegatedStake);
      await sToken.connect(signers[3]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[3]).unstake(1, delegatedStake);

      assertBNEqual(await sToken.balanceOf(staker._address), toBigNumber('0'), 'whole amount not unstaked');
      assertBNEqual(await sToken.balanceOf(stakeManager.address), stake1.add(delegatedStake.mul(2)), 'sToken not transferred to stakeManager');

      for (let i = 0; i <= UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      await stakeManager.connect(signers[1]).initiateWithdraw(1);
      assertBNEqual(await sToken.balanceOf(stakeManager.address), (delegatedStake.mul(2)), 'sToken not burnt');

      for (let i = 0; i <= 10; i++) {
        const tx = stakeManager.connect(signers[1]).resetUnstakeLock(1);
        await assertRevert(tx, 'Withdraw Lock exists');
      }
      assertBNEqual(await sToken.balanceOf(stakeManager.address), (delegatedStake.mul(2)), 'sToken being burnt incorrectly');
    });
    it('stakerReward should not be added if the staker does not accept delegation', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');

      await razor.connect(signers[4]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[4]).stake(epoch, stake1);

      await mineToNextEpoch();
      const secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);

      await mineToNextState(); // propose
      await propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);

      await mineToNextState(); // dispute
      await mineToNextState(); // confirm

      await blockManager.connect(signers[4]).claimBlockReward();

      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const staker = await stakeManager.getStaker(stakerId);

      await assertBNEqual(staker.stakerReward, toBigNumber('0'), 'stakerReward should not be given');
      await assertBNEqual(staker.stake, stake1.add(await rewardManager.blockReward()), 'full block reward given');
    });
    it('stakerReward should be added if the staker accepts delegation', async function () {
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      await stakeManager.connect(signers[4]).updateCommission(6);
      await stakeManager.connect(signers[4]).setDelegationAcceptance('true');
      const blockReward = await rewardManager.blockReward();

      await mineToNextEpoch();

      let secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

      await mineToNextState(); // reveal
      await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);

      await mineToNextState(); // propose
      await propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);

      await mineToNextState(); // dispute
      await mineToNextState(); // confirm

      let staker = await stakeManager.getStaker(stakerId);
      let prevStake = staker.stake;
      await blockManager.connect(signers[4]).claimBlockReward();

      staker = await stakeManager.getStaker(stakerId);
      await assertBNEqual(staker.stakerReward, toBigNumber('0'), 'stakerReward should not be given as staker has no delegators');
      await assertBNEqual(staker.stake, prevStake.add(blockReward), 'full block reward given for now');

      const delegatedStake = tokenAmount('100000');
      await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[5]).delegate(staker.id, delegatedStake);

      for (let i = 0; i < 5; i++) {
        await mineToNextEpoch();
        secret = await getSecret(signers[4]);
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);

        await mineToNextState(); // reveal
        await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);

        await mineToNextState(); // propose
        await propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);

        await mineToNextState(); // dispute
        await mineToNextState(); // confirm

        staker = await stakeManager.getStaker(stakerId);
        prevStake = staker.stake;
        const prevStakeReward = staker.stakerReward;

        await blockManager.connect(signers[4]).claimBlockReward();

        staker = await stakeManager.getStaker(stakerId);
        const sToken = await stakedToken.attach(staker.tokenAddress);
        const totalSupply = await sToken.totalSupply();
        const stakerSRZR = await sToken.balanceOf(signers[4].address);
        const stakerShare = blockReward.mul(stakerSRZR).div(totalSupply);
        const delegatorShare = blockReward.sub(stakerShare);
        const stakerReward = delegatorShare.mul(toBigNumber(staker.commission)).div(toBigNumber('100'));
        assertBNEqual(staker.stakerReward, prevStakeReward.add(stakerReward), 'Incorrect Commission Calculation');
        assertBNEqual(prevStake.add(blockReward.sub(stakerReward)), staker.stake, 'Incorrect RAZOR rewarded');
      }
    });
    it('staker should not claim stakerReward if stakerReward is 0', async function () {
      const tx = stakeManager.connect(signers[1]).claimStakerReward();
      await assertRevert(tx, 'no stakerReward to transfer');
    });
    it('only staker can claim stakerReward', async function () {
      const tx = stakeManager.connect(signers[5]).claimStakerReward();
      await assertRevert(tx, 'staker doesnt exist');

      const prevBalance = await razor.balanceOf(signers[4].address);
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      let staker = await stakeManager.getStaker(stakerId);

      await stakeManager.connect(signers[4]).claimStakerReward();

      const newBalance = await razor.balanceOf(signers[4].address);
      assertBNEqual(prevBalance.add(staker.stakerReward), newBalance, 'Incorrect amount of stakerReward claimed');
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(staker.stakerReward, toBigNumber('0'), 'stakerReward needs to reset');
    });
    it('should be able to set blockReward to zero', async function () {
      await mineToNextEpoch();
      await governance.grantRole(GOVERNER_ROLE, signers[0].address);
      await governance.connect(signers[0]).setBlockReward(0);
      const blockReward = await blockManager.blockReward();
      assertBNEqual(blockReward, toBigNumber('0'));
      const secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();
      await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
      await mineToNextState();
      await propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextState();
      await mineToNextState();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      let staker = await stakeManager.stakers(stakerId);
      const stakeBefore = staker.stake;
      await blockManager.connect(signers[4]).claimBlockReward();
      staker = await stakeManager.stakers(stakerId);
      const stakeAfter = staker.stake;
      assertBNEqual(stakeBefore, stakeAfter, 'stake should not increase');
    });
    it('should be able to set inactivityPenalty to zero', async function () {
      await mineToNextEpoch();
      await governance.grantRole(GOVERNER_ROLE, signers[0].address);
      await governance.connect(signers[0]).setPenaltyNotRevealNum(0);
      const penaltyNotRevealNum = await rewardManager.penaltyNotRevealNum();
      assertBNEqual(penaltyNotRevealNum, toBigNumber('0'));
      let secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();
      await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
      await mineToNextState();
      await propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextState();
      await mineToNextState();
      const epochsJumped = GRACE_PERIOD + 3;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      let staker = await stakeManager.stakers(stakerId);
      const stakeBefore = staker.stake;
      secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
      staker = await stakeManager.stakers(stakerId);
      const stakeAfter = staker.stake;
      assertBNEqual(stakeBefore, stakeAfter, 'stake should not decrease');
    });
    it('should be able to set inactivity age penalty to zero', async function () {
      await mineToNextEpoch();
      await governance.grantRole(GOVERNER_ROLE, signers[0].address);
      await governance.connect(signers[0]).setPenaltyAgeNotRevealNum(0);
      const penaltyNotRevealNum = await rewardManager.penaltyAgeNotRevealNum();
      assertBNEqual(penaltyNotRevealNum, toBigNumber('0'));
      let secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();
      await reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
      await mineToNextState();
      await propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextState();
      await mineToNextState();
      const epochsJumped = GRACE_PERIOD + 3;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      let staker = await stakeManager.stakers(stakerId);
      const ageBefore = staker.age;
      secret = await getSecret(signers[4]);
      await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
      staker = await stakeManager.stakers(stakerId);
      const ageAfter = staker.age;
      assertBNEqual(ageBefore, ageAfter, 'stake should not decrease');
    });
    it('should not be able to call initiate withdraw again after calling it once', async function () {
      const staker = await stakeManager.getStaker(2);

      await mineToNextEpoch();
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const unstakeAmount = tokenAmount('10000');
      // staker unstake
      await sToken.connect(signers[4]).approve(stakeManager.address, unstakeAmount);
      await stakeManager.connect(signers[4]).unstake(2, unstakeAmount);
      // delegator unstake
      await sToken.connect(signers[5]).approve(stakeManager.address, unstakeAmount);
      await stakeManager.connect(signers[5]).unstake(2, unstakeAmount);

      assertBNEqual(await sToken.balanceOf(stakeManager.address), unstakeAmount.mul(2), 'sToken not transferred to stakeManager');

      for (let i = 0; i <= UNSTAKE_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      await stakeManager.connect(signers[5]).initiateWithdraw(2);
      assertBNEqual(await sToken.balanceOf(stakeManager.address), unstakeAmount, 'sToken not burnt');

      const tx = stakeManager.connect(signers[5]).initiateWithdraw(2);
      await assertRevert(tx, 'Withdraw lock present');

      await stakeManager.connect(signers[4]).initiateWithdraw(2);
      assertBNEqual(await sToken.balanceOf(stakeManager.address), toBigNumber('0'), 'sToken not burnt');
    });
  });
});
