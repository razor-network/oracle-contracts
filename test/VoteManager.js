/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const merkle = require('@razor-network/merkle');
const { BigNumber, utils } = require('ethers');
const { NUM_BLOCKS, ONE_ETHER } = require('./helpers/constants');
const {
  getEpoch,
  getIteration,
  getBiggestStakeAndId,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const { assertBNEqual } = require('./helpers/utils');

describe('VoteManager', function () {
  describe('BlockManager', function () {
    let signers;
    let blockManager;
    let random;
    let schellingCoin;
    let stakeManager;
    let stateManager;
    let voteManager;

    before(async () => {
      ({
        blockManager, random, schellingCoin, stakeManager, stateManager, voteManager,
      } = await setupContracts());
      signers = await ethers.getSigners();
    });

    describe('SchellingCoin', async function () {
      it('should be able to initialize', async function () {
      // await stateManager.setEpoch(1)
      // await stateManager.setState(0)
        await mineToNextEpoch();
        await schellingCoin.transfer(signers[3].address, BigNumber.from(423000).mul(ONE_ETHER));
        await schellingCoin.transfer(signers[4].address, BigNumber.from(19000).mul(ONE_ETHER));
        await schellingCoin.connect(signers[3]).approve(stakeManager.address, BigNumber.from(420000).mul(ONE_ETHER));
        await schellingCoin.connect(signers[4]).approve(stakeManager.address, BigNumber.from(19000).mul(ONE_ETHER));
        const epoch = await getEpoch();
        await stakeManager.connect(signers[3]).stake(epoch, BigNumber.from(420000).mul(ONE_ETHER));
        await stakeManager.connect(signers[4]).stake(epoch, BigNumber.from(19000).mul(ONE_ETHER));
      // await schellingCoin.transfer(signers[3].address, 800000, { 'from': signers[0].address})
      // await schellingCoin.transfer(signers[4].address, 600000, { 'from': signers[0].address})
      // await schellingCoin.transfer(signers[5].address, 2000, { 'from': signers[0].address})
      // await schellingCoin.transfer(signers[6].address, 700000, { 'from': signers[0].address})
      // await schellingCoin.transfer(signers[7].address, 3000, { 'from': signers[0].address})
      // await schellingCoin.transfer(signers[8].address, 4000, { 'from': signers[0].address})
      // await schellingCoin.transfer(signers[9].address, 5000, { 'from': signers[0].address})
      // await schellingCoin.transfer(signers[10].address, 6000, { 'from': signers[0].address})
      });

      it('should be able to commit', async function () {
        const epoch = await getEpoch();
        // await stateManager.setEpoch(3)
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[3]).commit(epoch, commitment1);
        // arguments getCommitment => epoch number and stakerId
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const commitment2 = await voteManager.getCommitment(epoch, stakerIdAcc3);

        assert(commitment1 === commitment2, 'commitment1, commitment2 not equal');

        const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const tree2 = merkle('keccak256').sync(votes2);
        const root2 = tree2.root();
        const commitment3 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[4]).commit(epoch, commitment3);
      });

      it('should be able to reveal', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;

        // await stateManager.setEpoch(3)
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        // console.log(tree.root())
        // await stateManager.setState(1)
        await mineToNextState(); // reveal

        // let root = tree.root()
        // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assert(Number((await voteManager.getVote(epoch, stakerIdAcc3, 0)).value) === 100, 'Vote not equal to 100');

        const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const tree2 = merkle('keccak256').sync(votes2);
        const root2 = tree2.root();
        const proof2 = [];
        for (let i = 0; i < votes2.length; i++) {
          proof2.push(tree2.getProofPath(i, true, true));
        }

        await voteManager.connect(signers[4]).reveal(epoch, root2, votes2, proof2,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[4].address);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNEqual(stakeBefore, stakeAfter);
      });

      it('should be able to commit again with correct rewards', async function () {
        let epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const numStakers = await stakeManager.getNumStakers();
        const stake = Number(staker.stake);
        const stakerId = Number(staker.id);
        // await stateManager.setEpoch(3)
        const biggestStake = (await getBiggestStakeAndId(stakeManager))[0];
        // console.log('biggestStake', biggestStake)
        const biggestStakerId = (await getBiggestStakeAndId(stakeManager))[1];
        // console.log('biggestStakerId', biggestStakerId)
        const blockHashes = await random.blockHashes(NUM_BLOCKS);
        // console.log(' biggestStake, stake, stakerId, numStakers, blockHashes', biggestStake, stake, stakerId, numStakers, blockHashes)
        const iteration = await getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes);
        await mineToNextState(); // propose
        await blockManager.connect(signers[3]).propose(epoch,
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          [104, 204, 304, 404, 504, 604, 704, 804, 904],
          iteration,
          biggestStakerId);

        const stakeBefore = Number((await stakeManager.stakers(stakerIdAcc3)).stake);
        const stakeBefore2 = Number((await stakeManager.stakers(stakerIdAcc4)).stake);
        await mineToNextState(); // dispute
        await mineToNextState(); // commit
        epoch = await stateManager.getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[3]).commit(epoch, commitment1);

        const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const tree2 = merkle('keccak256').sync(votes2);
        const root2 = tree2.root();
        const commitment2 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[4]).commit(epoch, commitment2);
        // arguments getCommitment => epoch number and stakerId
        const commitment3 = await voteManager.getCommitment(epoch, stakerIdAcc3);
        // let commitment2 = await voteManager.getCommitment(epoch, stakerIdAcc3)

        assert(commitment1 === commitment3, 'commitment1, commitment2 not equal');

        const stakeAfter = ((await stakeManager.stakers(stakerIdAcc3)).stake);
        const stakeAfter2 = ((await stakeManager.stakers(stakerIdAcc4)).stake);
        assert(stakeBefore < Number(stakeAfter), 'Not rewarded');
        assert(stakeBefore2 === Number(stakeAfter2), 'Penalty should not be applied');
        const stakeGettingReward = Number(await stakeManager.stakeGettingReward());
        assert(stakeGettingReward === Number(stakeAfter2.add(stakeAfter)), 'Error 3');
      // let votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904]
      // let tree2 = merkle('keccak256').sync(votes2)
      // let root2 = tree2.root()
      // let commitment3 = web3.utils.soliditySha3(epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd')
      // await voteManager.commit(epoch, commitment3, { 'from': signers[4].address})
      });

      it('should be able to reveal again but with no rewards for now', async function () {
        const epoch = await stateManager.getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);

        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake.toString();
        const stakeBefore2 = (await stakeManager.stakers(stakerIdAcc4)).stake.toString();

        // await stateManager.setEpoch(3)
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        // console.log(tree.root())
        // await stateManager.setState(1)

        // let root = tree.root()
        // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const tree2 = merkle('keccak256').sync(votes2);
        // Commented this because it was not being used
        // const root2 = tree2.root();
        const proof2 = [];
        for (let i = 0; i < votes2.length; i++) {
          proof2.push(tree2.getProofPath(i, true, true));
        }

        await mineToNextState(); // reveal

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assert(Number((await voteManager.getVote(epoch, stakerIdAcc3, 0)).value) === 100, 'Vote not equal to 100');

        await voteManager.connect(signers[4]).reveal(epoch, tree2.root(), votes2, proof2,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[4].address);

        const rewardPool = Number(await stakeManager.rewardPool());
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake.toString();
        const stakeAfter2 = (await stakeManager.stakers(stakerIdAcc4)).stake.toString();
        assert(rewardPool === 0);
        assert(stakeBefore === stakeAfter);
        assert(stakeBefore2 === stakeAfter2);
      });

      it('account 4 should be penalised for trying to make fraudulent predictions in the previous epoch', async function () {
        let epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const numStakers = await stakeManager.getNumStakers();
        const stake = Number(staker.stake);
        const stakerId = Number(staker.id);

        const biggestStake = (await getBiggestStakeAndId(stakeManager))[0];

        const biggestStakerId = (await getBiggestStakeAndId(stakeManager))[1];

        const blockHashes = await random.blockHashes(NUM_BLOCKS);

        const iteration = await getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes);
        await mineToNextState(); // propose
        await blockManager.connect(signers[3]).propose(epoch,
          [10, 11, 12, 13, 14, 15, 16, 17, 18],
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          [103, 203, 303, 403, 503, 603, 703, 803, 903],
          iteration,
          biggestStakerId);

        const stakeBefore = ((await stakeManager.stakers(stakerIdAcc3)).stake);
        const stakeBefore2 = ((await stakeManager.stakers(stakerIdAcc4)).stake);
        await mineToNextState(); // dispute
        await mineToNextState(); // commit
        epoch = await stateManager.getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[3]).commit(epoch, commitment1);
        await voteManager.connect(signers[4]).commit(epoch, commitment1);

        const commitment2 = await voteManager.getCommitment(epoch, stakerIdAcc3);

        assert(commitment1 === commitment2, 'commitment1, commitment2 not equal');

        const stakeAfter = ((await stakeManager.stakers(stakerIdAcc3)).stake);
        const stakeAfter2 = ((await stakeManager.stakers(stakerIdAcc4)).stake);
        let penalty = BigNumber.from(0);
        const den = BigNumber.from(1000);
        for (let i = 0; i < votes.length; i++) {
          penalty = penalty.add((stakeBefore2.div(den)));
        }

        assert(Number(stakeBefore) < Number(stakeAfter), 'Not rewarded');
        assert(Number(stakeBefore2.sub(penalty)) === Number(stakeAfter2), 'Penalty should be applied');
        const stakeGettingReward = Number(await stakeManager.stakeGettingReward());
        assert(stakeGettingReward === Number(stakeAfter), 'Error 3');
        const rewardPool = Number(await stakeManager.rewardPool());
        assert(rewardPool === Number(penalty), 'reward pool should not be zero as penalties have been applied');
      });

      it('Account 4 should have his stake slashed for leaking out his secret to another account before the reveal state', async function () {
        const epoch = await getEpoch();

        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakeBefore = Number((await stakeManager.stakers(stakerIdAcc4)).stake);

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        await voteManager.connect(signers[10]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[4].address);

        const stakeAfter = Number((await stakeManager.stakers(stakerIdAcc4)).stake);
        const stakeAcc10 = Number(await schellingCoin.connect(signers[10]).balanceOf(signers[10].address));
        assert(stakeAfter === 0, 'stake should be zero');
        assert(stakeAcc10 === (stakeBefore / 2), 'the bounty hunter should receive half of the stake of account 4');
      });

      it('Account 3 should be able to reveal again with correct rewards', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        const stakeBefore = Number((await stakeManager.stakers(stakerIdAcc3)).stake);

        // await stateManager.setEpoch(3)
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        // console.log(tree.root())
        // await stateManager.setState(1)

        // let root = tree.root()
        // console.log('proofs', [tree.level(1)[1]], [tree.level(1)[0]])
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }
        await mineToNextState(); // reveal
        const rewardPool = Number(await stakeManager.rewardPool());

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assert(Number((await voteManager.getVote(epoch, stakerIdAcc3, 0)).value) === 100, 'Vote not equal to 100');

        const stakeAfter = Number((await stakeManager.stakers(stakerIdAcc3)).stake);
        assert(stakeBefore + rewardPool === stakeAfter);
      });
    });
  });
});
