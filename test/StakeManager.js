/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const merkle = require('@razor-network/merkle');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const {
  assertBNEqual,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');
const { getEpoch, toBigNumber, tokenAmount } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');

describe('StakeManager', function () {
  
  describe('SchellingCoin', async function () {
    let signers;
    let schellingCoin;
    let stakeManager;
    let voteManager;

    before(async () => {
      ({ schellingCoin, stakeManager, voteManager } = await setupContracts());
      signers = await ethers.getSigners();
    });
    
    it('admin role should be granted', async () => {
      const isAdminRoleGranted = await stakeManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
      assert(isAdminRoleGranted === true, "Admin role was not Granted");
    });

    it('should be able to initialize', async function () {
      await mineToNextEpoch();
      const stake1 = tokenAmount('443000');
      await schellingCoin.transfer(signers[1].address, stake1);
      await schellingCoin.transfer(signers[2].address, stake1);
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
  });
});
