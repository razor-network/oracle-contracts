/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const merkle = require('@razor-network/merkle');
const { utils } = require('ethers');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const {
  assertBNEqual,
  assertBNLessThan,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  getEpoch,
  getIteration,
  getBiggestInfluenceAndId,
  toBigNumber,
  tokenAmount,
} = require('./helpers/utils');

describe('VoteManager', function () {
  describe('BlockManager', function () {
    let signers;
    let blockManager;
    let parameters;
    let razor;
    let stakeManager;
    let rewardManager;
    let voteManager;
    let initializeContracts;

    before(async () => {
      ({
        blockManager, parameters, razor, stakeManager, rewardManager, voteManager, initializeContracts,
      } = await setupContracts());
      signers = await ethers.getSigners();
    });

    describe('razor', async function () {
      it('admin role should be granted', async () => {
        const isAdminRoleGranted = await stakeManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
        assert(isAdminRoleGranted === true, 'Admin role was not Granted');
      });

      it('should not be able to commit without initialization', async () => {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        const tx = voteManager.connect(signers[5]).commit(epoch, commitment1);

        await assertRevert(tx, 'Contract should be initialized');
      });

      it('should not be able to initiliaze VoteManager contract without admin role', async () => {
        const tx = voteManager.connect(signers[1]).initialize(stakeManager.address, rewardManager.address, blockManager.address, parameters.address);
        await assertRevert(tx, 'AccessControl');
      });

      it('should be able to initialize', async function () {
        await Promise.all(await initializeContracts());

        await mineToNextEpoch();
        await razor.transfer(signers[3].address, tokenAmount('423000'));
        await razor.transfer(signers[4].address, tokenAmount('19000'));
        await razor.transfer(signers[5].address, tokenAmount('1000'));
        await razor.transfer(signers[6].address, tokenAmount('1000'));
        await razor.transfer(signers[7].address, tokenAmount('2000'));
        await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('420000'));
        await razor.connect(signers[4]).approve(stakeManager.address, tokenAmount('19000'));
        await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('1000'));
        await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('1000'));
        await razor.connect(signers[7]).approve(stakeManager.address, tokenAmount('2000'));
        const epoch = await getEpoch();
        await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('420000'));
        await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('19000'));
      });

      it('should be able to commit', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[3]).commit(epoch, commitment1);
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const commitment2 = await voteManager.getCommitment(epoch, stakerIdAcc3);

        assertBNEqual(commitment1, commitment2, 'commitment1, commitment2 not equal');

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

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        await mineToNextState(); // reveal

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assertBNEqual((await voteManager.getVote(epoch, stakerIdAcc3, 0)).value, toBigNumber('100'), 'Vote not equal to 100');

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

      it('should not be able to reveal more than once in a particular epoch', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const tx = voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);

        await assertRevert(tx, 'not commited or already revealed');
      });

      it('should be able to commit again with correct influence', async function () {
        let epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        // const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

        const iteration = await getIteration(voteManager, stakeManager, staker);
        await mineToNextState(); // propose
        await blockManager.connect(signers[3]).propose(epoch,
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          iteration,
          biggestInfluencerId);

        const influenceBefore = (await stakeManager.getInfluence(stakerIdAcc3));
        const ageBefore = (await stakeManager.stakers(stakerIdAcc3)).age;

        await mineToNextState(); // dispute
        await mineToNextState(); // commit
        epoch = await getEpoch();
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
        const commitment3 = await voteManager.getCommitment(epoch, stakerIdAcc3);

        assertBNEqual(commitment1, commitment3, 'commitment1, commitment3 not equal');

        const ageAfter = (await stakeManager.stakers(stakerIdAcc3)).age;
        const expectedAgeDifference = toBigNumber(10000);
        const influenceAfter = (await stakeManager.getInfluence(stakerIdAcc3));

        assertBNEqual(ageAfter.sub(ageBefore), expectedAgeDifference, 'Age difference incorrect');
        assertBNLessThan(influenceBefore, influenceAfter, 'Not rewarded');
        assertBNEqual(ageBefore.add(10000), ageAfter, 'Penalty should not be applied');
      });

      it('should be able to reveal again but with no rewards for now', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);

        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        const stakeBefore2 = (await stakeManager.stakers(stakerIdAcc4)).stake;

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const tree2 = merkle('keccak256').sync(votes2);

        const proof2 = [];
        for (let i = 0; i < votes2.length; i++) {
          proof2.push(tree2.getProofPath(i, true, true));
        }

        await mineToNextState(); // reveal

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assertBNEqual((await voteManager.getVote(epoch, stakerIdAcc3, 0)).value, toBigNumber('100'), 'Vote not equal to 100');

        await voteManager.connect(signers[4]).reveal(epoch, tree2.root(), votes2, proof2,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[4].address);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        const stakeAfter2 = (await stakeManager.stakers(stakerIdAcc4)).stake;
        assertBNEqual(stakeBefore, stakeAfter);
        assertBNEqual(stakeBefore2, stakeAfter2);
      });

      it('account 4 should be penalised for trying to make fraudulent predictions in the previous epoch', async function () {
        let epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);

        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

        const iteration = await getIteration(voteManager, stakeManager, staker);
        await mineToNextState(); // propose
        const medians = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        await blockManager.connect(signers[3]).propose(epoch,
          [10, 11, 12, 13, 14, 15, 16, 17, 18],
          medians,
          iteration,
          biggestInfluencerId);

        // const stakeBefore = ((await stakeManager.stakers(stakerIdAcc3)).stake);
        // const stakeBefore2 = ((await stakeManager.stakers(stakerIdAcc4)).stake);
        const ageBefore = (await stakeManager.stakers(stakerIdAcc3)).age;
        const ageBefore2 = (await stakeManager.stakers(stakerIdAcc4)).age;
        await mineToNextState(); // dispute
        await mineToNextState(); // commit
        epoch = await getEpoch();
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

        // const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // const stakeAfter2 = (await stakeManager.stakers(stakerIdAcc4)).stake;
        let penalty = toBigNumber('0');
        let toAdd = toBigNumber(0);
        let num = toBigNumber(0);
        let denom = toBigNumber(0);
        const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        for (let i = 0; i < votes2.length; i++) {
          num = (toBigNumber(votes2[i]).sub(medians[i])).pow(2);
          denom = toBigNumber(medians[i]).pow(2);
          toAdd = (ageBefore2.mul(num).div(denom));
          penalty = penalty.add(toAdd);
        }
        const expectedAgeAfter2 = ageBefore2.add(10000).sub(penalty);
        const ageAfter = (await stakeManager.stakers(stakerIdAcc3)).age;
        const ageAfter2 = (await stakeManager.stakers(stakerIdAcc4)).age;

        assertBNLessThan(ageBefore, ageAfter, 'Not rewarded');
        assertBNEqual(expectedAgeAfter2, ageAfter2, 'Age Penalty should be applied');
      });

      it('Account 4 should have his stake slashed for leaking out his secret to another account before the reveal state', async function () {
        const epoch = await getEpoch();

        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakeBeforeAcc4 = (await stakeManager.stakers(stakerIdAcc4)).stake;

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        await voteManager.connect(signers[10]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[4].address);

        const stakeAcc10 = await razor.connect(signers[10]).balanceOf(signers[10].address);
        const slashPenaltyAmount = (stakeBeforeAcc4.mul((await parameters.slashPenaltyNum()))).div(await parameters.slashPenaltyDenom());
        assertBNEqual((await stakeManager.stakers(stakerIdAcc4)).stake, stakeBeforeAcc4.sub(slashPenaltyAmount), 'stake should be less by slashPenalty');
        assertBNEqual(stakeAcc10, slashPenaltyAmount.div('2'), 'the bounty hunter should receive half of the slashPenaltyAmount of account 4');
      });

      it('Account 3 should be able to reveal again', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        // const ageBefore = (await stakeManager.stakers(stakerIdAcc3)).age;

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }
        await mineToNextState(); // reveal

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assertBNEqual((await voteManager.getVote(epoch, stakerIdAcc3, 0)).value, toBigNumber('100'), 'Vote not equal to 100');

        // const ageAfter = (await stakeManager.stakers(stakerIdAcc3)).age;
        // assertBNEqual(ageBefore.add(10000), ageAfter);
      });

      it('should not be able to reveal if staker does not exists', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'Structs.Staker does not exist');
      });

      it('should not be able to commit if stake is below minstake', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('1000'));
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        // slashing the staker to make his stake below minstake
        await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
        await parameters.setSlashPenaltyNum(5000);
        await stakeManager.slash(stakerId, signers[11].address, epoch);

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[7]).commit(epoch, commitment1);
        const commitment2 = await voteManager.getCommitment(epoch, stakerId);
        assertBNEqual(Number(commitment2), toBigNumber('0'), 'commitment is not zero');
      });

      it('Staker should not be able to reveal if not committed', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        await mineToNextState(); // reveal

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'not commited or already revealed');
      });

      it('should not be able to commit other than in commit state', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        const tx = voteManager.connect(signers[7]).commit(epoch, commitment1);
        await assertRevert(tx, 'incorrect state');
      });

      it('Staker should not be able to reveal other than in reveal state', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('1000'));
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[7]).commit(epoch, commitment1);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'Not reveal state');
      });

      it('Should not be able to reveal others secret if not in commit state', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        await mineToNextState(); // reveal
        const tx = voteManager.connect(signers[10]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'Not commit state');
      });

      it('Should not be able to reveal with incorrect value', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'incorrect secret/value');
      });

      it('Should not be able to reveal with incorrect secret', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc',
          signers[7].address); // last digit 'd' changed to 'c' for having incorrect secret

        await assertRevert(tx, 'incorrect secret/value');
      });

      it('Should not be able to reveal with invalid MerkleProof', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]; // 900 changed to 950 for having incorrect value
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = votes.length - 1; i >= 0; i--) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'invalid merkle proof');
      });

      it('Staker should not be able to commit in present epoch for commitment of next epoch', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        const tx = voteManager.connect(signers[7]).commit(epoch + 1, commitment);
        await assertRevert(tx, 'incorrect epoch');
      });

      it('Staker should not be able to reveal if stake is zero', async function () {
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]; // 900 changed to 950 for having incorrect value
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[7]).commit(epoch, commitment1);

        await stakeManager.grantRole(await parameters.getStakeModifierHash(), signers[0].address);
        await parameters.setSlashPenaltyNum(10000);
        await stakeManager.slash(stakerId, signers[10].address, epoch); // slashing signers[7] 100% making his stake zero

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        await mineToNextState(); // reveal
        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'nonpositive stake');
      });

      it('Should be able to slash if stake is zero', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();

        await parameters.setMinStake(0);
        await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('0'));

        const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree2 = merkle('keccak256').sync(votes2);
        const root2 = tree2.root();
        const commitment3 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[6]).commit(epoch, commitment3);

        const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
        const stakeBeforeAcc6 = (await stakeManager.stakers(stakerIdAcc6)).stake;
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }
        const balanceBeforeAcc10 = await razor.balanceOf(signers[10].address);

        await voteManager.connect(signers[10]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[6].address);

        const balanceAfterAcc10 = await razor.balanceOf(signers[10].address);
        const slashPenaltyAmount = stakeBeforeAcc6.mul(((await parameters.slashPenaltyNum())).div(await parameters.slashPenaltyDenom()));
        const stakeAcc6 = (await stakeManager.stakers(stakerIdAcc6)).stake;
        assertBNEqual(stakeAcc6, toBigNumber('0'), 'Stake of account 6 should be zero');
        assertBNEqual(balanceAfterAcc10, balanceBeforeAcc10.add(slashPenaltyAmount.div('2')),
          'the bounty hunter should receive half of the slashPenaltyAmount of account 4');
      });

      it('Should be able to slash if stake is one', async function () {
        const epoch = await getEpoch();
        await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('1'));

        const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree2 = merkle('keccak256').sync(votes2);
        const root2 = tree2.root();
        const commitment3 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root2, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[5]).commit(epoch, commitment3);

        const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
        const stakeBeforeAcc5 = (await stakeManager.stakers(stakerIdAcc5)).stake;
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }
        const balanceBeforeAcc10 = await razor.balanceOf(signers[10].address);

        await voteManager.connect(signers[10]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[5].address);

        const balanceAfterAcc10 = await razor.balanceOf(signers[10].address);
        const slashPenaltyAmount = (stakeBeforeAcc5.mul((await parameters.slashPenaltyNum()))).div(await parameters.slashPenaltyDenom());
        const stakeAfterAcc5 = (await stakeManager.stakers(stakerIdAcc5)).stake;
        assertBNEqual(stakeAfterAcc5, stakeBeforeAcc5.sub(slashPenaltyAmount), 'Stake of account 5 should lessen by slashPenaltyAmount');
        assertBNEqual(balanceAfterAcc10, balanceBeforeAcc10.add(slashPenaltyAmount.div('2')),
          'the bounty hunter should receive half of the slashPenaltyAmount of account 4');
      });

      it('if the revealed value is zero, staker should not be able to reveal', async function () {
        await mineToNextEpoch();
        await razor.transfer(signers[8].address, tokenAmount('19000'));
        await razor.connect(signers[8]).approve(stakeManager.address, tokenAmount('19000'));
        await razor.transfer(signers[9].address, tokenAmount('17000'));
        await razor.connect(signers[9]).approve(stakeManager.address, tokenAmount('17000'));

        let epoch = await getEpoch();
        await stakeManager.connect(signers[8]).stake(epoch, tokenAmount('19000'));
        await stakeManager.connect(signers[9]).stake(epoch, tokenAmount('17000'));

        const votes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[8]).commit(epoch, commitment1);
        const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
        const commitment2 = await voteManager.getCommitment(epoch, stakerIdAcc8);

        assertBNEqual(commitment1, commitment2, 'commitment1, commitment2 not equal');
        epoch = await getEpoch();

        const votes2 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const tree2 = merkle('keccak256').sync(votes2);

        await mineToNextState(); // reveal

        const proof = [];
        for (let i = 0; i < votes2.length; i++) {
          proof.push(tree2.getProofPath(i, true, true));
        }

        const tx = voteManager.connect(signers[8]).reveal(epoch, tree2.root(), votes2, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[8].address);

        await assertRevert(tx, 'revert');
      });
      it('if the proposed value is zero, staker should not be able to propose', async function () {
        const epoch = await getEpoch();

        await mineToNextState(); // propose
        const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
        const staker = await stakeManager.getStaker(stakerIdAcc8);

        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
        const iteration = await getIteration(voteManager, stakeManager, staker);

        const medians = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const tx = blockManager.connect(signers[8]).propose(epoch,
          [19, 20, 21, 22, 23, 24, 25, 26, 27],
          medians,
          iteration,
          biggestInfluencerId);

        await assertRevert(tx, 'revert');
      });

      it('if the disputed value is zero, staker should not be able to dispute', async function () {
        await mineToNextState(); // dispute
        const epoch = await getEpoch();

        const sortedVotes = [toBigNumber('0')];

        const tx = blockManager.connect(signers[9]).giveSorted(epoch, 1, sortedVotes);

        await assertRevert(tx, 'sorted[i] is not greater than lastVisited');
      });

      it('if the revealed value is zero, only commit should work in next epoch', async function () {
        await mineToNextState(); // commit

        let epoch = await getEpoch();

        const votes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[8]).commit(epoch, commitment1);
        const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
        const commitment2 = await voteManager.getCommitment(epoch, stakerIdAcc8);

        assertBNEqual(commitment1, commitment2, 'commitment1, commitment2 not equal');

        epoch = await getEpoch();

        const votes2 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const tree2 = merkle('keccak256').sync(votes2);

        await mineToNextState(); // reveal

        const proof2 = [];
        for (let i = 0; i < votes2.length; i++) {
          proof2.push(tree2.getProofPath(i, true, true));
        }

        const tx1 = voteManager.connect(signers[8]).reveal(epoch, tree2.root(), votes2, proof2,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[8].address);

        await assertRevert(tx1, 'revert');

        epoch = await getEpoch();

        await mineToNextState(); // propose

        const staker = await stakeManager.getStaker(stakerIdAcc8);

        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
        const iteration = await getIteration(voteManager, stakeManager, staker);
        const medians = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        const tx2 = blockManager.connect(signers[8]).propose(epoch,
          [19, 20, 21, 22, 23, 24, 25, 26, 27],
          medians,
          iteration,
          biggestInfluencerId);

        await assertRevert(tx2, 'revert');

        await mineToNextState(); // dispute
        epoch = await getEpoch();

        const sortedVotes = [toBigNumber('0')];

        const tx3 = blockManager.connect(signers[9]).giveSorted(epoch, 1, sortedVotes);

        await assertRevert(tx3, 'sorted[i] is not greater than lastVisited');
      });
      it('Block should not be proposed one no one votes', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        // commit state
        await mineToNextState();
        // reveal state
        await mineToNextState();
        // propose state
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

        const iteration = await getIteration(voteManager, stakeManager, staker);
        const tx = blockManager.connect(signers[3]).propose(epoch,
          [],
          [],
          iteration,
          biggestInfluencerId);
        assertRevert(tx, 'Cannot propose without revealing');
      });
      it('No Finalise Dispute should happen if no block is proposed or no one votes', async function () {
        const epoch = await getEpoch();
        await mineToNextState();
        // dispute state
        const sortedVotes = [];
        const tx1 = blockManager.connect(signers[3]).giveSorted(epoch, 1, sortedVotes);
        // const firstProposedBlockIndex = await blockManager.proposedBlocks(epoch, 0);
        // const tx2 = blockManager.connect(signers[19]).finalizeDispute(epoch, firstProposedBlockIndex);
        assert(tx1, 'should be able to give sorted votes');
        // assertRevert(tx2, 'Error: Transaction reverted without a reason string');
      });
      it('In next epoch everything should work as expected if in previous epoch no one votes', async function () {
        await mineToNextState();
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // commit state
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        await voteManager.connect(signers[3]).commit(epoch, commitment);
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        await mineToNextState();
        // reveal state
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }
        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), votes, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // propose state
        await mineToNextState();
        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
        const iteration = await getIteration(voteManager, stakeManager, staker);
        await blockManager.connect(signers[3]).propose(epoch,
          [1, 2, 3, 4, 5, 6, 7, 8, 9],
          [100, 200, 300, 400, 500, 600, 700, 800, 900],
          iteration,
          biggestInfluencerId);
        // penalty should be applied for not voting in previous epoch
        assert(stakeAfter, stakeBefore, 'penalties for not revealing in previous epoch should be applied');
      });
      it('penalties should be applied if staker does not participate for more than 8 epochs(grace period)', async function () {
        await mineToNextState();
        await mineToNextState();
        for (let i = 0; i <= 10; i++) {
          await mineToNextEpoch();
        }
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        const ageBefore = (await stakeManager.stakers(stakerIdAcc3)).age;
        // commit state
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        await voteManager.connect(signers[3]).commit(epoch, commitment);
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        const ageAfter = (await stakeManager.stakers(stakerIdAcc3)).age;
        assertBNLessThan(stakeAfter, stakeBefore, 'stake should reduce');
        assertBNLessThan(ageAfter, ageBefore, 'age should reduce since it did not participated in previous epochs');
      });
    });
  });
});
