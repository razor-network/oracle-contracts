/* TODO:
test same vote values, stakes
test penalizeEpochs */

const merkle = require('@razor-network/merkle');
const {
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const { ONE_ETHER, NUM_BLOCKS, DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');

const { BigNumber, utils } = ethers;

describe('BlockManager', function () {
  let signers;
  let blockManager;
  let random;
  let schellingCoin;
  let stakeManager;
  let voteManager;

  before(async () => {
    ({
      blockManager, random, schellingCoin, stakeManager, voteManager,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('SchellingCoin', async () => {
    it('Admin role should be granted',async () => {

      assert(await blockManager.hasRole(DEFAULT_ADMIN_ROLE_HASH,signers[0].address)===true,"Role was not Granted")

    });
    it('should be able to initialize', async () => {
      await mineToNextEpoch();
      await schellingCoin.transfer(signers[5].address, BigNumber.from(423000).mul(ONE_ETHER));
      await schellingCoin.transfer(signers[6].address, BigNumber.from(19000).mul(ONE_ETHER));

      await schellingCoin.connect(signers[5]).approve(stakeManager.address, BigNumber.from(420000).mul(ONE_ETHER));
      const epoch = await getEpoch();
      await stakeManager.connect(signers[5]).stake(epoch, BigNumber.from(420000).mul(ONE_ETHER));

      await schellingCoin.connect(signers[6]).approve(stakeManager.address, BigNumber.from(18000).mul(ONE_ETHER));
      await stakeManager.connect(signers[6]).stake(epoch, BigNumber.from(18000).mul(ONE_ETHER));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree2 = merkle('keccak256').sync(votes2);

      const root2 = tree2.root();
      const commitment2 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[6]).commit(epoch, commitment2);

      await mineToNextState();

      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[5]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[5].address);

      const proof2 = [];
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[6]).reveal(epoch, tree2.root(), votes2, proof2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[6].address);
    });

    it('should be able to propose', async function () {
      const epoch = await getEpoch();

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);
      const numStakers = await stakeManager.getNumStakers();
      const stake = Number(staker.stake);
      const stakerId = Number(staker.id);

      const biggestStake = (await getBiggestStakeAndId(stakeManager))[0];
      const biggestStakerId = (await getBiggestStakeAndId(stakeManager))[1];
      const blockHashes = await random.blockHashes(NUM_BLOCKS);
      const iteration = await getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes);

      await blockManager.connect(signers[5]).propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        [99, 199, 299, 399, 499, 599, 699, 799, 899],
        [101, 201, 301, 401, 501, 601, 701, 801, 901],
        iteration,
        biggestStakerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assert(Number(proposedBlock.proposerId) === 1, 'incorrect proposalID');
    });

    it('Number of proposals should be 1', async function () {
      const epoch = await getEpoch();

      const nblocks = await blockManager.getNumProposedBlocks(epoch);

      assert(Number(nblocks) === 1, 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('should allow another proposals', async function () {
      const epoch = await getEpoch();

      const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
      const staker = await stakeManager.getStaker(stakerIdAcc6);
      const numStakers = await stakeManager.getNumStakers();
      const stake = Number(staker.stake);
      const stakerId = Number(staker.id);

      const biggestStake = (await getBiggestStakeAndId(stakeManager))[0];
      const biggestStakerId = (await getBiggestStakeAndId(stakeManager))[1];
      const blockHashes = await random.blockHashes(NUM_BLOCKS);

      const iteration = await getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes);

      await blockManager.connect(signers[6]).propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        [99, 199, 299, 399, 499, 599, 699, 799, 899],
        [101, 201, 301, 401, 501, 601, 701, 801, 901],
        iteration,
        biggestStakerId);

      const proposedBlock = await blockManager.proposedBlocks(epoch, 1);
      assert(Number(proposedBlock.proposerId) === 2);
    });

    it('Number of proposals should be 2', async function () {
      const epoch = await getEpoch();

      const nblocks = await blockManager.getNumProposedBlocks(epoch);

      assert(Number(nblocks) === 2, 'Only one block has been proposed till now. Incorrect Answer');
    });

    it('should be able to dispute', async function () {
      await mineToNextState();
      const epoch = await getEpoch();

      const sortedVotes = [200];
      const weights = [BigNumber.from(420000).mul(ONE_ETHER), BigNumber.from(18000).mul(ONE_ETHER)];

      // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
      // We should rethink about overloading functions.
      const totalStakeRevealed = Number(await voteManager['getTotalStakeRevealed(uint256,uint256)'](epoch, 1));
      const medianWeight = Math.floor(totalStakeRevealed / 2);
      const lowerCutoffWeight = Math.floor(totalStakeRevealed / 4);
      const higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4);
      let i = 0;
      let median = 0;
      let lowerCutoff = 0;
      let higherCutoff = 0;
      let weight = 0;
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i];
        if (weight > medianWeight && median === 0) median = sortedVotes[i];
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes[i];
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes[i];
      }

      await blockManager.connect(signers[19]).giveSorted(epoch, 1, sortedVotes);

      assert(Number((await blockManager.disputes(epoch, signers[19].address)).assetId) === 1, 'assetId not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).median) === median, 'median not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).lastVisited) === sortedVotes[sortedVotes.length - 1], 'lastVisited not matching');
    });

    it('should be able to finalize Dispute', async function () {
      const epoch = await getEpoch();
      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assert((await proposedBlock.valid) === false);
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      assert(Number((await stakeManager.getStaker(stakerIdAcc5)).stake) === 0);
      assert(Number(await schellingCoin.balanceOf(signers[19].address)) === Number(BigNumber.from(210000).mul(ONE_ETHER)));
    });

    it('block proposed by account 6 should be confirmed', async function () {
      await mineToNextState();
      await schellingCoin.connect(signers[0]).transfer(signers[7].address, BigNumber.from(20000).mul(ONE_ETHER));

      const epoch = await getEpoch();

      await schellingCoin.connect(signers[7]).approve(stakeManager.address, BigNumber.from(19000).mul(ONE_ETHER));
      await stakeManager.connect(signers[7]).stake(epoch, BigNumber.from(19000).mul(ONE_ETHER));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[6]).commit(epoch, commitment1);

      const votes2 = [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010];
      const tree2 = merkle('keccak256').sync(votes2);

      const root2 = tree2.root();
      const commitment2 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[7]).commit(epoch, commitment2);

      assert(Number((await blockManager.getBlock(epoch - 1)).proposerId) === Number(await stakeManager.stakerIds(signers[6].address)), `${await stakeManager.stakerIds(signers[6].address)} ID is the one who proposed the block `);

      await mineToNextState();

      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[6]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[6].address);

      const proof2 = [];
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[7]).reveal(epoch, tree2.root(), votes2, proof2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[7].address);
    });

    it('all blocks being disputed', async function () {
      const epoch = await getEpoch();

      const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
      const staker6 = await stakeManager.getStaker(stakerIdAcc6);
      const stake6 = Number(staker6.stake);
      const stakerId6 = Number(staker6.id);

      const numStakers = await stakeManager.getNumStakers();
      const biggestStake = (await getBiggestStakeAndId(stakeManager))[0];
      const biggestStakerId = (await getBiggestStakeAndId(stakeManager))[1];
      const blockHashes = await random.blockHashes(NUM_BLOCKS);

      const iteration6 = await getIteration(random, biggestStake, stake6, stakerId6, numStakers, blockHashes);

      const stakerIdAcc7 = await stakeManager.stakerIds(signers[7].address);
      const staker7 = await stakeManager.getStaker(stakerIdAcc7);
      const stake7 = Number(staker7.stake);
      const stakerId7 = Number(staker7.id);

      const iteration7 = await getIteration(random, biggestStake, stake7, stakerId7, numStakers, blockHashes);

      await mineToNextState();

      await blockManager.connect(signers[6]).propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1000, 2001, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010],
        iteration6,
        biggestStakerId);

      await blockManager.connect(signers[7]).propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1000, 2000, 3001, 4000, 5000, 6000, 7000, 8000, 9000],
        [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1010, 2010, 3010, 4010, 5010, 6010, 7010, 8010, 9010],
        iteration7,
        biggestStakerId);

      await mineToNextState();

      const sortedVotes1 = [2000, 2010];
      const sortedVotes2 = [3000, 3010];
      const weights = [BigNumber.from(18000).mul(ONE_ETHER), BigNumber.from(19000).mul(ONE_ETHER)];

      // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
      // We should rethink about overloading functions.
      let totalStakeRevealed = Number(await voteManager['getTotalStakeRevealed(uint256,uint256)'](epoch, 1));
      let medianWeight = Math.floor(totalStakeRevealed / 2);
      let lowerCutoffWeight = Math.floor(totalStakeRevealed / 4);
      let higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4);
      let i = 0;
      let median = 0;
      let lowerCutoff = 0;
      let higherCutoff = 0;
      let weight = 0;
      for (i = 0; i < sortedVotes1.length; i++) {
        weight += weights[i];
        if (weight > medianWeight && median === 0) median = sortedVotes1[i];
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes1[i];
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes1[i];
      }

      await blockManager.connect(signers[19]).giveSorted(epoch, 1, sortedVotes1);

      assert(Number((await blockManager.disputes(epoch, signers[19].address)).assetId) === 1, 'assetId not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).median) === median, 'median not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).lastVisited) === sortedVotes1[sortedVotes1.length - 1], 'lastVisited not matching');

      await blockManager.connect(signers[19]).finalizeDispute(epoch, 0);
      let proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assert((await proposedBlock.valid) === false);

      // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
      // We should rethink about overloading functions.
      totalStakeRevealed = Number(await voteManager['getTotalStakeRevealed(uint256,uint256)'](epoch, 2));
      medianWeight = Math.floor(totalStakeRevealed / 2);
      lowerCutoffWeight = Math.floor(totalStakeRevealed / 4);
      higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4);
      i = 0;
      median = 0;
      lowerCutoff = 0;
      higherCutoff = 0;
      weight = 0;
      for (i = 0; i < sortedVotes2.length; i++) {
        weight += weights[i];
        if (weight > medianWeight && median === 0) median = sortedVotes2[i];
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes2[i];
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes2[i];
      }

      await blockManager.connect(signers[15]).giveSorted(epoch, 2, sortedVotes2);

      assert(Number((await blockManager.disputes(epoch, signers[15].address)).assetId) === 2, 'assetId not matching');
      assert(Number((await blockManager.disputes(epoch, signers[15].address)).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching');
      assert(Number((await blockManager.disputes(epoch, signers[15].address)).median) === median, 'median not matching');
      assert(Number((await blockManager.disputes(epoch, signers[15].address)).lastVisited) === sortedVotes2[sortedVotes2.length - 1], 'lastVisited not matching');

      await blockManager.connect(signers[15]).finalizeDispute(epoch, 1);
      proposedBlock = await blockManager.proposedBlocks(epoch, 1);
      assert((await proposedBlock.valid) === false);
    });

    it('no block should be confirmed in the previous epoch', async function () {
      await mineToNextState();
      const epoch = await getEpoch();

      await schellingCoin.connect(signers[19]).approve(stakeManager.address, BigNumber.from(19000).mul(ONE_ETHER));
      await stakeManager.connect(signers[19]).stake(epoch, BigNumber.from(19000).mul(ONE_ETHER));

      const votes = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[19]).commit(epoch, commitment1);

      assert(Number((await blockManager.getBlock(epoch - 1)).proposerId) === 0);
      assert((await blockManager.getBlock(epoch - 1)).valid === false);
      assert(Number(((await blockManager.getBlock(epoch - 1)).medians).length) === 0);

      await mineToNextState();

      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[19]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[19].address);
    });

    it('should be able to reset dispute incase of wrong values being entered', async function () {
      const epoch = await getEpoch();

      await mineToNextState();
      const stakerIdAcc20 = await stakeManager.stakerIds(signers[19].address);
      const staker = await stakeManager.getStaker(stakerIdAcc20);
      const numStakers = await stakeManager.getNumStakers();
      const stake = Number(staker.stake);
      const stakerId = Number(staker.id);

      const biggestStake = (await getBiggestStakeAndId(stakeManager))[0];

      const biggestStakerId = (await getBiggestStakeAndId(stakeManager))[1];

      const blockHashes = await random.blockHashes(NUM_BLOCKS);

      const iteration = await getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes);
      await blockManager.connect(signers[19]).propose(epoch,
        [10, 12, 13, 14, 15, 16, 17, 18, 19],
        [1000, 2001, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000],
        [1002, 2002, 3002, 4002, 5002, 6002, 7002, 8002, 9002],
        iteration,
        biggestStakerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assert(Number(proposedBlock.proposerId) === 4, 'incorrect proposalID');

      await mineToNextState();
      // typing error
      const sortedVotes = [20000];
      const weights = [BigNumber.from(19000).mul(ONE_ETHER)];

      // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
      // We should rethink about overloading functions.
      const totalStakeRevealed = Number(await voteManager['getTotalStakeRevealed(uint256,uint256)'](epoch, 1));
      const medianWeight = Math.floor(totalStakeRevealed / 2);
      const lowerCutoffWeight = Math.floor(totalStakeRevealed / 4);
      const higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4);
      let i = 0;
      let median = 0;
      let lowerCutoff = 0;
      let higherCutoff = 0;
      let weight = 0;
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i];
        if (weight > medianWeight && median === 0) median = sortedVotes[i];
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes[i];
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes[i];
      }

      await blockManager.connect(signers[15]).giveSorted(epoch, 1, sortedVotes);

      assert(Number((await blockManager.disputes(epoch, signers[15].address)).assetId) === 1, 'assetId not matching');

      await blockManager.connect(signers[15]).resetDispute(epoch);

      assert(Number((await blockManager.disputes(epoch, signers[15].address)).assetId) === 0, 'assetId not matching');
      assert(Number((await blockManager.disputes(epoch, signers[15].address)).median) === 0, 'median not matching');
      assert(Number((await blockManager.disputes(epoch, signers[15].address)).lowerCutoff) === 0, 'lowerCutoff not matching');
      assert(Number((await blockManager.disputes(epoch, signers[15].address)).higherCutoff) === 0, 'higherCutoff not matching');
    });

    it('should be able to dispute in batches', async function () {
      // Commit
      await mineToNextEpoch();
      await schellingCoin.transfer(signers[5].address, BigNumber.from(423000).mul(ONE_ETHER));
      await schellingCoin.transfer(signers[6].address, BigNumber.from(19000).mul(ONE_ETHER));
      let epoch = await getEpoch();
      await schellingCoin.connect(signers[5]).approve(stakeManager.address, BigNumber.from(420000).mul(ONE_ETHER));

      await stakeManager.connect(signers[5]).stake(epoch, BigNumber.from(420000).mul(ONE_ETHER));

      await schellingCoin.connect(signers[6]).approve(stakeManager.address, BigNumber.from(18000).mul(ONE_ETHER));
      await stakeManager.connect(signers[6]).stake(epoch, BigNumber.from(18000).mul(ONE_ETHER));

      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree = merkle('keccak256').sync(votes);

      const root = tree.root();
      const commitment1 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      const tree2 = merkle('keccak256').sync(votes2);

      const root2 = tree2.root();
      const commitment2 = utils.solidityKeccak256(
        ['uint256', 'uint256', 'bytes32'],
        [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[6]).commit(epoch, commitment2);

      // Reveal
      await mineToNextState();
      const proof = [];
      for (let i = 0; i < votes.length; i++) {
        proof.push(tree.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[5]).reveal(epoch, tree.root(), votes, proof,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[5].address);

      const proof2 = [];
      for (let i = 0; i < votes2.length; i++) {
        proof2.push(tree2.getProofPath(i, true, true));
      }
      await voteManager.connect(signers[6]).reveal(epoch, tree2.root(), votes2, proof2,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
        signers[6].address);

      // Propose
      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);
      const numStakers = await stakeManager.getNumStakers();
      const stake = Number(staker.stake);
      const stakerId = Number(staker.id);

      const biggestStake = (await getBiggestStakeAndId(stakeManager))[0];

      const biggestStakerId = (await getBiggestStakeAndId(stakeManager))[1];

      const blockHashes = await random.blockHashes(NUM_BLOCKS);

      const iteration = await getIteration(random, biggestStake, stake, stakerId, numStakers, blockHashes);

      await blockManager.connect(signers[5]).propose(epoch,
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
        [100, 201, 300, 400, 500, 600, 700, 800, 900],
        [99, 199, 299, 399, 499, 599, 699, 799, 899],
        [101, 201, 301, 401, 501, 601, 701, 801, 901],
        iteration,
        biggestStakerId);
      const proposedBlock = await blockManager.proposedBlocks(epoch, 0);
      assert(Number(proposedBlock.proposerId) === 1, 'incorrect proposalID');

      // Dispute
      await mineToNextState();
      epoch = await getEpoch();
      const sortedVotes = [200];
      const weights = [BigNumber.from(420000).mul(ONE_ETHER), BigNumber.from(18000).mul(ONE_ETHER)];

      // See issue https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458360013
      // We should rethink about overloading functions.
      const totalStakeRevealed = Number(await voteManager['getTotalStakeRevealed(uint256,uint256)'](epoch, 1));
      const medianWeight = Math.floor(totalStakeRevealed / 2);
      const lowerCutoffWeight = Math.floor(totalStakeRevealed / 4);
      const higherCutoffWeight = Math.floor(totalStakeRevealed * 3 / 4);
      let i = 0;
      let median = 0;
      let lowerCutoff = 0;
      let higherCutoff = 0;
      let weight = 0;
      for (i = 0; i < sortedVotes.length; i++) {
        weight += weights[i];
        if (weight > medianWeight && median === 0) median = sortedVotes[i];
        if (weight > lowerCutoffWeight && lowerCutoff === 0) lowerCutoff = sortedVotes[i];
        if (weight > higherCutoffWeight && higherCutoff === 0) higherCutoff = sortedVotes[i];
      }

      // Dispute in batches
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, sortedVotes.slice(0, 51));
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, sortedVotes.slice(51, 101));
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, sortedVotes.slice(101, 151));
      await blockManager.connect(signers[19]).giveSorted(epoch, 1, sortedVotes.slice(151, 201));

      assert(Number((await blockManager.disputes(epoch, signers[19].address)).assetId) === 1, 'assetId not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).accWeight) === totalStakeRevealed, 'totalStakeRevealed not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).median) === median, 'median not matching');
      assert(Number((await blockManager.disputes(epoch, signers[19].address)).lastVisited) === sortedVotes[sortedVotes.length - 1], 'lastVisited not matching');
    });
  });
});
