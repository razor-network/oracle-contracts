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
  getAssignedAssets,
  findAssetNotAlloted,
} = require('./helpers/utils');

describe('VoteManager', function () {
  describe('BlockManager', function () {
    let signers;
    let blockManager;
    let parameters;
    let random;
    let razor;
    let stakeManager;
    let rewardManager;
    let voteManager;
    let assetManager;
    let initializeContracts;
    let revealedAssetsThisEpoch = {};
    let blockThisEpoch = {
      ids: [], medians: [],
    };
    let revealedVotesForStaker = [];
    before(async () => {
      ({
        blockManager, parameters, random, razor, stakeManager, rewardManager, voteManager, assetManager, initializeContracts,
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
        const tx = voteManager.connect(signers[1]).initialize(stakeManager.address, rewardManager.address, blockManager.address,
          parameters.address, assetManager.address);
        await assertRevert(tx, 'AccessControl');
      });

      it('should be able to initialize', async function () {
        await Promise.all(await initializeContracts());

        await mineToNextEpoch();
        await razor.transfer(signers[3].address, tokenAmount('423000'));
        await razor.transfer(signers[4].address, tokenAmount('19000'));
        await razor.transfer(signers[5].address, tokenAmount('1000'));
        await razor.transfer(signers[6].address, tokenAmount('1000'));
        await razor.transfer(signers[7].address, tokenAmount('1000'));
        await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('420000'));
        await razor.connect(signers[4]).approve(stakeManager.address, tokenAmount('19000'));
        await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('1000'));
        await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('1000'));
        await razor.connect(signers[7]).approve(stakeManager.address, tokenAmount('1000'));
        const epoch = await getEpoch();
        await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('420000'));
        await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('19000'));

        // Before Staker could commit even if there were no jobs, now as we are moving to assgined jobs, we need to create them first, and then only commit
        await assetManager.grantRole(await parameters.getAssetModifierHash(), signers[0].address);
        const url = 'http://testurl.com';
        const selector = 'selector';
        const name = 'test';
        const repeat = true;
        let i = 0;
        while (i < 9) { await assetManager.createJob(url, selector, name, repeat); i++; }
        // By default its 2 setting it 5
        await parameters.setmaxAssetsPerStaker(5);
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

      it('should not be able to commit more than once in any particular epoch', async function () {
        const epoch = await getEpoch();
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        const tx = voteManager.connect(signers[3]).commit(epoch, commitment1);
        await assertRevert(tx, 'already commited');
      });

      it('should be able to reveal assigned assets', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        await mineToNextState(); // reveal

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc3, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        // Revealed assets not equal to required assets per staker
        const assignedAssetsVotesCopy = JSON.parse(JSON.stringify(assigneedAssetsVotes)); // Deep Clone
        assignedAssetsVotesCopy.push({ id: 5, value: 500 });
        let tx = voteManager.connect(signers[3]).reveal(epoch, tree.root(), assignedAssetsVotesCopy, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        await assertRevert(tx, 'Revealed assets not equal to required assets per staker');

        // Incorrect Reveal
        assignedAssetsVotesCopy.splice(5, 6);
        const assetId = await findAssetNotAlloted(assignedAssetsVotesCopy, votes.length);
        assignedAssetsVotesCopy[0].id = assetId;
        tx = voteManager.connect(signers[3]).reveal(epoch, tree.root(), assignedAssetsVotesCopy, proof,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        await assertRevert(tx, 'Revealed asset not alloted');

        // Correct Reveal
        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assertBNEqual((await voteManager.getVote(epoch, stakerIdAcc3, assigneedAssetsVotes[0].id - 1)).value, toBigNumber(assigneedAssetsVotes[0].value),
          'Vote Stored not equal to submitted one');

        const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const tree2 = merkle('keccak256').sync(votes2);
        const root2 = tree2.root();
        const proof2 = [];
        for (let i = 0; i < votes2.length; i++) {
          proof2.push(tree2.getProofPath(i, true, true));
        }
        const assignedAssets2 = await getAssignedAssets(numAssets, stakerIdAcc4, votes2, proof2, maxAssetsPerStaker, random);
        const assigneedAssetsVotes2 = assignedAssets2[0];
        const assigneedAssetsProofs2 = assignedAssets2[1];
        await voteManager.connect(signers[4]).reveal(epoch, root2, assigneedAssetsVotes2, assigneedAssetsProofs2,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[4].address);
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNEqual(stakeBefore, stakeAfter);

        // To Form Block Proposal On basis of revealed assets this epoch
        for (let i = 0; i < maxAssetsPerStaker; i++) {
          revealedAssetsThisEpoch[assigneedAssetsVotes[i].id] = true;
          revealedAssetsThisEpoch[assigneedAssetsVotes2[i].id] = true;
        }

        for (let i = 1; i <= numAssets; i++) {
          if (revealedAssetsThisEpoch[i]) {
            blockThisEpoch.ids.push(i);
            blockThisEpoch.medians.push(i * 100);
          }
        }
      });

      it('should not be able to reveal more than once in a particular epoch', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc3, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        const tx = voteManager.connect(signers[3]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
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

        const iteration = await getIteration(stakeManager, random, staker);
        await mineToNextState(); // propose
        await blockManager.connect(signers[3]).propose(epoch,
          blockThisEpoch.ids,
          blockThisEpoch.medians,
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
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

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

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc3, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assertBNEqual((await voteManager.getVote(epoch, stakerIdAcc3, assigneedAssetsVotes[0].id - 1)).value, toBigNumber(assigneedAssetsVotes[0].value),
          'Vote Stored not equal to submitted one');

        const assignedAssets2 = await getAssignedAssets(numAssets, stakerIdAcc4, votes2, proof2, maxAssetsPerStaker, random);
        const assigneedAssetsVotes2 = assignedAssets2[0];
        revealedVotesForStaker = assigneedAssetsVotes2;
        const assigneedAssetsProofs2 = assignedAssets2[1];

        await voteManager.connect(signers[4]).reveal(epoch, tree2.root(), assigneedAssetsVotes2, assigneedAssetsProofs2,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[4].address);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        const stakeAfter2 = (await stakeManager.stakers(stakerIdAcc4)).stake;
        assertBNEqual(stakeBefore, stakeAfter);
        assertBNEqual(stakeBefore2, stakeAfter2);

        // To Form Block Proposal On basis of revealed assets this epoch
        revealedAssetsThisEpoch = {};
        for (let i = 0; i < maxAssetsPerStaker; i++) {
          revealedAssetsThisEpoch[assigneedAssetsVotes[i].id] = true;
          revealedAssetsThisEpoch[assigneedAssetsVotes2[i].id] = true;
        }
        blockThisEpoch = {
          ids: [], medians: [],
        };
        for (let i = 1; i <= numAssets; i++) {
          if (revealedAssetsThisEpoch[i]) {
            blockThisEpoch.ids.push(i);
            blockThisEpoch.medians.push(i * 100);
          }
        }
      });

      it('account 4 should be penalised for trying to make fraudulent predictions in the previous epoch', async function () {
        let epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);

        const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);

        const iteration = await getIteration(stakeManager, random, staker);
        await mineToNextState(); // propose
        await blockManager.connect(signers[3]).propose(epoch,
          blockThisEpoch.ids,
          blockThisEpoch.medians,
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
        const map = {};
        for (let i = 0; i < revealedVotesForStaker.length; i++) {
          if (typeof map[revealedVotesForStaker[i].id] === 'undefined') {
            num = (toBigNumber(revealedVotesForStaker[i].value).sub(revealedVotesForStaker[i].value - revealedVotesForStaker[i].value % 100)).pow(2);
            denom = toBigNumber(revealedVotesForStaker[i].value - revealedVotesForStaker[i].value % 100).pow(2);
            toAdd = (ageBefore2.mul(num).div(denom));
            penalty = penalty.add(toAdd);
            map[revealedVotesForStaker[i].id] = true;
          }
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
        const stakerIdAcc10 = await stakeManager.stakerIds(signers[10].address);
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc10, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];
        await voteManager.connect(signers[10]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
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
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }
        await mineToNextState(); // reveal

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc3, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        await voteManager.connect(signers[3]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[3].address);
        // arguments getvVote => epoch, stakerId, assetId
        assertBNEqual((await voteManager.getVote(epoch, stakerIdAcc3, assigneedAssetsVotes[0].id - 1)).value, toBigNumber(assigneedAssetsVotes[0].value),
          'Vote Stored not equal to submitted one');
      });

      it('should not be able to reveal if staker does not exists', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc7 = await stakeManager.stakerIds(signers[7].address);
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc7, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'Structs.Staker does not exist');
      });

      it('should not be able to commit if stake is below minstake', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('150'));
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
        const stakerIdAcc7 = await stakeManager.stakerIds(signers[7].address);
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc7, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        await mineToNextState(); // reveal

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        assertRevert(tx, 'not commited or already revealed');
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
        assertRevert(tx, 'incorrect state');
      });

      it('Staker should not be able to reveal other than in reveal state', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('325'));
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);
        const root = tree.root();
        const commitment1 = utils.solidityKeccak256(
          ['uint256', 'uint256', 'bytes32'],
          [epoch, root, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );

        await voteManager.connect(signers[7]).commit(epoch, commitment1);

        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerId, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'Not reveal state');
      });

      it('Should not be able to reveal others secret if not in commit state', async function () {
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerId, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];
        await mineToNextState(); // reveal
        const tx = voteManager.connect(signers[10]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'Not commit state');
      });

      it('Should not be able to reveal with incorrect value', async function () {
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const tree = merkle('keccak256').sync(votes);

        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerId, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];
        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'incorrect secret/value');
      });

      it('Should not be able to reveal with incorrect secret', async function () {
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tree = merkle('keccak256').sync(votes);

        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerId, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];
        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc',
          signers[7].address); // last digit 'd' changed to 'c' for having incorrect secret

        await assertRevert(tx, 'incorrect secret/value');
      });

      it('Should not be able to reveal with invalid MerkleProof', async function () {
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900]; // 900 changed to 950 for having incorrect value
        const tree = merkle('keccak256').sync(votes);

        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const proof = [];
        for (let i = votes.length - 1; i >= 0; i--) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerId, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];
        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
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

        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

        const proof = [];
        for (let i = 0; i < votes.length; i++) {
          proof.push(tree.getProofPath(i, true, true));
        }

        const assignedAssets = await getAssignedAssets(numAssets, stakerId, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];
        await mineToNextState(); // reveal
        const tx = voteManager.connect(signers[7]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[7].address);

        await assertRevert(tx, 'nonpositive stake');
      });

      it('Should be able to slash if stake is zero', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

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

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc6, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        await voteManager.connect(signers[10]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
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
        const maxAssetsPerStaker = Number(await parameters.maxAssetsPerStaker());
        const numAssets = Number(await assetManager.getNumAssets());

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

        const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc5, votes, proof, maxAssetsPerStaker, random);
        const assigneedAssetsVotes = assignedAssets[0];
        const assigneedAssetsProofs = assignedAssets[1];

        await voteManager.connect(signers[10]).reveal(epoch, tree.root(), assigneedAssetsVotes, assigneedAssetsProofs,
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd',
          signers[5].address);

        const balanceAfterAcc10 = await razor.balanceOf(signers[10].address);
        const slashPenaltyAmount = (stakeBeforeAcc5.mul((await parameters.slashPenaltyNum()))).div(await parameters.slashPenaltyDenom());
        const stakeAfterAcc5 = (await stakeManager.stakers(stakerIdAcc5)).stake;
        assertBNEqual(stakeAfterAcc5, stakeBeforeAcc5.sub(slashPenaltyAmount), 'Stake of account 5 should lessen by slashPenaltyAmount');
        assertBNEqual(balanceAfterAcc10, balanceBeforeAcc10.add(slashPenaltyAmount.div('2')),
          'the bounty hunter should receive half of the slashPenaltyAmount of account 4');
      });
    });
  });
});
