/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const merkle = require('@razor-network/merkle');
const { BigNumber } = require('ethers');
const { ONE_ETHER } = require('./helpers/constants');
const functions = require('./helpers/functions');
const { assertRevert } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testHelpers');

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
      // await stateManager.setEpoch(1)
      await functions.mineToNextEpoch();
      // await stateManager.setState(0)
      const stake1 = BigNumber.from('423000').mul(ONE_ETHER);
      // let stake2 = BigNumber.from('423000e18')
      await schellingCoin.transfer(signers[1].address, stake1);
      await schellingCoin.transfer(signers[2].address, stake1);
    // await schellingCoin.transfer(accounts[3], 800000, { 'from': accounts[0]})
    // await schellingCoin.transfer(accounts[4], 600000, { 'from': accounts[0]})
    // await schellingCoin.transfer(accounts[5], 2000, { 'from': accounts[0]})
    // await schellingCoin.transfer(accounts[6], 700000, { 'from': accounts[0]})
    // await schellingCoin.transfer(accounts[7], 3000, { 'from': accounts[0]})
    // await schellingCoin.transfer(accounts[8], 4000, { 'from': accounts[0]})
    // await schellingCoin.transfer(accounts[9], 5000, { 'from': accounts[0]})
    // await schellingCoin.transfer(accounts[10], 6000, { 'from': accounts[0]})
    });

    it('should be able to stake', async function () {
      const epoch = await functions.getEpoch();
      const stake1 = BigNumber.from('420000').mul(ONE_ETHER);
      await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake1);
      await stakeManager.connect(signers[1]).stake(epoch, stake1);
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      const stakerId = await stakeManager.stakerIds(signers[1].address);
      assert(stakerId.toString() === '1');
      const numStakers = await stakeManager.numStakers();
      assert(numStakers.toString() === '1');
      const staker = await stakeManager.stakers(1);
      assert(staker.id.toString() === '1');
      assert(staker.stake.toString() === String(stake1));
    });

    it('should handle second staker correctly', async function () {
      const epoch = await functions.getEpoch();
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
      // console.log(web3i.eth.accounts)
      // let stateManager = await StateManager.deployed()
      // console.log('epoch, state', Number(await stateManager.getEpoch()), Number(await stateManager.getState()))
      // console.log('epoch', Number(await stakeManager.wtfEpoch()))
      // let sch = await SchellingCoin.deployed()
      // await schellingCoin.approve(stakeManager.address, 420000, { 'from': accounts[1] })
      // await stakeManager.stake(1, 420000, { 'from': accounts[1] })
      // ////console.log('stake gas used, usd cost', tx.receipt.gasUsed, tx.receipt.gasUsed * dollarPerGas)

      const stakerId = await stakeManager.stakerIds(signers[1].address);
      assert(stakerId.toString() === String(await stakeManager.getStakerId(signers[1].address)));
      const numStakers = await stakeManager.numStakers();
      assert(numStakers.toString() === String(await stakeManager.getNumStakers()));
      const staker = await stakeManager.stakers(1);
      const staker2 = await stakeManager.getStaker(1);
      assert(staker.id.toString() === String(staker2.id));
      assert(staker.stake.toString() === String(staker2.stake));
    // let totalStake = await stakeManager.totalStake()
    // assert(totalStake.toString() === '420000')
    });

    it('should be able to increase stake', async function () {
      const stake = BigNumber.from('3000').mul(ONE_ETHER);
      const stake2 = BigNumber.from('423000').mul(ONE_ETHER);

      await schellingCoin.connect(signers[1]).approve(stakeManager.address, stake);
      const epoch = await functions.getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, stake);
      const staker = await stakeManager.getStaker(1);
      assert(String(staker.stake) === String(stake2));
    });

    it('should not be able to unstake before unstake lock period', async function () {
      const epoch = await functions.getEpoch();
      const tx = stakeManager.connect(signers[1]).unstake(epoch);
      await assertRevert(tx, 'revert locked');
    // let staker = await stakeManager.getStaker(1)
    // assert(Number(staker.stake) === 423000)
    });

    it('should be able to unstake after unstake lock period', async function () {
      // await stateManager.setEpoch(2)
      await functions.mineToNextEpoch();
      const epoch = await functions.getEpoch();
      await stakeManager.connect(signers[1]).unstake(epoch);
      const staker = await stakeManager.getStaker(1);
      assert(Number(staker.unstakeAfter) === 0, 'UnstakeAfter should be zero');
      assert(Number(staker.withdrawAfter) === (epoch + 1), 'withdrawAfter does not match');
    });

    it('should not be able to withdraw before withdraw lock period', async function () {
      const epoch = await functions.getEpoch();
      const tx = stakeManager.connect(signers[1]).withdraw(epoch);
      await assertRevert(tx, 'Didnt reveal in last epoch');
      const staker = await stakeManager.getStaker(1);
      const stake = BigNumber.from('423000').mul(ONE_ETHER);
      assert(String(staker.stake) === String(stake), 'Stake should not change');
    });

    it('should not be able to withdraw after withdraw lock period if didnt reveal in last epoch', async function () {
      // await stateManager.setEpoch(3)
      const stake = BigNumber.from('423000').mul(ONE_ETHER);

      await functions.mineToNextEpoch();
      const epoch = await functions.getEpoch();
      const tx = stakeManager.connect(signers[1]).withdraw(epoch);
      await assertRevert(tx, 'Didnt reveal in last epoch');
      const staker = await stakeManager.getStaker(1);
      assert(Number(staker.stake) === Number(stake), 'Stake should not change');
    });

    it('should be able to withdraw after withdraw lock period if revealed in last epoch', async function () {
      const stake = BigNumber.from('423000').mul(ONE_ETHER);

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);
      const root = tree.root();
      const epoch = await functions.getEpoch();
      // Here epoch => Epoch Number, root => Merkle root, 0x72... => random secret
      const commitment1 = web3.utils.soliditySha3(epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      await voteManager.connect(signers[1]).commit(epoch, commitment1);

      // await stateManager.setState(1)
      await functions.mineToNextState();

      // let root = tree.root()
      // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[1]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[1].address);

      // await stateManager.setState(2)
      // let staker = await stakeManager.getStaker(1)
      // let numStakers = await stakeManager.getNumStakers()
      // let stake = Number(staker.stake)
      // let stakerId = Number(staker.id)
      // console.log('stake', stake)
      // let biggestStake = (await functions.getBiggestStakeAndId(stakeManager))[0]
      // console.log('biggestStake', biggestStake)
      // let biggestStakerId = (await functions.getBiggestStakeAndId(stakeManager))[1]
      // console.log('biggestStakerId', biggestStakerId)
      // let blockHashes = await random.blockHashes(numBlocks)
      // console.log(' biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
      // let iteration = await functions.getIteration(stakeManager, random, biggestStake, stake, stakerId, numStakers, blockHashes)
      // console.log('iteration1b', iteration)
      // // await blockManager.propose(3, [100, 200, 300, 400, 500, 600, 700, 800, 900], iteration, biggestStakerId, { 'from': accounts[1] })
      //
      // await stateManager.setEpoch(4)
      // await stateManager.setState(0)
      await functions.mineToNextEpoch();
      // commitment1 = web3.utils.soliditySha3(4, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      // await voteManager.commit(4, commitment1, { 'from': accounts[2] })
      let staker = await stakeManager.getStaker(1);
      // console.log(Number(await staker.stake))
      // console.log(Number(await staker.epochLastRevealed))
      const epochNext = await functions.getEpoch();
      await (stakeManager.connect(signers[1]).withdraw(epochNext));
      staker = await stakeManager.getStaker(1);
      // console.log(Number(await staker.stake))
      assert(Number(staker.stake) === 0);
      // console.log('bal', Number(await schellingCoin.balanceOf(accounts[1])))
      assert(String(await schellingCoin.balanceOf(signers[1].address)) === String(stake));
    });
  });
});
