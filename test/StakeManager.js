/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const merkle = require('@razor-network/merkle');
const { BigNumber, utils } = require('ethers');
const { ONE_ETHER , GRACE_PERIOD} = require('./helpers/constants');
const { getEpoch, mineToNextEpoch, mineToNextState } = require('./helpers/testHelpers');
const { assertRevert } = require('./helpers/utils');
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

    it('should be able to initialize', async function () {
      await mineToNextEpoch();
      const stake1 = BigNumber.from('443000').mul(ONE_ETHER);
      await schellingCoin.transfer(signers[1].address, stake1);
      await schellingCoin.transfer(signers[2].address, stake1);
      await schellingCoin.transfer(signers[3].address , stake1);
    });

    it('should be able to stake', async function () {
      const epoch = await getEpoch();
      const stake1 = BigNumber.from('420000').mul(ONE_ETHER);
      await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[1]).stake(epoch, stake1);
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      assert(stakerId.toString() === '1');
      const numStakers = await stakeManager.numStakers();
      assert(numStakers.toString() === '1');
      const staker = await stakeManager.stakers(1);
      assert(staker.id.toString() === '1');
      assert(staker.stake.toString() === String(stake1));
    });

    it('should handle second staker correctly', async function () {
      const epoch = await getEpoch();
      const stake = BigNumber.from('19000').mul(ONE_ETHER);
      await schellingCoin.connect(signers[2]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[2]).stake(epoch, stake);
      const stakerId = await stakeManager.stakerIds(signers[2].address);
      assert(stakerId.toString() === '2');
      const numStakers = await stakeManager.numStakers();
      assert(numStakers.toString() === '2');
      const staker = await stakeManager.stakers(2);
      assert(staker.id.toString() === '2');
      assert(staker.stake.toString() === String(stake));
    });

    it('getters should work as expected', async function () {
      const stakerId = await stakeManager.stakerIds(signers[1].address);
      assert(stakerId.toString() === String(await stakeManager.getStakerId(signers[1].address)));
      const numStakers = await stakeManager.numStakers();
      assert(numStakers.toString() === String(await stakeManager.getNumStakers()));
      const staker = await stakeManager.stakers(1);
      const staker2 = await stakeManager.getStaker(1);
      assert(staker.id.toString() === String(staker2.id));
      assert(staker.stake.toString() === String(staker2.stake));
    });

    it('should be able to increase stake', async function () {
      const stake = BigNumber.from('3000').mul(ONE_ETHER);
      const stake2 = BigNumber.from('423000').mul(ONE_ETHER);
      await mineToNextEpoch();
      await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake);
      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, stake);
      const staker = await stakeManager.getStaker(1);
      assert(String(staker.stake) === String(stake2));
    });

    it('should be able to reset the lock periods', async function (){
          //let stakeManager = await StakeManager.deployed()
          //let sch = await SchellingCoin.deployed()
          const stake = BigNumber.from('20000').mul(ONE_ETHER);
          const stake2 = BigNumber.from('443000').mul(ONE_ETHER);
          await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake);
          const epoch = await getEpoch();
          await stakeManager.connect(signers[1]).stake(epoch, stake);
          const staker = await stakeManager.getStaker(1);
          assert(String(staker.stake) === String(stake2))
          assert(Number(staker.unstakeAfter) === (epoch+1))
          assert(String(staker.withdrawAfter) === String(0))
        })

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
      assert(Number(staker.unstakeAfter) === 0, 'UnstakeAfter should be zero');
      assert(Number(staker.withdrawAfter) === (epoch + 1), 'withdrawAfter does not match');
    });


    it('should not be able to withdraw before withdraw lock period', async function () {
      const epoch = await getEpoch();
      const tx = stakeManager.connect(signers[1]).withdraw(epoch);
      await assertRevert(tx, "Withdraw epoch not reached");
      const staker = await stakeManager.getStaker(1);
      const stake = BigNumber.from('443000').mul(ONE_ETHER);
      assert(String(staker.stake) === String(stake), 'Stake should not change');
    });

    it('should be able to withdraw after withdraw lock period if didnt reveal in last epoch', async function () {
      const stake = BigNumber.from('443000').mul(ONE_ETHER);
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await (stakeManager.connect(signers[1]).withdraw(epoch));
      let staker = await stakeManager.getStaker(1);
      assert(Number(staker.stake) === 0); // Stake Should be zero
      assert(String(await schellingCoin.balanceOf(signers[1].address)) === String(stake)); // Balance
    });

    it('should not be able to withdraw after withdraw lock period if voted in withdraw lock period', async function () {
      // @notice: Checking for Staker 2
      const stake = BigNumber.from('19000').mul(ONE_ETHER);
      let epoch = await getEpoch();
      await stakeManager.connect(signers[2]).unstake(epoch);
      let staker = await stakeManager.getStaker(2);
      assert(Number(staker.unstakeAfter) === 0, 'UnstakeAfter should be zero');


      // Next Epoch
      await mineToNextEpoch();

      // Participation In Epoch
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      epoch = await getEpoch();

      //Commit
      const commitment1 = web3.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await voteManager.connect(signers[2]).commit(epoch, commitment1);
      await mineToNextState();

      //Reveal
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
      await assertRevert(tx, "Participated in Withdraw lock period, Cant withdraw");
      staker = await stakeManager.getStaker(2);
      assert(String(staker.stake) === String(stake), 'Stake should not change');
    });

    it('should penalize staker if number of inactive epochs > grace_period' , async function(){
      let epoch = await getEpoch();
      const stake = BigNumber.from('443000').mul(ONE_ETHER);
      await schellingCoin.connect(signers[3]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[3]).stake(epoch ,stake);
      let staker = await stakeManager.getStaker(3);
      // Staker 3 stakes in epoch 16

      const epochsJumped = GRACE_PERIOD + 2;
      for(let i = 0;i < epochsJumped ; i++){
        await mineToNextEpoch();
      }
      // Current Epoch is 26 . Staker 3 was inactive for 26 - 16 - 1 = 9 epochs
      // commit
      epoch = await getEpoch();
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);

      //reveal
      await mineToNextState();
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[3].address);
      // Staker 3 commits & reveals in epoch 16 .
      // Staker 3 is penalised because no of inactive epochs (9) > max allowed inactive epochs i.e grace_period (8)
      staker = await stakeManager.stakers(3);
      assert(staker.stake.toString() != stake.toString() , 'Stake should have decreased due to penalty');

    });
    it('should not penalize staker if number of inactive epochs <= grace_period' , async function(){
      await mineToNextEpoch();
      let epoch = await getEpoch();
      let staker = await stakeManager.getStaker(3);
      const stake = staker.stake;
      // Current epoch is 27 .
      // Staker 3 epochLastRevealed = 26 ( previous test )
      const epochsJumped = GRACE_PERIOD ;
      for(let i = 0;i < epochsJumped ; i++){
        await mineToNextEpoch();
      }
      // Current epoch is 35
      // Staker 3 was inactive for 35 - 26 - 1 = 8 epochs
      // commit
      epoch = await getEpoch();
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);

      //reveal
      await mineToNextState();
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[3].address);
      // Staker 3 commits & reveals in epoch 35 .
      // Staker is not penalised because no. of inactive epochs (8) <= max allowed inactive epochs i.e grace_period (8)
      staker = await stakeManager.stakers(3);
      assert(staker.stake.toString() == stake.toString() , 'Stake should have remained the same');

    });
    it('should penalize staker even if they restake and not do commit/reveal in grace_period' , async function(){
      await mineToNextEpoch();
      let epoch = await getEpoch();
      let staker = await stakeManager.getStaker(3);
      const stake = staker.stake;
      // current epoch is 36
      const epochsJumped = GRACE_PERIOD;
      for(let i = 0;i < epochsJumped ; i++){
        await mineToNextEpoch();
      }
      epoch = await getEpoch();
      // current epoch is 44 .
      // epochLastRevealed for staker 3  = 35 ( last test)
      // Staker 3 was inactive for 44 - 35 - 1 = 8 epochs.
      const stake2 = BigNumber.from('23000').mul(ONE_ETHER);
      await schellingCoin.connect(signers[3]).approve(stakeManager.address , stake2);
      await stakeManager.connect(signers[3]).stake(epoch , stake2);
      // Staker 3 restakes during grace_period
      // But epochStaked is not updated , this epoch would still remain be considered as an inactive epoch for staker 3 .
      // no commit/reveal in this epoch

      await mineToNextEpoch();
      epoch = await getEpoch();
      staker = await stakeManager.getStaker(3);
      const newStake = staker.stake;

      //commit in epoch 45 , outside grace_period
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[3]).commit(epoch, commitment1);
      staker = await stakeManager.getStaker(3);
      // Total no of inactive epochs = 45 - 35 - 1 = 9
      // Staker 3 is penalised because total inactive epochs(9) > max allowed inactive epochs i.e grace_period (8)
      assert(staker.stake.toString() != newStake.toString() , 'Stake should have decreased due to inactivity penalty');
    });
  });
});
