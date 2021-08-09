/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const { utils } = require('ethers');
const { assert } = require('chai');
const {
  DEFAULT_ADMIN_ROLE_HASH, GRACE_PERIOD, WITHDRAW_LOCK_PERIOD,

  STAKE_MODIFIER_ROLE,

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

describe('StakeManager', function () {
  describe('RAZOR', async function () {
    let signers;
    let razor;
    let blockManager;
    let parameters;
    let stakeManager;
    let rewardManager;
    let voteManager;
    let initializeContracts;
    let stakedToken;
    let stakedTokenFactory;

    before(async () => {
      ({
        razor,
        blockManager,
        stakeManager,
        rewardManager,
        parameters,
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

    it('should not be able to stake without initialization', async () => {
      const tx = stakeManager.connect(signers[6]).stake(await getEpoch(), tokenAmount('18000'));
      await assertRevert(tx, 'Contract should be initialized');
    });

    it('should not be able to initiliaze StakeManager contract without admin role', async () => {
      const tx = stakeManager.connect(signers[1]).initialize(
        razor.address,
        rewardManager.address,
        voteManager.address,
        parameters.address,
        stakedTokenFactory.address
      );
      await assertRevert(tx, 'AccessControl');
    });

    it('should be able to initialize', async function () {
      await Promise.all(await initializeContracts());

      await mineToNextEpoch();
      const stake1 = tokenAmount('443000');
      await razor.transfer(signers[1].address, stake1);
      await razor.transfer(signers[2].address, stake1);
      await razor.transfer(signers[3].address, stake1);
      await razor.transfer(signers[4].address, stake1); // Chosen Staker by the Delegator
      await razor.transfer(signers[5].address, stake1); // Delegator
      await razor.transfer(signers[6].address, stake1); // new Delegator
      await razor.transfer(signers[7].address, stake1);
    });

    it('should not allow non admin to pause', async function () {
      const tx1 = stakeManager.connect(signers[1]).pause();
      assertRevert(tx1, 'AccessControl');
    });

    it('should not be able to stake if contract is paused', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');

      await razor.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[0]).pause();

      const tx = stakeManager.connect(signers[1]).stake(epoch, stake1);
      assertRevert(tx, 'pause');
    });

    it('should not allow pause if already paused', async function () {
      const tx = stakeManager.connect(signers[0]).pause();
      assertRevert(tx, 'pause');
      await stakeManager.connect(signers[0]).unpause();
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

      // Mint, Burn of sToken should not be accesible to anyone beside StakeManager;
      await assertRevert(sToken.mint(signers[0].address, tokenAmount('1000')), 'Ownable: caller is not the owner');
      await assertRevert(sToken.burn(signers[1].address, tokenAmount('1000')), 'Ownable: caller is not the owner');

      assertBNEqual(stakerId, toBigNumber('1'));
      const numStakers = await stakeManager.numStakers();
      assertBNEqual(numStakers, toBigNumber('1'));
      assertBNEqual(staker.id, toBigNumber('1'));
      assertBNEqual(staker.stake, stake1, 'Change in stake is incorrect');
      assertBNEqual(staker.age, age1, 'age is incorrect');
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

    it('Staker should be able to unstake when there is no existing lock', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      // we're doing a partial unstake here , though full unstake has the same procedure
      const amount = tokenAmount('20000');
      await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
      const staker = await stakeManager.getStaker(1);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
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
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      const rAmount = ((lock.amount).mul(staker.stake)).div(totalSupply);
      await mineToNextEpoch();
      epoch = await getEpoch();
      await (stakeManager.connect(signers[1]).withdraw(epoch, 1));
      staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, prevStake.sub(rAmount), 'Updated stake is not equal to calculated stake');
      assertBNEqual(await razor.balanceOf(staker._address), prevBalance.add(rAmount), 'Balance should be equal');
    });

    it('should allow staker to add stake after withdraw or slash if either withdrawnAmount or slashPenaltyAmount is not the whole stake', async function () {
      const epoch = await getEpoch();
      const stake = tokenAmount('20000');
      const stakerIdAcc1 = await stakeManager.stakerIds(signers[1].address);
      const stakeBeforeAcc1 = (await stakeManager.stakers(stakerIdAcc1)).stake;
      await razor.connect(signers[1]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[1]).stake(epoch, stake); // adding stake after withdraw
      const stakeAfterAcc1 = (await stakeManager.stakers(stakerIdAcc1)).stake;
      assertBNEqual(stakeAfterAcc1, stakeBeforeAcc1.add(stake), 'Stake did not increase on staking after withdraw');

      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await parameters.setSlashPenaltyNum(5000); // slashing only half stake
      await stakeManager.slash(stakerIdAcc1, signers[10].address, epoch); // slashing signers[1]

      const slashPenaltyAmount = (stakeAfterAcc1.mul((await parameters.slashPenaltyNum()))).div(await parameters.slashPenaltyDenom());
      let staker = await stakeManager.getStaker(stakerIdAcc1);
      const stakeAfterSlash = staker.stake;
      assertBNEqual(stakeAfterSlash, stakeAfterAcc1.sub(slashPenaltyAmount), 'Stake should be less by slashPenalty');

      const stake2 = tokenAmount('20000');
      await razor.connect(signers[1]).approve(stakeManager.address, stake2);
      await stakeManager.connect(signers[1]).stake(epoch, stake2);
      staker = await stakeManager.getStaker(stakerIdAcc1);
      assertBNEqual(staker.stake, stakeAfterSlash.add(stake2), 'Stake did not increase on staking after slash');
    });

    it('should not allow staker to add stake after withdrawing whole amount', async function () {
      let epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      let staker = await stakeManager.getStaker(stakerId);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = await sToken.balanceOf(staker._address);
      await stakeManager.connect(signers[1]).unstake(epoch, 1, amount);
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }
      const prevBalance = await razor.balanceOf(staker._address);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      const rAmount = ((lock.amount).mul(staker.stake)).div(totalSupply);
      await mineToNextEpoch();
      epoch = await getEpoch();
      await (stakeManager.connect(signers[1]).withdraw(epoch, 1));
      staker = await stakeManager.getStaker(stakerId);
      assertBNEqual(staker.stake, toBigNumber('0'), 'Updated stake is not equal to calculated stake');
      assertBNEqual(await razor.balanceOf(staker._address), prevBalance.add(rAmount), 'Balance should be equal');
      const stake = await razor.balanceOf(staker._address);
      await razor.connect(signers[1]).approve(stakeManager.address, stake);
      const tx = stakeManager.connect(signers[1]).stake(epoch, stake);
      await assertRevert(tx, 'Stakers Stake is 0');
    });

    it('Staker should not be able to withdraw after withdraw lock period if voted in withdraw lock period', async function () {
      // @notice: Checking for Staker 2
      const stake = tokenAmount('19000');
      let epoch = await getEpoch();
      let staker = await stakeManager.getStaker(2);
      await stakeManager.connect(signers[2]).unstake(epoch, 2, stake);
      const lock = await stakeManager.locks(staker._address, staker.tokenAddress);
      assertBNEqual(lock.amount, stake, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.withdrawAfter, toBigNumber(epoch + WITHDRAW_LOCK_PERIOD), 'Withdraw after for the lock is incorrect');
      // Next Epoch
      await mineToNextEpoch();

      // Participation In Epoch
      const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      epoch = await getEpoch();
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint32[]', 'bytes32'],
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
      const tx = stakeManager.connect(signers[2]).withdraw(epoch, 2);
      await assertRevert(tx, 'Participated in Lock Period');
      staker = await stakeManager.getStaker(2);
      assertBNEqual(staker.stake, stake, 'Stake should not change');
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
        ['uint32', 'uint32[]', 'bytes32'],
        [epoch, votes1, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);

      // reveal
      await mineToNextState();

      // Staker 3 is penalised because no of inactive epochs (9) > max allowed inactive epochs i.e grace_period (8)
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
        ['uint32', 'uint32[]', 'bytes32'],
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
      // But epochStaked is not updated , this epoch would still remain be considered as an inactive epoch for staker 3 .
      // no commit/reveal in this epoch

      await mineToNextEpoch();
      epoch = await getEpoch();
      staker = await stakeManager.getStaker(3);
      const newStake = staker.stake;

      // commit in epoch 42 , outside grace_period
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment = utils.solidityKeccak256(
        ['uint32', 'uint32[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[3]).commit(epoch, commitment);
      staker = await stakeManager.getStaker(3);

      // Total no of inactive epochs = 42 - 32 - 1 = 9
      // Staker 3 is penalised because total inactive epochs(9) > max allowed inactive epochs i.e grace_period (8)
      assertBNNotEqual(staker.stake, newStake, 'Stake should have decreased due to inactivity penalty');
    });

    it('staker should accept delegation', async function () {
      const stake1 = tokenAmount('420000');
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await razor.connect(signers[4]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[4]).stake(epoch, stake1);
      await stakeManager.connect(signers[4]).setDelegationAcceptance('true');
      const staker = await stakeManager.getStaker(4);
      const { acceptDelegation } = staker;
      assert.strictEqual(acceptDelegation, true, 'Staker does not accept delgation');
    });

    it('Staker should be able to set commission', async function () {
      let staker = await stakeManager.getStaker(4);
      const commRate = 6;
      await stakeManager.connect(signers[4]).setCommission(commRate);
      staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.commission, commRate, 'Commission rate is not equal to requested set rate ');
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
      await stakeManager.connect(signers[5]).delegate(epoch, delegatedStake, stakerId);
      staker = await stakeManager.stakers(4);
      assertBNEqual(staker.stake, stake2, 'Change in stake is incorrect');
      assertBNEqual(await sToken.balanceOf(signers[5].address), delegatedStake, 'Amount of minted sRzR is not correct');
    });

    it('staker should only be able to decrease the commission', async function () {
      // const staker = await stakeManager.getStaker(4);
      const earlierCommission = 6; // Current Commission : 6% for staker 4
      const updatedCommission1 = earlierCommission + 1; // 7%
      const updatedCommission2 = earlierCommission - 1; // 5%
      const tx = stakeManager.connect(signers[4]).decreaseCommission(updatedCommission1);
      await assertRevert(tx, 'Invalid Commission Update');
      await stakeManager.connect(signers[4]).decreaseCommission(updatedCommission2);
      assert.isAbove(earlierCommission, updatedCommission2, 'Commission is decreased');
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

    it('Delegator should be able to unstake when there is no existing lock', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const amount = tokenAmount('10000'); // unstaking partial amount
      const staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
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
      let staker = await stakeManager.getStaker(4);
      const prevStake = (staker.stake); // 520000
      const prevBalance = await razor.balanceOf(signers[5].address);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      let rAmount = (lock.amount.mul(staker.stake)).div(totalSupply); // 10000

      const newStake = prevStake.sub(rAmount); // 510000
      const commission = (rAmount.mul(staker.commission)).div(100); // 5000

      const stakerPrevBalance = await razor.balanceOf(staker._address);
      await mineToNextEpoch();
      const epoch = await getEpoch();

      await (stakeManager.connect(signers[5]).withdraw(epoch, staker.id));
      staker = await stakeManager.getStaker(4);
      assertBNEqual((staker.stake), (newStake), 'Updated stake is not equal to calculated stake');

      rAmount = rAmount.sub(commission);
      const DelegatorBalance = await razor.balanceOf(signers[5].address);
      const newBalance = prevBalance.add(rAmount);
      assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');
      assertBNEqual(await razor.balanceOf(staker._address), stakerPrevBalance.add(commission), 'Commission to staker is not transfered');
    });

    it('Delegators should receive more amount than expected after withdraw due to increase in valuation of sRZR when chosen staker is rewarded',
      async function () {
        await mineToNextEpoch();
        let epoch = await getEpoch();
        let staker = await stakeManager.getStaker(4);

        // commit
        epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment = utils.solidityKeccak256(
          ['uint32', 'uint32[]', 'bytes32'],
          [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        await voteManager.connect(signers[4]).commit(epoch, commitment);

        // reveal
        await mineToNextState();

        await voteManager.connect(signers[4]).reveal(epoch, votes,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
        // propose
        await mineToNextState();
        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
        const iteration = await getIteration(voteManager, stakeManager, staker);

        await blockManager.connect(signers[4]).propose(epoch,
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          iteration,
          biggestInfluencerId);
        const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
        assertBNEqual(proposedBlock.proposerId, toBigNumber('4'), 'incorrect proposalID'); // 4th staker proposed

        staker = await stakeManager.getStaker(4);
        const stakeBefore = staker.stake;
        await mineToNextState(); // dispute
        await mineToNextState(); // commit again in order to get block reward
        epoch = await getEpoch();
        const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment2 = utils.solidityKeccak256(
          ['uint32', 'uint32[]', 'bytes32'],
          [epoch, votes2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[4]).commit(epoch, commitment2);
        staker = await stakeManager.getStaker(4);
        const stakeAfter = staker.stake;
        assertBNLessThan(stakeBefore, stakeAfter, 'Not rewarded'); // Staker 4 gets Block Reward results in increase of valuation of sRZR

        // Delagator unstakes
        epoch = await getEpoch();
        const amount = tokenAmount('10000'); // unstaking partial amount
        staker = await stakeManager.getStaker(4);
        await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
        let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
        assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
        assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        // Delegator withdraws
        epoch = await getEpoch();
        const prevStake = (staker.stake);
        const prevBalance = await razor.balanceOf(signers[5].address);
        lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
        const sToken = await stakedToken.attach(staker.tokenAddress);
        const totalSupply = await sToken.totalSupply();
        let rAmount = (lock.amount.mul(staker.stake)).div(totalSupply); // 10000
        const newStake = prevStake.sub(rAmount);
        const commission = (rAmount.mul(staker.commission)).div(100); // commission in accordance to rAmount

        // Delegator withdraws
        await (stakeManager.connect(signers[5]).withdraw(epoch, staker.id));
        staker = await stakeManager.getStaker(4);
        assertBNEqual((staker.stake), (newStake), 'Updated stake is not equal to calculated stake'); // checking withdraw is working
        rAmount = rAmount.sub(commission);
        const DelegatorBalance = await razor.balanceOf(signers[5].address);
        const newBalance = prevBalance.add(rAmount);
        assertBNEqual((DelegatorBalance), (newBalance), 'Delagators balance does not match the calculated balance');

        // As staker 4 takes in Block Rewards ,so there is increase in valuation of sRZR
        // due to which rAmount > rAmountUnchanged (Case Unchanged is when 1RZR = 1SRZR)

        let rAmountUnchanged = lock.amount; // Amount to be tranferred to delegator if 1RZR = 1sRZR
        const commissionUnchanged = (rAmountUnchanged.mul(staker.commission)).div(100);// commisson in accordance to rAmountUnchanged where 1RZR= 1sRZR
        rAmountUnchanged = rAmountUnchanged.sub(commissionUnchanged);
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
        const votes1 = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment = utils.solidityKeccak256(
          ['uint32', 'uint32[]', 'bytes32'],
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
        await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
        let lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
        assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
        assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');

        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        epoch = await getEpoch();
        staker = await stakeManager.getStaker(4);
        const prevStake = (staker.stake);
        const prevBalance = await razor.balanceOf(signers[5].address);
        lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
        const sToken = await stakedToken.attach(staker.tokenAddress);
        const totalSupply = await sToken.totalSupply();
        let rAmount = (lock.amount.mul(staker.stake)).div(totalSupply); // 10000
        const newStake = prevStake.sub(rAmount);
        const commission = (rAmount.mul(staker.commission)).div(100); // commission in accordance to rAmount

        // Delegator withdraws
        await (stakeManager.connect(signers[5]).withdraw(epoch, staker.id));
        staker = await stakeManager.getStaker(4);
        assertBNEqual(staker.stake, newStake, 'Updated stake is not equal to calculated stake'); // checking withdraw is working
        rAmount = rAmount.sub(commission);
        const DelegatorBalance = await razor.balanceOf(signers[5].address);
        const newBalance = prevBalance.add(rAmount);
        assertBNEqual(DelegatorBalance, newBalance, 'Delagators balance does not match the calculated balance');

        // As staker 4 takes in inactivity penalty ,so there is decrease in valuation of sRZR
        // due to which rAmount < rAmountUnchanged (Case Unchanged is when 1RZR = 1SRZR)

        let rAmountUnchanged = lock.amount; // Amount to be tranferred to delegator if 1RZR = 1sRZR
        const commissionUnchanged = (rAmountUnchanged.mul(staker.commission)).div(100);// commisson in accordance to rAmountUnchanged where 1RZR= 1sRZR
        rAmountUnchanged = rAmountUnchanged.sub(commissionUnchanged);
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
      const withdrawWithin = await parameters.withdrawReleasePeriod();

      // Delegator withdraws
      for (let i = 0; i < withdrawWithin + 1; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      const tx = stakeManager.connect(signers[5]).withdraw(epoch, staker.id);
      await assertRevert(tx, 'Release Period Passed');
    }).timeout(100000);

    it('Delegator/Staker should not be able to call resetlock if contract is paused', async function () {
      const staker = await stakeManager.getStaker(4);
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[5]).resetLock(staker.id);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Delegetor/Staker should be penalized when calling reset lock', async function () {
      let staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken.totalSupply();
      const resetLockPenalty = await parameters.resetLockPenalty();
      const penalty = ((staker.stake).mul(resetLockPenalty)).div(100);
      const newStake = (staker.stake).sub(penalty);
      staker = await stakeManager.getStaker(4);
      const sAmount = (penalty.mul(totalSupply)).div(staker.stake); // converting penalty into sAmount which would be burnt
      await stakeManager.connect(signers[5]).resetLock(staker.id);
      staker = await stakeManager.getStaker(4);
      assertBNEqual(await sToken.totalSupply(), totalSupply.sub(sAmount), 'Total Supply of sRZR is not equal to calculated total supply');
      assertBNEqual((staker.stake), (newStake), 'Stake is not equal to calculated stake');
    });

    it('Delegetor/Staker should be able to unstake after reset lock', async function () {
      const staker = await stakeManager.getStaker(4);
      const amount = tokenAmount('10000');
      const epoch = await getEpoch();
      await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      assertBNEqual(lock.amount, amount, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
    });

    it('if delegator transfer its sRZR to other account,than other account becomes the delegator who can unstake/withdraw', async function () {
      let staker = await stakeManager.getStaker(4);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const amount = await sToken.balanceOf(signers[5].address);
      await sToken.connect(signers[5]).transfer(signers[6].address, amount); // signers[6] becomes new delegator.

      // new delegator should be able to unstake
      staker = await stakeManager.getStaker(4);
      const amount1 = tokenAmount('10000');
      let epoch = await getEpoch();
      await stakeManager.connect(signers[6]).unstake(epoch, staker.id, amount1);
      const lock = await stakeManager.locks(signers[6].address, staker.tokenAddress);
      assertBNEqual(lock.amount, amount1, 'Locked amount is not equal to requested lock amount');
      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD, 'Withdraw after for the lock is incorrect');
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
        await mineToNextEpoch();
      }

      // new delegator should be able to withdraw
      const prevStake = (staker.stake);
      const prevBalance = await razor.balanceOf(signers[6].address);
      const lock1 = await stakeManager.locks(signers[6].address, staker.tokenAddress);
      const sToken1 = await stakedToken.attach(staker.tokenAddress);
      const totalSupply = await sToken1.totalSupply();
      let rAmount = (lock1.amount.mul(staker.stake)).div(totalSupply);

      const newStake = prevStake.sub(rAmount);
      const commission = (rAmount.mul(staker.commission)).div(100);

      epoch = await getEpoch();
      await (stakeManager.connect(signers[6]).withdraw(epoch, staker.id));
      staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.stake, newStake, 'Updated stake is not equal to calculated stake');

      rAmount = rAmount.sub(commission);
      const DelegatorBalance = await razor.balanceOf(signers[6].address);
      const newBalance = prevBalance.add(rAmount);
      assertBNEqual(DelegatorBalance, newBalance, 'Delagators balance does not match the calculated balance');
    });

    it('should not allow staker to add stake after being slashed the whole amount', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('423000');
      await razor.connect(signers[7]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[7]).stake(epoch, stake1);
      const stakerIdAcc7 = await stakeManager.stakerIds(signers[7].address);
      await parameters.setSlashPenaltyNum(10000);
      await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
      await stakeManager.slash(stakerIdAcc7, signers[10].address, epoch); // slashing whole stake of signers[7]
      const stake2 = tokenAmount('20000');
      await razor.connect(signers[7]).approve(stakeManager.address, stake2);
      const tx = stakeManager.connect(signers[7]).stake(epoch, stake2);
      await assertRevert(tx, 'Stakers Stake is 0');
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
    });

    it('admin should not be able to withdraw funds if escape hatch is disabled', async function () {
      await razor.connect(signers[0]).transfer(stakeManager.address, toBigNumber(10000));
      const balanceContractBefore = await razor.balanceOf(stakeManager.address);
      const balanceAdminBefore = await razor.balanceOf(signers[0].address);
      await parameters.connect(signers[0]).disableEscapeHatch();
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
      const tx = stakeManager.connect(signers[5]).delegate(epoch, delegatedStake, stakerId);
      await assertRevert(tx, 'paused');
    });

    it('Staker should not be able to unstake if contract is paused', async function () {
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const amount = tokenAmount('20000');
      const tx = stakeManager.connect(signers[4]).unstake(epoch, stakerId, amount);
      await assertRevert(tx, 'paused');
      await stakeManager.connect(signers[0]).unpause();
    });

    it('Staker should not be able to withdraw if contract is paused', async function () {
      let epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      let staker = await stakeManager.getStaker(stakerId);
      const amount = tokenAmount('20000');
      await stakeManager.connect(signers[4]).unstake(epoch, stakerId, amount);
      for (let i = 0; i < WITHDRAW_LOCK_PERIOD - 1; i++) {
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      const prevStake = staker.stake;
      const prevBalance = await razor.balanceOf(staker._address);
      await mineToNextEpoch();
      epoch = await getEpoch();
      await stakeManager.connect(signers[0]).pause();
      const tx = stakeManager.connect(signers[4]).withdraw(epoch, stakerId);
      const presentBalance = await razor.balanceOf(staker._address);
      staker = await stakeManager.getStaker(stakerId);
      await assertRevert(tx, 'paused');
      assertBNEqual(prevStake, staker.stake, "Staker's stake changed");
      assertBNEqual(prevBalance, presentBalance, "Staker's razor balance changed");
    });
  });
});
