/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const { utils } = require('ethers');
const { assert } = require('chai');
const {
  DEFAULT_ADMIN_ROLE_HASH, GRACE_PERIOD, WITHDRAW_LOCK_PERIOD, ASSET_MODIFIER_ROLE,
  STAKE_MODIFIER_ROLE,
  WITHDRAW_RELEASE_PERIOD,
  GOVERNER_ROLE,
  PAUSE_ROLE,
} = require('./helpers/constants');
const {
  assertBNEqual,
  assertBNLessThan,
  assertBNNotEqual,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');
const {
  getEpoch,
  toBigNumber,
  tokenAmount,
  getBiggestInfluenceAndId,
  getIteration,
  maturity,
} = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');

const { BigNumber } = ethers;

describe('StakeManager', function () {
  describe('RAZOR', async function () {
    let signers;
    let razor;
    let blockManager;
    let governance;
    let stakeManager;
    let rewardManager;
    let voteManager;
    let initializeContracts;
    let stakedToken;
    let stakedTokenFactory;
    let assetManager;

    before(async () => {
      ({
        razor,
        blockManager,
        assetManager,
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
      const tx = stakeManager.connect(signers[6]).stake(await getEpoch(), tokenAmount('18000'));
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

      await assetManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      let name;
      const power = -2;
      const selectorType = 0;
      const weight = 50;
      let i = 0;
      while (i < 9) {
        name = `test${i}`;
        await assetManager.createJob(weight, power, selectorType, name, selector, url);
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
        await assetManager.createCollection([i, i + 1], 1, 3, Cname);
      }
      Cname = 'Test Collection9';
      await assetManager.createCollection([9, 1], 1, 3, Cname);

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
      await razor.transfer(signers[12].address, stake1);
    });

    it('should not allow non admin to pause', async function () {
      const tx1 = stakeManager.connect(signers[1]).pause();
      await assertRevert(tx1, 'AccessControl');
    });

    it('should not be able to stake if stake is less than min stake', async function () {
      const epoch = await getEpoch();
      const stake = tokenAmount('999');
      await razor.connect(signers[1]).approve(stakeManager.address, stake);
      const tx = stakeManager.connect(signers[1]).stake(epoch, stake);
      await assertRevert(tx, 'Amount below Minstake');
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

    it('Staker should not be able to stake if stake is below minstake', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('10');

      await razor.connect(signers[1]).approve(stakeManager.address, stake1);
      const tx = stakeManager.connect(signers[1]).stake(epoch, stake1);
      await assertRevert(tx, 'Amount below Minstake');
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
      await assertRevert(tx, 'ERC20: transfer amount exceeds allowance');
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
    it('should handle second staker correctly', async function () {
      const epoch = await getEpoch();
      const stake = tokenAmount('19000');

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

    it('Staker should not be able to withdraw if didnt unstake', async function () {
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const tx = stakeManager.connect(signers[1]).withdraw(epoch, stakerId);
      await assertRevert(tx, 'Did not unstake');
    });

    it('Staker should not be able to unstake zero amount', async function () {
      const epoch = await getEpoch();
      const amount = tokenAmount('0');
      const tx = stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
      await assertRevert(tx, 'Non-Positive Amount');
    });

    it('Staker should not be able to call extendLock if lock amount is zero', async function () {
      const tx = stakeManager.connect(signers[1]).extendLock(1);
      await assertRevert(tx, 'Existing Lock doesnt exist');
    });

    it('Staker should not be able to unstake more than his sRZR balance', async function () {
      const epoch = await getEpoch();
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const staker = await stakeManager.getStaker(stakerIdAcc1);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = await sToken.balanceOf(staker._address);
      const tx = stakeManager.connect(signers[1]).unstake(epoch, 1, amount + 1);
      await assertRevert(tx, 'Invalid Amount');
    });

    it('Staker should be able to unstake when there is no existing lock', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      // we're doing a partial unstake here , though full unstake has the same procedure
      const amount = tokenAmount('20000');
      const staker = await stakeManager.getStaker(1);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      const rAmount = (amount.mul(staker.stake)).div(totalSupply);
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    });

    it('Staker should not be able to unstake when there is an existing lock', async function () {
      const epoch = await getEpoch();
      const amount = tokenAmount('20000');
      const tx = stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
      await assertRevert(tx, 'Existing Lock');
    });

    it('Staker should not be able to withdraw in withdraw lock period', async function () {
      // skip to last epoch of the lock period
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }
      const epoch = await getEpoch();
      const staker = await stakeManager.getStaker(1);
      const prevStake = staker.stake;
      const tx = stakeManager.connect(signers[1]).withdraw(epoch, 1);
      await assertRevert(tx, 'Withdraw epoch not reached');
      assertBNEqual(staker.stake, prevStake, 'Stake should not change');
    });

    it('Staker should be able to withdraw after withdraw lock period if it didnt reveal in withdraw lock period', async function () {
      let staker = await stakeManager.getStaker(1);
      let epoch = await getEpoch();

      const prevStake = staker.stake;
      const prevBalance = await razor.balanceOf(staker._address);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      await mineToNextEpoch();
      epoch = await getEpoch();
      await (stakeManager.connect(signers[1]).withdraw(epoch, 1));
      staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, prevStake, 'Stake should not change');
      assertBNEqual(await razor.balanceOf(staker._address), prevBalance.add(lock.amount), 'Balance should be equal');
    });

    it('should allow staker to add stake after withdraw if either withdrawnAmount is not the whole stake', async function () {
      const epoch = await getEpoch();
      const stake = tokenAmount('20000');
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
      await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
      assertBNEqual(await sToken.balanceOf(staker._address), toBigNumber('0'), 'sToken stake not burnt');
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }
      const prevBalance = await razor.balanceOf(staker._address);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      await mineToNextEpoch();
      epoch = await getEpoch();
      await (stakeManager.connect(signers[1]).withdraw(epoch, 1));
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(staker.stake, toBigNumber('0'), 'Updated stake is not equal to calculated stake');
      assertBNEqual(await razor.balanceOf(staker._address), prevBalance.add(lock.amount), 'Balance should be equal');
      const stake = await razor.balanceOf(staker._address);
      await razor.connect(signers[1]).approve(stakeManager.address, stake);
      const tx = stakeManager.connect(signers[1]).stake(epoch, stake);
      await assertRevert(tx, 'Stakers Stake is 0');
    });

    it('Staker should not be able to unstake if his stake is zero', async function () {
      const epoch = await getEpoch();
      const tx = stakeManager.connect(signers[1]).unstake(epoch, 1, tokenAmount('1000'));
      await assertRevert(tx, 'Nonpositive stake');
    });

    it('staker should be able to withdraw even if they have participated in the withdraw lock period', async function () {
      // @notice: Checking for Staker 2
      const stake = tokenAmount('10000');
      let epoch = await getEpoch();
      let staker = await stakeManager.getStaker(2);
      const prevStake = staker.stake;
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      const rAmount = (stake.mul(staker.stake)).div(totalSupply);
      await stakeManager.connect(signers[2]).unstake(epoch, 2, stake);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      staker = await stakeManager.getStaker(2);
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.withdrawAfter, toBigNumber(epoch + WITHDRAW_LOCK_PERIOD), 'Withdraw after for the lock is incorrect');
      assertBNEqual(prevStake.sub(rAmount), staker.stake, 'Stake not correct');
      // Next Epoch
      await mineToNextEpoch();

      // Participation In Epoch
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      epoch = await getEpoch();
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      // Commit
      await voteManager.connect(signers[2]).commit(epoch, commitment1);
      await mineToNextState();

      // Reveal
      await voteManager.connect(signers[2]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      // Next Epoch
      await mineToNextEpoch();
      epoch = await getEpoch();
      const prevBalance = await razor.balanceOf(signers[2].address);
      await stakeManager.connect(signers[2]).withdraw(epoch, 2);
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
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);
      await mineToNextState();

      await voteManager.connect(signers[3]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      staker = await stakeManager.stakers(3);
      assertBNNotEqual(staker.stake, stake, 'Stake should have decreased due to penalty');
    });

    it('should not penalize staker if number of inactive epochs is smaller than / equal to grace_period', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
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
      epoch = await getEpoch();
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment);

      // reveal
      await mineToNextState();

      // Staker is not penalised because no. of inactive epochs (8) <= max allowed inactive epochs i.e grace_period (8)
      await voteManager.connect(signers[3]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
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
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[3]).commit(epoch, commitment);
      staker = await stakeManager.getStaker(3);

      // Total no of inactive epochs = 42 - 32 - 1 = 9
      // Staker 3 is penalised because total inactive epochs(9) > max allowed inactive epochs i.e grace_period (8)
      assertBNNotEqual(staker.stake, newStake, 'Stake should have decreased due to inactivity penalty');
    });

    it('Staker should not be able to unstake,withdraw,setDelegationAcceptance,updateCommission if the staker has not staked yet',
      async function () {
        const amount = tokenAmount('10000');
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        // const staker = await stakeManager.getStaker(stakerId);
        const tx1 = stakeManager.connect(signers[7]).unstake(epoch, stakerId, amount);
        await assertRevert(tx1, 'staker.id = 0');
        const tx2 = stakeManager.connect(signers[7]).withdraw(epoch, stakerId);
        await assertRevert(tx2, 'staker doesnt exist');
        const tx3 = stakeManager.connect(signers[7]).setDelegationAcceptance('true');
        await assertRevert(tx3, 'staker id = 0');
        const tx4 = stakeManager.connect(signers[7]).updateCommission(7);
        await assertRevert(tx4, 'staker id = 0');
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
      const tx = stakeManager.connect(signers[5]).delegate(epoch, stakerId, amount);
      await assertRevert(tx, 'Delegetion not accpected');
    });

    it('Staker should not be able to updateCommission if it exceeds maximum limit', async function () {
      const commRate = await stakeManager.maxCommission();
      const tx = stakeManager.connect(signers[4]).updateCommission(commRate + 1);
      await assertRevert(tx, 'Commission exceeds maxlimit');
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
      const epoch = await getEpoch();
      // Participation In Epoch as delegators cant delegate to a staker untill they participate
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[4]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[4]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextEpoch();
      const { acceptDelegation } = staker;
      assert.strictEqual(acceptDelegation, true, 'Staker does not accept delgation');
    });

    it('Delegator should not be able to delegate more than his rzr balance', async function () {
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const tx = stakeManager.connect(signers[5]).delegate(epoch, stakerId, tokenAmount('500000'));
      await assertRevert(tx, 'ERC20: transfer amount exceeds balance');
    });

    it('chosen staker should stake atleast once', async function () {
      const staker = await stakeManager.getStaker(4);
      const notAStakerId = toBigNumber('0');
      assertBNNotEqual(staker.id, notAStakerId, 'Staker did not stake even once');
    });

    it('delegator should be able to delegate stake to staker', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const delegatedStake = tokenAmount('100000');
      const stake2 = tokenAmount('520000');
      let staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[5]).delegate(epoch, stakerId, delegatedStake);
      staker = await stakeManager.stakers(4);
      assertBNEqual(staker.stake, stake2, 'Change in stake is incorrect');
      assertBNEqual(await sToken.balanceOf(signers[5].address), delegatedStake, 'Amount of minted sRzR is not correct');
    });

    it('Delegator should not be able to unstake if contract is paused', async function () {
      const epoch = await getEpoch();
      await stakeManager.connect(signers[0]).pause();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const amount = tokenAmount('20000');
      const tx = stakeManager.connect(signers[5]).unstake(epoch, stakerId, amount);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Delegator should not be able to withdraw if didnt unstake', async function () {
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      const tx = stakeManager.connect(signers[5]).withdraw(epoch, stakerId);
      await assertRevert(tx, 'Did not unstake');
    });

    it('Delegator should be able to unstake when there is no existing lock', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const amount = tokenAmount('10000'); // unstaking partial amount
      let staker = await stakeManager.getStaker(4);
      const prevStake = staker.stake;
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      const rAmount = (amount.mul(staker.stake)).div(totalSupply);
      staker = await stakeManager.getStaker(4);

      const initial = await sToken.getRZRDeposited(signers[5].address, amount); // How much delegator had put for this much amount of SRZRS
      const gain = (rAmount.sub(initial)); // commission in accordance to gain
      const commission = ((gain).mul(staker.commission)).div(100);
      // Commision should be zero as gain is equal to 0 in this case, as given staker was not rewarded

      assertBNEqual(gain, toBigNumber('0'), 'Gain calculated is not expected');
      assertBNEqual(commission, toBigNumber('0'), 'Commission does not match calculated comission');
      assertBNEqual(lock.commission, commission, 'Commission does not match calculated comission');
      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(prevStake.sub(lock.amount), staker.stake, 'Stake not reduced');
      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    });

    it('Delegator should not be able to unstake when there is an existing lock', async function () {
      const epoch = await getEpoch();
      const amount = tokenAmount('10000');
      const staker = await stakeManager.getStaker(4);
      const tx = stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
      await assertRevert(tx, 'Existing Lock');
    });

    it('Delegator should not be able to withdraw in withdraw lock period', async function () {
      // skip to last epoch of the lock period
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }
      const epoch = await getEpoch();
      const staker = await stakeManager.getStaker(4);
      const prevStake = staker.stake;
      const tx = stakeManager.connect(signers[5]).withdraw(epoch, staker.id);
      await assertRevert(tx, 'Withdraw epoch not reached');
      assertBNEqual(staker.stake, prevStake, 'Stake should not change');
    });

    it('Delegator should not be able to withdraw if contract is paused', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[5]).withdraw(epoch, stakerId);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Delegator should be able to withdraw after withdraw lock period', async function () {
      const staker = await stakeManager.getStaker(4);
      const epoch = await getEpoch();
      const prevBalance = await razor.balanceOf(signers[5].address);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);

      const stakerPrevBalance = await razor.balanceOf(staker._address);
      let withdawAmount = lock.amount;
      if (lock.commission > 0) {
        withdawAmount = withdawAmount.sub(lock.commission);
      }

      await (stakeManager.connect(signers[5]).withdraw(epoch, staker.id));
      const DelegatorBalance = await razor.balanceOf(signers[5].address);
      const newBalance = prevBalance.add(withdawAmount);

      assertBNEqual(withdawAmount, lock.amount, 'Commission Should not be paid'); // gain=0;
      assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
      assertBNEqual(await razor.balanceOf(staker._address), stakerPrevBalance.add(lock.commission), 'Stakers should not get commission'); // gain == 0
    });

    it('Delegators should receive more amount than expected after withdraw due to increase in valuation of sRZR when chosen staker is rewarded',
      async function () {
        await mineToNextEpoch();
        let epoch = await getEpoch();
        let staker = await stakeManager.getStaker(4);
        const stakerPrevBalance = await razor.balanceOf(staker._address);

        // commit
        epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment = utils.solidityKeccak256(
          ['uint32', 'uint48[]', 'bytes32'],
          [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        await voteManager.connect(signers[4]).commit(epoch, commitment);

        // reveal
        await mineToNextState();

        await voteManager.connect(signers[4]).reveal(epoch, votes,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
        // propose
        await mineToNextState();
        const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);
        await blockManager.connect(signers[4]).propose(epoch,
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          iteration,
          biggestInfluencerId);
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
        const totalSupply = await sToken.totalSupply();
        await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
        let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
        const rAmount = (amount.mul(staker.stake)).div(totalSupply);
        const newStake = prevStake.sub(rAmount);
        staker = await stakeManager.getStaker(4);

        const initial = await sToken.getRZRDeposited(signers[5].address, amount); // How much delegator had put for this much amount of SRZRS
        const gain = (rAmount.sub(initial)); // commission in accordance to gain
        const commission = ((gain).mul(staker.commission)).div(100);

        assertBNEqual((staker.stake), (newStake), 'Updated stake is not equal to calculated stake');
        assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
        assertBNEqual(lock.commission, commission, 'Commission does not match calculated comission');
        assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        // Delegator withdraws
        epoch = await getEpoch();
        const prevBalance = await razor.balanceOf(signers[5].address);
        lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
        await (stakeManager.connect(signers[5]).withdraw(epoch, staker.id));

        let withdawAmount = lock.amount;
        if (lock.commission > 0) {
          withdawAmount = withdawAmount.sub(lock.commission);
        }

        const newBalance = prevBalance.add(withdawAmount);
        const DelegatorBalance = await razor.balanceOf(signers[5].address);

        assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
        assertBNLessThan(withdawAmount, lock.amount, 'Commission Should be paid'); // gain > 0;
        assertBNEqual(await razor.balanceOf(staker._address), stakerPrevBalance.add(lock.commission), 'Stakers should get commision'); // gain > 0
        // As staker 4 takes in Block Rewards ,so there is increase in valuation of sRZR
        // due to which rAmount > rAmountUnchanged (Case Unchanged is when 1RZR = 1SRZR)
        const rAmountUnchanged = amount; // Amount to be tranferred to delegator if 1RZR = 1sRZR

        const newBalanaceUnchanged = prevBalance.add(rAmountUnchanged); // New balance of delegator after withdraw if 1RZR = 1sRZR
        assertBNLessThan(newBalanaceUnchanged, DelegatorBalance, 'Delegators should receive more amount than expected due to increase in valuation of sRZR');
      });

    it('Delegators should receive less amount than expected after withdraw due to decrease in valuation of sRZR when chosen staker is penalized',
      async function () {
        let staker = await stakeManager.getStaker(4);
        const stakerPrevBalance = await razor.balanceOf(staker._address);
        // triggering the inactivity penalty for chosen staker
        const epochsJumped = GRACE_PERIOD + 2;
        for (let i = 0; i < epochsJumped; i++) {
          await mineToNextEpoch();
        }
        // commit
        let epoch = await getEpoch();
        const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = utils.solidityKeccak256(
          ['uint32', 'uint48[]', 'bytes32'],
          [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        await voteManager.connect(signers[4]).commit(epoch, commitment);

        // reveal
        await mineToNextState();

        await voteManager.connect(signers[4]).reveal(epoch, votes1,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
        // Staker 4 is penalised because no of inactive epochs (9) > max allowed inactive epochs i.e grace_period (8)
        // Delagator unstakes
        await mineToNextEpoch();
        epoch = await getEpoch();
        const amount = tokenAmount('10000'); // unstaking partial amount
        staker = await stakeManager.getStaker(4);
        const prevStake = (staker.stake);
        const sToken = await stakedToken.attach(staker.tokenAddress);
        const totalSupply = await sToken.totalSupply();
        const rAmount = (amount.mul(staker.stake)).div(totalSupply);
        await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
        const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);

        const initial = await sToken.getRZRDeposited(signers[5].address, amount); // How much delegator had put for this much amount of SRZRS
        const gain = (rAmount.sub(initial)); // commission in accordance to gain
        assertBNLessThan(gain, toBigNumber('0'), 'Gain calculated is not expected');
        const commission = 0; // as gain is < 0

        assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
        assertBNEqual(lock.commission, commission, 'Commission does not match calculated comission');
        assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

        epoch = await getEpoch();
        staker = await stakeManager.getStaker(4);
        const prevBalance = await razor.balanceOf(signers[5].address);
        const newStake = prevStake.sub(rAmount);
        staker = await stakeManager.getStaker(4);
        assertBNEqual(staker.stake, newStake, 'Updated stake is not equal to calculated stake'); // checking withdraw is working

        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        // Delegator withdraws
        epoch = await getEpoch();
        await (stakeManager.connect(signers[5]).withdraw(epoch, staker.id));
        const DelegatorBalance = await razor.balanceOf(signers[5].address);
        let withdawAmount = lock.amount;
        if (lock.commission > 0) {
          withdawAmount = withdawAmount.sub(lock.commission);
        }

        const newBalance = prevBalance.add(lock.amount);
        assertBNEqual(DelegatorBalance, newBalance, 'Delagators balance does not match the calculated balance');
        assertBNEqual(withdawAmount, lock.amount, 'Commission Should not be paid'); // gain < 0;
        assertBNEqual(await razor.balanceOf(staker._address), stakerPrevBalance.add(commission), 'Staker should not get commission'); // gain < 0

        // As staker 4 takes in inactivity penalty ,so there is decrease in valuation of sRZR
        // due to which rAmount < rAmountUnchanged (Case Unchanged is when 1RZR = 1SRZR)
        const rAmountUnchanged = amount; // Amount to be tranferred to delegator if 1RZR = 1sRZR

        const newBalanaceUnchanged = prevBalance.add(rAmountUnchanged); // New balance of delegator after withdraw if 1RZR = 1sRZR
        assertBNLessThan(DelegatorBalance, newBalanaceUnchanged, 'Delegators should receive less amount than expected due to decrease in valuation of sRZR');
      });

    it('Delegators should not be able to withdraw if withdraw within period passes', async function () {
      // Delagator unstakes
      let epoch = await getEpoch();
      const amount = tokenAmount('10000'); // unstaking partial amount
      const staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      const withdrawWithin = await stakeManager.withdrawReleasePeriod();

      // Delegator withdraws
      for (let i = 0; i < withdrawWithin + 1; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      const tx = stakeManager.connect(signers[5]).withdraw(epoch, staker.id);
      await assertRevert(tx, 'Release Period Passed');
    }).timeout(100000);

    it('Delegator/Staker should not be able to call extendLock if contract is paused', async function () {
      const staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[5]).extendLock(staker.id);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Delegetor/Staker should be penalized when calling extend lock', async function () {
      let staker = await stakeManager.getStaker(4);
      let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      const extendLockPenalty = await stakeManager.extendLockPenalty();
      let lockedAmount = lock.amount;
      const penalty = ((lockedAmount).mul(extendLockPenalty)).div(100);
      lockedAmount = lockedAmount.sub(penalty);
      staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[5]).extendLock(staker.id);
      staker = await stakeManager.getStaker(4);
      lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      const epoch = await getEpoch();
      assertBNEqual((lock.amount), (lockedAmount), 'Stake is not equal to calculated stake');
      assertBNEqual(epoch, lock.withdrawAfter, 'new sToken balance is not equal to calculated sToken balance');
    });

    it('Delegetor/Staker should be able to withdraw after extend lock', async function () {
      const staker = await stakeManager.getStaker(4);
      const prevDBalance = await razor.balanceOf(signers[5].address);
      const prevSBalance = await razor.balanceOf(signers[4].address);
      const epoch = await getEpoch();
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      await stakeManager.connect(signers[5]).withdraw(epoch, staker.id);
      const newDBalance = await razor.balanceOf(signers[5].address);
      const newSBalance = await razor.balanceOf(signers[4].address);
      assertBNEqual((prevDBalance.add(lock.amount).sub(lock.commission)), newDBalance, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(prevSBalance.add(lock.commission), newSBalance, 'Withdraw after for the lock is incorrect');
    });

    it('if delegator transfer its sRZR to other account,than other account becomes the delegator who can unstake/withdraw', async function () {
      let staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = await sToken.balanceOf(signers[5].address);
      await sToken.connect(signers[5]).transfer(signers[6].address, amount); // signers[6] becomes new delegator.

      // new delegator should be able to unstake
      staker = await stakeManager.getStaker(4);
      const prevStake = (staker.stake);
      const amount1 = tokenAmount('10000');
      const totalSupply = await sToken.totalSupply();
      let epoch = await getEpoch();
      const rAmount = (amount1.mul(staker.stake)).div(totalSupply);

      const initial = await sToken.getRZRDeposited(signers[6].address, amount); // How much delegator had put for this much amount of SRZRS
      const gain = (rAmount.sub(initial)); // commission in accordance to gain
      let commission = toBigNumber('0');
      if (gain > 0) {
        commission = ((gain).mul(staker.commission)).div(100);
      }

      await stakeManager.connect(signers[6]).unstake(epoch, staker.id, amount1);
      const lock = await stakeManager.locks(signers[6].address, staker.tokenAddress);

      assertBNEqual(lock.amount, rAmount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.commission, commission, 'Commission does not match calculated comission');
      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      // new delegator should be able to withdraw
      const prevBalance = await razor.balanceOf(signers[6].address);

      const newStake = prevStake.sub(rAmount);
      epoch = await getEpoch();
      await (stakeManager.connect(signers[6]).withdraw(epoch, staker.id));
      staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.stake, newStake, 'Updated stake is not equal to calculated stake');

      const DelegatorBalance = await razor.balanceOf(signers[6].address);
      const newBalance = prevBalance.add(rAmount.sub(commission));
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
      await governance.setSlashParams(500, 9500, 0);
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.slash(epoch, stakerIdAcc7, signers[10].address); // slashing whole stake of signers[7]
      const stake2 = tokenAmount('20000');
      await razor.connect(signers[7]).approve(stakeManager.address, stake2);
      const tx = stakeManager.connect(signers[7]).stake(epoch, stake2);
      await assertRevert(tx, 'staker is slashed');
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
      let epoch = await getEpoch();
      const stakerIdacc3 = await stakeManager.stakerIds(signers[3].address);
      await stakeManager.connect(signers[3]).unstake(epoch, stakerIdacc3, tokenAmount('1000'));
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      const balanceContractBefore = await razor.balanceOf(stakeManager.address);
      await stakeManager.connect(signers[0]).pause();
      await stakeManager.connect(signers[0]).escape(signers[0].address);
      await stakeManager.connect(signers[0]).unpause();
      const tx = stakeManager.connect(signers[3]).withdraw(epoch, stakerIdacc3);
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
      await razor.connect(signers[0]).transfer(stakeManager.address, toBigNumber(10000));
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
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const delegatedStake = tokenAmount('100000');
      await stakeManager.connect(signers[0]).pause();
      await razor.connect(signers[5]).approve(stakeManager.address, delegatedStake);
      const tx = stakeManager.connect(signers[5]).delegate(epoch, stakerId, delegatedStake);
      await assertRevert(tx, 'paused');
    });

    it('Staker should not be able to unstake if contract is paused', async function () {
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const amount = tokenAmount('200');
      const tx = stakeManager.connect(signers[4]).unstake(epoch, stakerId, amount);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Staker should not be able to withdraw if contract is paused', async function () {
      let epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      let staker = await stakeManager.getStaker(stakerId);
      const amount = tokenAmount('200');
      await stakeManager.connect(signers[4]).unstake(epoch, stakerId, amount);
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      const prevBalance = await razor.balanceOf(staker._address);
      await mineToNextEpoch();
      epoch = await getEpoch();
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[4]).withdraw(epoch, stakerId);
      const presentBalance = await razor.balanceOf(staker._address);
      staker = await stakeManager.getStaker(stakerId);
      await assertRevert(tx, 'paused');
      assertBNEqual(prevBalance, presentBalance, "Staker's razor balance changed");
      await stakeManager.connect(signers[0]).unpause();
    });

    // Test for Issue : https://github.com/razor-network/contracts/issues/202
    it('Conversion between RZR <> sRZR should work as expected', async function () {
      /// Staker comes in network
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
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[8]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[8]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

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
      await stakeManager.connect(signers[9]).delegate(epoch, stakerId, stakeOfDelegator);
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
    it('Delegation should revert, if staker is inactive for more than grace period', async function () {
      let epoch = await getEpoch();
      const amount = tokenAmount('10000');
      await razor.transfer(signers[9].address, amount);
      await razor.connect(signers[9]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[9]).stake(epoch, amount);
      await stakeManager.connect(signers[9]).updateCommission(4);
      await stakeManager.connect(signers[9]).setDelegationAcceptance('true');
      const stakerId = await stakeManager.stakerIds(signers[9].address);

      // Participation In Epoch as delegators cant delegate to a staker untill they participate
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[9]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[9]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextEpoch();

      // delegation working as expected till staker is active
      epoch = await getEpoch();
      await razor.transfer(signers[10].address, amount);
      await razor.connect(signers[10]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[10]).delegate(epoch, stakerId, amount);

      const epochsJumped = GRACE_PERIOD + 1;
      for (let i = 0; i <= epochsJumped; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      // delegation reverted
      await razor.transfer(signers[10].address, amount);
      await razor.connect(signers[10]).approve(stakeManager.address, amount);
      const tx = stakeManager.connect(signers[10]).delegate(epoch, stakerId, amount);
      await assertRevert(tx, 'Staker is inactive');
    });
    it('Staker with minStake staked, should be able to participate', async function () {
      const stakeOfStaker = tokenAmount('1000');
      await razor.transfer(signers[9].address, stakeOfStaker);
      let epoch = await getEpoch();

      await razor.connect(signers[9]).approve(stakeManager.address, stakeOfStaker);
      await stakeManager.connect(signers[9]).stake(epoch, stakeOfStaker);
      await mineToNextEpoch();

      // Participation In Epoch
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      epoch = await getEpoch();
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      // Commit
      await voteManager.connect(signers[9]).commit(epoch, commitment1);
      await mineToNextState();
      // Reveal
      await voteManager.connect(signers[9]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      // Next Epoch
      await mineToNextEpoch();
    });

    it('should be given out inactivity penalties at the time of unstaking', async function () {
      let staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[4]).extendLock(staker.id);
      await mineToNextEpoch();
      let epoch = await getEpoch();
      await stakeManager.connect(signers[4]).withdraw(epoch, staker.id);
      const epochsJumped = GRACE_PERIOD + 2;
      for (let i = 0; i < epochsJumped; i++) {
        await mineToNextEpoch();
      }

      staker = await stakeManager.getStaker(4);
      const prevStake = staker.stake;
      const amount = tokenAmount('100');
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      epoch = await getEpoch();
      await stakeManager.connect(signers[4]).unstake(epoch, staker.id, amount);
      const rAmount = (amount.mul(staker.stake)).div(totalSupply);
      staker = await stakeManager.getStaker(4);
      assertBNLessThan((staker.stake).add(rAmount), prevStake, 'Inactivity penalties have not been applied');
    });

    it('should not levy inactivity penalities during commit if it has been given out during unstake', async function () {
      let staker = await stakeManager.getStaker(4);
      const prevStake = staker.stake;
      // commit
      const epoch = await getEpoch();
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[4]).commit(epoch, commitment);
      staker = await stakeManager.getStaker(4);
      assertBNEqual(prevStake, staker.stake, 'Inactivity penalties have been levied');
      const epochsJumped = WITHDRAW_RELEASE_PERIOD + 1;
      for (let i = 0; i <= epochsJumped; i++) {
        await mineToNextEpoch();
      }
      await stakeManager.connect(signers[4]).extendLock(staker.id);
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
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[11]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[11]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await mineToNextEpoch();

      epoch = await getEpoch();
      const sToken = await stakedToken.attach(staker.tokenAddress);
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.setStakerStake(epoch, stakerId, 1, tokenAmount('100'), tokenAmount('2000')); // Staker Rewarded

      // Step 2 : Delegation 1
      const delegation1 = tokenAmount('2000');
      await razor.transfer(signers[13].address, delegation1);
      await razor.connect(signers[13]).approve(stakeManager.address, delegation1);
      await stakeManager.connect(signers[13]).delegate(epoch, stakerId, delegation1);

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
      await stakeManager.connect(signers[13]).delegate(epoch, stakerId, delegation2);

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
      await stakeManager.connect(signers[13]).delegate(epoch, stakerId, delegation3);

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
    it('should not be able to escape inactivity penalties by unstaking multiple times', async function () {
      await mineToNextEpoch();
      let epoch = await getEpoch();
      const stake = tokenAmount('10500');
      let amount = tokenAmount('10000');
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
      const epochPenalized = epoch;
      const stakerId = await stakeManager.stakerIds(signers[15].address);
      await stakeManager.connect(signers[15]).unstake(epoch, stakerId, amount);
      let staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(staker.epochFirstStakedOrLastPenalized, epochPenalized, 'Staker not penalized');
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      await stakeManager.connect(signers[15]).withdraw(epoch, stakerId);
      for (let i = 0; i < Math.ceil(GRACE_PERIOD / WITHDRAW_LOCK_PERIOD); i++) {
        epoch = await getEpoch();
        await stakeManager.connect(signers[15]).unstake(epoch, stakerId, amount);
        for (let j = 0; j < WITHDRAW_LOCK_PERIOD; j++) {
          await mineToNextEpoch();
        }
        epoch = await getEpoch();
        await stakeManager.connect(signers[15]).withdraw(epoch, stakerId);
        staker = await stakeManager.getStaker(stakerId);
        assertBNEqual(staker.epochFirstStakedOrLastPenalized, epochPenalized, 'Staker has been penalized');
      }
      await mineToNextEpoch();
      epoch = await getEpoch();
      await stakeManager.connect(signers[15]).unstake(epoch, stakerId, amount);
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
      // console.log(Number(await parameters.epochCommissionLastUpdated()));
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
      const epoch = await getEpoch();

      await mineToNextState();
      await mineToNextState();

      // Propose
      const stakerIdAcc = await stakeManager.stakerIds(signers[4].address);
      const tx = stakeManager.connect(signers[4]).unstake(epoch, stakerIdAcc, 1);
      await assertRevert(tx, 'Unstake: NA Propose');
      await mineToNextState();

      // Dispute
      const tx1 = stakeManager.connect(signers[4]).unstake(epoch, stakerIdAcc, 1);
      await assertRevert(tx1, 'Unstake: NA Dispute');
    });

    it('Delegator should not be able to delegate funds to slashed Staker', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();

      const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[4]).commit(epoch, commitment1);
      await mineToNextState();
      await voteManager.connect(signers[4]).reveal(epoch, votes1,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await governance.setSlashParams(500, 4500, 0); // slashing only half stake
      await stakeManager.slash(epoch, stakerIdAcc4, signers[10].address); // slashing signers[1]
      const amount = tokenAmount('1000');
      const tx = stakeManager.connect(signers[10]).delegate(epoch, stakerIdAcc4, amount);
      await assertRevert(tx, 'Staker is slashed');
    });
  });
});
