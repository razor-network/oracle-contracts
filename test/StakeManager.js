/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const merkle = require('@razor-network/merkle');
const { DEFAULT_ADMIN_ROLE_HASH, GRACE_PERIOD, WITHDRAW_LOCK_PERIOD } = require('./helpers/constants');
const {
  assertBNEqual,
  assertBNLessThan,
  assertBNNotEqual,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');
const { getEpoch, toBigNumber, tokenAmount } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const { assert } = require('chai');

describe('StakeManager', function () {
  describe('SchellingCoin', async function () {
    let signers;
    let schellingCoin;
    let blockManager;
    let parameters;
    let stakeManager;
    let voteManager;
    let initializeContracts;
    let stakedToken;

    before(async () => {
      ({
        schellingCoin,
        blockManager,
        stakeManager,
        parameters,
        voteManager,
        initializeContracts,
        stakedToken
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
        schellingCoin.address,
        voteManager.address,
        blockManager.address,
        parameters.address
      );
      await assertRevert(tx, 'ACL: sender not authorized');
    });

    it('should be able to initialize', async function () {
      await Promise.all(await initializeContracts());

      await mineToNextEpoch();
      const stake1 = tokenAmount('443000');
      await schellingCoin.transfer(signers[1].address, stake1);
      await schellingCoin.transfer(signers[2].address, stake1);
      await schellingCoin.transfer(signers[3].address, stake1);
      await schellingCoin.transfer(signers[4].address, stake1);  // Chosen Staker by the Delegator
      await schellingCoin.transfer(signers[5].address, stake1);  // Delegator
    });

    it('should be able to stake', async function () {
      const epoch = await getEpoch();
      const stake1 = tokenAmount('420000');
      await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[1]).stake(epoch, stake1);
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      assertBNEqual(stakerId, toBigNumber('1'));
      const numStakers = await stakeManager.numStakers();
      assertBNEqual(numStakers, toBigNumber('1'));
      const staker = await stakeManager.stakers(1);
      assertBNEqual(staker.id, toBigNumber('1'));
      assertBNEqual(staker.stake, stake1);
    });

    it('should handle second staker correctly', async function () {
      const epoch = await getEpoch();
      const stake = tokenAmount('19000');
      await schellingCoin.connect(signers[2]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[2]).stake(epoch, stake);
      const stakerId = await stakeManager.stakerIds(signers[2].address);
      assertBNEqual(stakerId, toBigNumber('2'));
      const numStakers = await stakeManager.numStakers();
      assertBNEqual(numStakers, toBigNumber('2'));
      const staker = await stakeManager.stakers(2);
      assertBNEqual(staker.id, toBigNumber('2'));
      assertBNEqual(staker.stake, stake);
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
      await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake);
      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, stake);
      const staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, stake2);
    });

    it('should be able to reset the lock periods', async function () {
      // let stakeManager = await StakeManager.deployed()
      // let sch = await SchellingCoin.deployed()
      const stake = tokenAmount('20000');
      const stake2 = tokenAmount('443000');
      await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake);
      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, stake);
      const staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, toBigNumber(stake2));
      assertBNEqual(staker.unstakeAfter, toBigNumber(epoch).add('1'));
      assertBNEqual(staker.withdrawAfter, toBigNumber('0'));
    });

    it('should not be able to unstake before unstake lock period', async function () {
      const epoch = await getEpoch();
      const tx = stakeManager.connect(signers[1]).unstake(epoch);
      await assertRevert(tx, 'revert locked');
    });

    it('should be able to unstake after unstake lock period', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).unstake(epoch);
      const staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.unstakeAfter, toBigNumber('0'), 'UnstakeAfter should be zero');
      assertBNEqual(staker.withdrawAfter, toBigNumber(epoch).add('1'), 'withdrawAfter does not match');
    });

    it('should not be able to withdraw before withdraw lock period', async function () {
      const epoch = await getEpoch();
      const tx = stakeManager.connect(signers[1]).withdraw(epoch);
      await assertRevert(tx, 'Withdraw epoch not reached');
      const staker = await stakeManager.getStaker(1);
      const stake = tokenAmount('443000');
      assertBNEqual(staker.stake, stake, 'Stake should not change');
    });

    it('should be able to withdraw after withdraw lock period if didnt reveal in last epoch', async function () {
      const stake = tokenAmount('443000');
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await (stakeManager.connect(signers[1]).withdraw(epoch));
      const staker = await stakeManager.getStaker(1);
      assertBNEqual(staker.stake, toBigNumber('0')); // Stake Should be zero
      assertBNEqual(await schellingCoin.balanceOf(signers[1].address), stake); // Balance
    });

    it('should not be able to withdraw after withdraw lock period if voted in withdraw lock period', async function () {
      // @notice: Checking for Staker 2
      const stake = tokenAmount('19000');
      let epoch = await getEpoch();
      await stakeManager.connect(signers[2]).unstake(epoch);
      let staker = await stakeManager.getStaker(2);
      assertBNEqual(staker.unstakeAfter, toBigNumber('0'), 'UnstakeAfter should be zero');

      // Next Epoch
      await mineToNextEpoch();

      // Participation In Epoch
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      epoch = await getEpoch();

      // Commit
      const commitment1 = web3.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await voteManager.connect(signers[2]).commit(epoch, commitment1);
      await mineToNextState();

      // Reveal
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[2]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[2].address);

      // Next Epoch
      await mineToNextEpoch();
      epoch = await getEpoch();
      const tx = stakeManager.connect(signers[2]).withdraw(epoch);
      await assertRevert(tx, 'Participated in Withdraw lock period, Cant withdraw');
      staker = await stakeManager.getStaker(2);
      assertBNEqual(staker.stake, stake, 'Stake should not change');
    });
    it('should penalize staker if number of inactive epochs is greater than grace_period', async function () {
      let epoch = await getEpoch();
      const stake = tokenAmount('420000');
      await schellingCoin.connect(signers[3]).approve(stakeManager.address, stake);
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
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      const commitment = web3.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await voteManager.connect(signers[3]).commit(epoch, commitment);

      // reveal
      await mineToNextState();
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[3].address);
      // Staker 3 is penalised because no of inactive epochs (9) > max allowed inactive epochs i.e grace_period (8)
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
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      const commitment = web3.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await voteManager.connect(signers[3]).commit(epoch, commitment);

      // reveal
      await mineToNextState();
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[3].address);
      // Staker is not penalised because no. of inactive epochs (8) <= max allowed inactive epochs i.e grace_period (8)
      staker = await stakeManager.stakers(3);
      assertBNEqual(staker.stake, stake, 'Stake should have remained the same');
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
      await schellingCoin.connect(signers[3]).approve(stakeManager.address, stake2);
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
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      const commitment = web3.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await voteManager.connect(signers[3]).commit(epoch, commitment);
      staker = await stakeManager.getStaker(3);

      // Total no of inactive epochs = 42 - 32 - 1 = 9
      // Staker 3 is penalised because total inactive epochs(9) > max allowed inactive epochs i.e grace_period (8)
      assertBNNotEqual(staker.stake, newStake, 'Stake should have decreased due to inactivity penalty');
    });

    it('chosen staker should accept delegation', async function () {
      const stake1 = tokenAmount('420000');
      const commission = 6;
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await schellingCoin.connect(signers[4]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[4]).stake(epoch, stake1);
      await stakeManager.connect(signers[4]).setDelegationAcceptance('true');
      await stakeManager.connect(signers[4]).setCommission(commission);
      const staker = await stakeManager.getStaker(4);
      const acceptDelegation = staker.acceptDelegation;
      assert.strictEqual(acceptDelegation, true, 'Staker does not accept delgation');
    });

    it('chosen staker should stake atleast once' , async function () {
      
      const staker = await stakeManager.getStaker(4);
      const notAStakerId = toBigNumber('0');
      assertBNNotEqual(staker.id , notAStakerId);
    });

    it('should be able to delegate stake to chosen one', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const stakerId = await stakeManager.stakerIds(signers[4].address);
      const delegatedStake = tokenAmount('100000');
      const stake2 = tokenAmount('520000');
      await schellingCoin.connect(signers[5]).approve(stakeManager.address, delegatedStake);
      await stakeManager.connect(signers[5]).delegate(epoch, delegatedStake, stakerId);
      const staker = await stakeManager.getStaker(4);
      assertBNEqual(staker.stake, stake2);
    });

    it('chosen staker should only be able to decrease the commission' , async function() {
      //const staker = await stakeManager.getStaker(4);
      const earlierCommission = 6; //Current Commission : 6% for staker 4
      const updatedCommission1 = earlierCommission + 1; // 7%
      const updatedCommission2 = earlierCommission - 1; // 5%
      const tx = stakeManager.connect(signers[4]).decreaseCommission(updatedCommission1);
      await assertRevert(tx, 'Invalid Commission Update');
      await stakeManager.connect(signers[4]).decreaseCommission(updatedCommission2);
      assert.isAbove(earlierCommission, updatedCommission2, 'Commission is decreased'); 
    }); 

    it('Delegator should be able to unstake when there is no existing lock', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const amount = tokenAmount('10000'); //unstaking partial amount
      const staker = await stakeManager.getStaker(4);
      await schellingCoin.connect(signers[5]).approve(stakeManager.address, amount);
      await stakeManager.connect(signers[5]).unstake(epoch, staker.id, amount);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      assertBNEqual(lock.amount, amount);
      assertBNEqual(lock.withdrawAfter, epoch + WITHDRAW_LOCK_PERIOD);
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

    it('Delegator should be able to withdraw after withdraw lock period', async function () {
      let epoch = await getEpoch();
      let staker = await stakeManager.getStaker(4);
      const prevStake = (staker.stake); //520000
      const prevBalance = await schellingCoin.balanceOf(signers[5].address);
      const lock = await stakeManager.locks(signers[5].address, staker.tokenAddress);
      const sToken = await stakedToken.attach(staker.tokenAddress);
      const total_supply = await sToken.totalSupply();
      let rAmount = (lock.amount.mul(staker.stake)).div(total_supply); //10000
     
      const newStake = prevStake.sub(rAmount); //510000
      const commission = (rAmount.mul(staker.commission)).div(100); //5000

      await mineToNextEpoch();
      epoch = await getEpoch();
      await (stakeManager.connect(signers[5]).withdraw(epoch, staker.id));
      staker = await stakeManager.getStaker(4);
      assertBNEqual(Number(staker.stake), Number(newStake), 'Stakers stake should have decreased');
      
      rAmount = rAmount.sub(commission);
      const DelegatorBalance = await schellingCoin.balanceOf(signers[5].address);
      const newBalance = prevBalance.add(rAmount);
      assertBNEqual(Number(DelegatorBalance), Number(newBalance) , 'Delegators balance should be equal');
    });

  });
});

