/* TODO:
test unstake and withdraw
test cases where nobody votes, too low stake (1-4) */

const { assert } = require('chai');
const { utils } = require('ethers');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  COLLECTION_MODIFIER_ROLE,
  STAKE_MODIFIER_ROLE,
  WITHDRAW_LOCK_PERIOD,
  GOVERNER_ROLE,
  BASE_DENOMINATOR,
  GRACE_PERIOD,

} = require('./helpers/constants'); const {
  assertBNEqual,
  assertBNLessThan,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
  takeSnapshot,
  restoreSnapshot,
  assertBNNotEqual,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  getEpoch,
  getIteration,
  getBiggestStakeAndId,
  toBigNumber,
  tokenAmount,
  getSecret,
  getSignature,
} = require('./helpers/utils');
// const { createMerkle, getProofPath } = require('./MerklePosAware');
const {
  commit, reveal, propose, getAnyAssignedIndex, reset, getRoot, getCommitment, getTreeRevealData, getData, calculateMedians,
} = require('./helpers/InternalEngine');

describe('VoteManager', function () {
  describe('BlockManager', function () {
    let signers;
    let blockManager;
    let governance;
    let razor;
    let stakeManager;
    let rewardManager;
    let voteManager;
    let initializeContracts;
    let collectionManager;
    let snapshotId;
    let snapshotId2;

    before(async () => {
      ({
        blockManager, governance, collectionManager, razor, stakeManager, rewardManager, voteManager, initializeContracts,
      } = await setupContracts());
      signers = await ethers.getSigners();
    });

    describe('VoteManager: initialize tests', async function () {
      it('admin role should be granted', async () => {
        const isAdminRoleGranted = await stakeManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
        assert(isAdminRoleGranted === true, 'Admin role was not Granted');
      });

      it('should not be able to commit without initialization', async () => {
        const epoch = await getEpoch();
        const res1 = utils.solidityKeccak256(
          ['uint32', 'bytes32'],
          [epoch, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        const tx = voteManager.connect(signers[5]).commit(epoch, res1);
        await assertRevert(tx, 'Contract should be initialized');
      });

      it('should not be able to initiliaze VoteManager contract without admin role', async () => {
        const tx = voteManager.connect(signers[1]).initialize(stakeManager.address, rewardManager.address, blockManager.address, collectionManager.address);
        await assertRevert(tx, 'AccessControl');
      });
    });
    describe('VoteManager: Commit', async function () {
      before(async () => {
        await Promise.all(await initializeContracts());

        await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
        const jobs = [];
        const id = 0;
        const url = 'http://testurl.com';
        const selector = 'selector';
        const selectorType = 0;
        let name;
        const power = -2;
        const weight = 50;
        let i = 0;
        while (i < 9) {
          name = `test${i}`;
          const job = {
            id,
            selectorType,
            weight,
            power,
            name,
            selector,
            url,
          };
          jobs.push(job);
          i++;
        }
        await collectionManager.createMulJob(jobs);
        await mineToNextEpoch();
        await mineToNextState();
        await mineToNextState();
        await mineToNextState();
        await mineToNextState();

        let Cname;
        for (let i = 1; i <= 7; i++) {
          Cname = `Test Collection${String(i)}`;
          await collectionManager.createCollection(500, 3, 1, 1, [i, i + 1], Cname);
        }
        Cname = 'Test Collection8';
        await collectionManager.createCollection(500000, 3, 1, 1, [8, 9], Cname);
        Cname = 'Test Collection9';
        await collectionManager.createCollection(10000, 3, 1, 1, [9, 1], Cname);

        await mineToNextEpoch();
        await razor.transfer(signers[1].address, tokenAmount('30000'));
        await razor.transfer(signers[2].address, tokenAmount('30000'));
        await razor.transfer(signers[3].address, tokenAmount('423000'));
        await razor.transfer(signers[4].address, tokenAmount('20000'));
        await razor.transfer(signers[5].address, tokenAmount('20000'));
        await razor.transfer(signers[6].address, tokenAmount('20000'));
        await razor.transfer(signers[7].address, tokenAmount('200000'));
        await razor.transfer(signers[8].address, tokenAmount('20000'));
        await razor.transfer(signers[9].address, tokenAmount('20000'));
        await razor.transfer(signers[15].address, tokenAmount('20000'));

        await razor.connect(signers[1]).approve(stakeManager.address, tokenAmount('30000'));
        await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('30000'));
        await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('420000'));
        await razor.connect(signers[4]).approve(stakeManager.address, tokenAmount('20000'));
        await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('20000'));
        await razor.connect(signers[6]).approve(stakeManager.address, tokenAmount('20000'));
        await razor.connect(signers[7]).approve(stakeManager.address, tokenAmount('200000'));
        await razor.connect(signers[8]).approve(stakeManager.address, tokenAmount('20000'));
        await razor.connect(signers[9]).approve(stakeManager.address, tokenAmount('20000'));
        await razor.connect(signers[15]).approve(stakeManager.address, tokenAmount('20000'));

        const epoch = await getEpoch();
        await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('30000'));
        await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('30000'));
        await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('420000'));
        await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('20000'));

        snapshotId2 = await takeSnapshot();
      });
      beforeEach(async () => {
        snapshotId = await takeSnapshot();
      });

      afterEach(async () => {
        await restoreSnapshot(snapshotId);
      });

      it('should not be able to initialize contracts if they are already initialized', async function () {
        const tx = voteManager.connect(signers[0]).initialize(stakeManager.address, rewardManager.address, blockManager.address, collectionManager.address);
        await assertRevert(tx, 'contract already initialized');
      });

      it('should be able to commit', async function () {
        const epoch = await getEpoch();
        let secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const commitment2 = await voteManager.getCommitment(stakerIdAcc3);
        const commitment = await getCommitment(signers[3]);
        assertBNEqual(commitment, commitment2.commitmentHash, 'commitment, commitment2 not equal');
        assertBNEqual(epoch, await voteManager.getEpochLastCommitted(stakerIdAcc3), 'epoch last committed does not match');

        const age1 = 10000;
        const age2 = await stakeManager.getAge(stakerIdAcc3);
        assertBNEqual(age1, age2, 'age1, age2 not equal');

        // // const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        secret = await getSecret(signers[4]);
        await commit(signers[4], 4, voteManager, collectionManager, secret, blockManager);

        const age3 = 10000;
        const age4 = await stakeManager.getAge(stakerIdAcc4);
        assertBNEqual(age3, age4, 'age3, age4 not equal');

        // // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        secret = await getSecret(signers[2]);
        await commit(signers[2], 4, voteManager, collectionManager, secret, blockManager);
        const age5 = 10000;
        const age6 = await stakeManager.getAge(stakerIdAcc2);
        assertBNEqual(age5, age6, 'age3, age4 not equal');
      });

      it('should not be able to commit if already commited in a particular epoch', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
        // commit again
        const tx = commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
        await assertRevert(tx, 'already commited');
      });

      it('should not be able to commit if commitment is zero', async function () {
        const epoch = await getEpoch();
        const tx = voteManager.connect(signers[3]).commit(epoch, '0x0000000000000000000000000000000000000000000000000000000000000000');
        await assertRevert(tx, 'Invalid commitment');
      });

      it('should not be able to commit if staker does not exists', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[7]);
        const tx = commit(signers[7], 0, voteManager, collectionManager, secret, blockManager);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('should not be able to commit if stake is below minstake', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('20000'));
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const commitment2 = await voteManager.getCommitment(stakerId);
        assert(commitment2.commitmentHash.toString() === '0x0000000000000000000000000000000000000000000000000000000000000000', 'commitment was successful');
      });

      it('should not be able to commit other than in commit state', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        await mineToNextState();
        const secret = await getSecret(signers[1]);
        const tx = commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
        await assertRevert(tx, 'incorrect state');
      });

      it('Staker should not be able to commit in present epoch for commitment of next epoch', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitment(signers[2]);
        const tx = voteManager.connect(signers[2]).commit(epoch + 1, commitment);
        await assertRevert(tx, 'incorrect epoch');
      });
    });

    describe('VoteManager: Reveal', async () => {
      before(async () => {
        let secret = await getSecret(signers[2]);
        await commit(signers[2], 4, voteManager, collectionManager, secret, blockManager);

        secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        secret = await getSecret(signers[4]);
        await commit(signers[4], 4, voteManager, collectionManager, secret, blockManager);

        await mineToNextState();
      });

      beforeEach(async () => {
        snapshotId = await takeSnapshot();
      });

      afterEach(async () => {
        await restoreSnapshot(snapshotId);
      });

      it('should not be able to reveal if length of the votes value is not same as number of active collections', async function () {
        const epoch = await getEpoch();

        const randomBytes = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dee';
        const treeRevealData = {
          values: [
            { leafId: 1, value: 120 },
            { leafId: 3, value: 420 },
          ],
          proofs: [
            [
              randomBytes,
            ],
            [
              randomBytes,
            ],
          ],
          root: '0x85f5ab30c9b6153139f5e932f2e734463de610f4a265349574ca9b08f659cdab',
        };
        // eslint-disable-next-line prefer-destructuring
        const signature = await getSignature(signers[3]);
        const tx = voteManager.connect(signers[3]).reveal(epoch, treeRevealData, signature);
        await assertRevert(tx, 'values length mismatch');
      });

      it('if the vote value for assigned asset is zero, staker should not be able to reveal', async function () {
        const epoch = await getEpoch();
        const randomBytes = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dec';
        const data = await getData(signers[3]);
        const { seqAllotedCollections } = data;
        const { tree } = data;
        const root3 = tree[0][0];
        const values3 = [];
        for (let j = 0; j < seqAllotedCollections.length; j++) {
          if (j === 0) {
            values3.push({
              leafId: Number(seqAllotedCollections[j]),
              value: (Number(seqAllotedCollections[j]) + 1) * 0,
            });
          } else {
            values3.push({
              leafId: Number(seqAllotedCollections[j]),
              value: (Number(seqAllotedCollections[j]) + 1) * 100,
            });
          }
        }
        const treeRevealData = {
          values: values3,
          proofs: [
            [
              randomBytes,
            ],
            [
              randomBytes,
            ],
          ],
          root: root3,
        };
        // await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
        const signature = await getSignature(signers[3]);
        const tx = voteManager.connect(signers[3]).reveal(epoch, treeRevealData, signature);
        await assertRevert(tx, '0 vote for assigned coll');
      });

      it('should not be able to reveal non alloted assets', async function () {
        const epoch = await getEpoch();
        const randomBytes = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dec';
        const data = await getData(signers[3]);
        const { seqAllotedCollections, assignedCollections } = data;
        const { tree } = data;
        const root3 = tree[0][0];
        const values3 = [];
        let nonAssignedCollection;
        const numActiveCollections = await collectionManager.getNumActiveCollections();
        for (let i = 0; i < numActiveCollections; i++) {
          if (!(assignedCollections[i])) {
            nonAssignedCollection = i;
            break;
          }
        }
        for (let j = 0; j < seqAllotedCollections.length; j++) {
          if (j === 0) {
            values3.push({
              leafId: Number(nonAssignedCollection),
              value: (Number(nonAssignedCollection) + 1) * 100,
            });
          } else {
            values3.push({
              leafId: Number(seqAllotedCollections[j]),
              value: (Number(seqAllotedCollections[j]) + 1) * 100,
            });
          }
        }
        const treeRevealData = {
          values: values3,
          proofs: [
            [
              randomBytes,
            ],
            [
              randomBytes,
            ],
          ],
          root: root3,
        };
        // await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
        const signature = await getSignature(signers[3]);
        const tx = voteManager.connect(signers[3]).reveal(epoch, treeRevealData, signature);
        await assertRevert(tx, 'Revealed asset not alloted');
      });

      it('should be able to reveal', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // Correct Reveal
        await reveal(collectionManager, signers[3], 0, voteManager, stakeManager); // arguments getvVote => epoch, stakerId, assetId
        const anyLeafId = await getAnyAssignedIndex(signers[3]);
        const collectionId = await collectionManager.getCollectionIdFromLeafId(anyLeafId);
        const voteValueForThatLeafId = (toBigNumber(collectionId)).mul(100);
        assertBNEqual(await voteManager.getVoteValue(epoch, stakerIdAcc3, collectionId), voteValueForThatLeafId,
          'Votes are not matching');

        await reveal(collectionManager, signers[4], 4, voteManager, stakeManager);
        await reveal(collectionManager, signers[2], 4, voteManager, stakeManager);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNEqual(stakeBefore, stakeAfter);
      });

      it('should not be able to reveal if staker does not exists', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const treeRevealData = await getTreeRevealData(signers[3]); /* intentionally passing signers[3]s reveal data since signers[7]
         hasn't revealed yet but this won't affect moto of test case */
        const signature = await getSignature(signers[7]);
        const tx = voteManager.connect(signers[7]).reveal(epoch, treeRevealData, signature);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('Staker should not be able to reveal if not committed', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const tx = reveal(collectionManager, signers[1], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx, 'not committed in this epoch');
      });

      it('Staker should not be able to reveal other than in reveal state', async function () {
        await mineToNextEpoch();
        const secret = await getSecret(signers[1]);
        await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
        const tx = reveal(collectionManager, signers[1], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx, 'incorrect state');
      });

      it('Should not be able to reveal with incorrect value', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        await mineToNextEpoch();
        const secret = await getSecret(signers[1]);
        await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
        await mineToNextState();
        const tx = reveal(collectionManager, signers[1], 10, voteManager, stakeManager, collectionManager); // value changed with deviation 10
        await assertRevert(tx, 'invalid merkle proof');
      });

      it('Staker should not be able to reveal if stake is zero', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[1].address);
        const staker = await stakeManager.getStaker(stakerId);
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[1]);
        await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);

        await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
        // setting stake below minstake
        await stakeManager.setStakerStake(epoch, stakerId, 2, staker.stake, tokenAmount('0'));

        await mineToNextState(); // reveal
        const tx = reveal(collectionManager, signers[1], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx, 'stake below minimum');
      });

      it('should not be able to reveal if invalid secret', async function () {
        await mineToNextEpoch();

        const epoch = await getEpoch();
        const salt = await voteManager.getSalt();
        const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dee';
        const seed = ethers.utils.solidityKeccak256(
          ['bytes32', 'bytes32'],
          [salt, secret]
        );
        const randomBytes = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dee';
        const treeRevealData = {
          values: [
            { leafId: 1, value: 120 },
            { leafId: 3, value: 420 },
            { leafId: 3, value: 420 },
          ],
          proofs: [
            [
              randomBytes,
            ],
            [
              randomBytes,
            ],
          ],
          root: '0x85f5ab30c9b6153139f5e932f2e734463de610f4a265349574ca9b08f659cdab',
        };
        const commitment = ethers.utils.solidityKeccak256(
          ['bytes32', 'bytes32'],
          [treeRevealData.root, seed]
        );
        await voteManager.connect(signers[1]).commit(epoch, commitment);
        await mineToNextState(); // reveal
        // eslint-disable-next-line prefer-destructuring
        const signature = await getSignature(signers[1]);
        const tx = voteManager.connect(signers[1]).reveal(epoch, treeRevealData, signature);
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('should not be able to reveal if sending someone else signature', async function () {
        await mineToNextEpoch();

        const epoch = await getEpoch();
        const salt = await voteManager.getSalt();
        const secret = await getSecret(signers[1]);
        const seed = ethers.utils.solidityKeccak256(
          ['bytes32', 'bytes32'],
          [salt, secret]
        );
        const randomBytes = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dee';
        const treeRevealData = {
          values: [
            { leafId: 1, value: 120 },
            { leafId: 3, value: 420 },
            { leafId: 3, value: 420 },
          ],
          proofs: [
            [
              randomBytes,
            ],
            [
              randomBytes,
            ],
          ],
          root: '0x85f5ab30c9b6153139f5e932f2e734463de610f4a265349574ca9b08f659cdab',
        };
        const commitment = ethers.utils.solidityKeccak256(
          ['bytes32', 'bytes32'],
          [treeRevealData.root, seed]
        );
        await voteManager.connect(signers[1]).commit(epoch, commitment);
        await mineToNextState(); // reveal
        // eslint-disable-next-line prefer-destructuring
        const signature = await getSignature(signers[2]);
        const tx = voteManager.connect(signers[1]).reveal(epoch, treeRevealData, signature);
        await assertRevert(tx, 'invalid signature');
      });
    });

    describe('VoteManager: Influence And penalties', async () => {
      let ageBefore;
      let influenceBefore;

      before(async () => {
        await reveal(collectionManager, signers[2], 4, voteManager, stakeManager);
        await reveal(collectionManager, signers[3], 0, voteManager, stakeManager);
        await reveal(collectionManager, signers[4], 4, voteManager, stakeManager);

        await mineToNextState(); // propose
        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);

        await reset();

        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await reset();
        await mineToNextState(); // commit

        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        influenceBefore = (await stakeManager.getInfluence(stakerIdAcc3));
        ageBefore = await stakeManager.getAge(stakerIdAcc3);

        let secret = await getSecret(signers[2]);
        await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

        secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        // Signer 4 is voting incoherently
        secret = await getSecret(signers[4]);
        await commit(signers[4], 20, voteManager, collectionManager, secret, blockManager);

        await mineToNextState(); // reveal

        await reveal(collectionManager, signers[2], 0, voteManager, stakeManager);
        await reveal(collectionManager, signers[3], 0, voteManager, stakeManager);
        await reveal(collectionManager, signers[4], 20, voteManager, stakeManager);
      });

      beforeEach(async () => {
        snapshotId = await takeSnapshot();
      });

      afterEach(async () => {
        await restoreSnapshot(snapshotId);
      });

      it('should have correct influence after committing again', async function () {
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        const ageAfter = await stakeManager.getAge(stakerIdAcc3);
        const expectedAgeDifference = toBigNumber(10000);
        const influenceAfter = (await stakeManager.getInfluence(stakerIdAcc3));
        assertBNEqual(toBigNumber(ageAfter).sub(ageBefore), expectedAgeDifference, 'Age difference incorrect');
        assertBNLessThan(influenceBefore, influenceAfter, 'Not rewarded');
        assertBNEqual(toBigNumber(ageBefore).add(10000), ageAfter, 'Penalty should not be applied');
      });

      it('Account 3 votes should be registered after reveal again', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        const anyLeafId = await getAnyAssignedIndex(signers[3]);
        const collectionId = await collectionManager.getCollectionIdFromLeafId(anyLeafId);
        const voteValueForThatCollectionId = (toBigNumber(collectionId)).mul(100);
        assertBNEqual((await voteManager.getVoteValue(epoch, stakerIdAcc3, collectionId)), voteValueForThatCollectionId,
          'Votes not matching');
      });

      it('account 4 should be penalised for incorrect voting in the previous epoch but not account 2 due to asset tolerance', async function () {
        let epoch = await getEpoch();

        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);

        await mineToNextState(); // propose
        const medians = await calculateMedians(collectionManager);

        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
        const ageBeforeStaker2 = await stakeManager.getAge(stakerIdAcc2);
        const ageBeforeStaker4 = await stakeManager.getAge(stakerIdAcc4);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await mineToNextState(); // commit
        epoch = await getEpoch();

        let secret = await getSecret(signers[4]);
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
        secret = await getSecret(signers[2]);
        await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);
        secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        let expectedAgeAfter4 = toBigNumber(ageBeforeStaker4).add(10000);

        let prod;
        let penalty = toBigNumber('0');

        const idsProposedOfLastEpoch = (await blockManager.getBlock(epoch - 1)).ids;
        for (let i = 0; i < idsProposedOfLastEpoch.length; i++) {
          const votesOfLastEpoch = await voteManager.getVoteValue(epoch - 1, stakerIdAcc4, idsProposedOfLastEpoch[i]);
          const tolerance = await collectionManager.getCollectionTolerance(idsProposedOfLastEpoch[i]);
          const maxVoteTolerance = toBigNumber(medians[i]).add(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          const minVoteTolerance = toBigNumber(medians[i]).sub(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));

          prod = toBigNumber(votesOfLastEpoch).mul(expectedAgeAfter4);
          if (Number(votesOfLastEpoch) !== 0) {
            if (votesOfLastEpoch > maxVoteTolerance) {
              const toAdd = (prod.div(maxVoteTolerance)).sub(expectedAgeAfter4);
              penalty = penalty.add(toAdd);
            } else if (votesOfLastEpoch < minVoteTolerance) {
              const toAdd = expectedAgeAfter4.sub(prod.div(minVoteTolerance));
              penalty = penalty.add(toAdd);
            }
          }
        }

        expectedAgeAfter4 = toBigNumber(expectedAgeAfter4).sub(penalty);

        const ageAfter2 = await stakeManager.getAge(stakerIdAcc2);
        const ageAfter4 = await stakeManager.getAge(stakerIdAcc4);
        // 2s age should increase
        assertBNEqual(toBigNumber(ageBeforeStaker2).add(toBigNumber(10000)), ageAfter2, 'Age Penalty should not be applied');
        // 4s age should decrease, age penalty should be applied
        assertBNEqual(ageAfter4, expectedAgeAfter4, 'Age Penalty should be applied');
      });

      it('Correct penalties need to be given even after an asset has been deactivated', async function () {
        await mineToNextState();
        await mineToNextState();
        await mineToNextState();
        await collectionManager.setCollectionStatus(false, 5);
        await mineToNextEpoch();
        await reset();
        let epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800];
        let secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        // // const votes2 = [100, 206, 300, 400, 500, 600, 700, 800];
        secret = await getSecret(signers[4]);
        await commit(signers[4], -99, voteManager, collectionManager, secret, blockManager);

        await mineToNextState();

        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);

        await reveal(collectionManager, signers[3], 0, voteManager, stakeManager, collectionManager);
        await reveal(collectionManager, signers[4], -99, voteManager, stakeManager, collectionManager);

        await mineToNextState(); // propose

        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
        const medians = await calculateMedians(collectionManager);
        await reset();
        const ageBeforeOf4 = await stakeManager.getAge(stakerIdAcc4);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();

        await mineToNextState(); // commit
        epoch = await getEpoch();
        secret = await getSecret(signers[4]);
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
        let penalty = toBigNumber(0);
        let toAdd = toBigNumber(0);
        let prod = toBigNumber(0);

        const idsProposedOfLastEpoch = (await blockManager.getBlock(epoch - 1)).ids;
        let expectedAgeAfterOf4 = toBigNumber(ageBeforeOf4).add(10000);
        expectedAgeAfterOf4 = expectedAgeAfterOf4 > 1000000 ? 1000000 : expectedAgeAfterOf4;

        for (let i = 0; i < idsProposedOfLastEpoch.length; i++) {
          const votesOfLastEpoch = await voteManager.getVoteValue(epoch - 1, stakerIdAcc4, idsProposedOfLastEpoch[i]);
          const tolerance = await collectionManager.getCollectionTolerance(idsProposedOfLastEpoch[i]);
          const maxVoteTolerance = toBigNumber(medians[i]).add(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          const minVoteTolerance = toBigNumber(medians[i]).sub(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          prod = toBigNumber(votesOfLastEpoch).mul(expectedAgeAfterOf4);
          if (Number(votesOfLastEpoch) !== 0) {
            if (votesOfLastEpoch > maxVoteTolerance) {
              toAdd = (prod.div(maxVoteTolerance)).sub(expectedAgeAfterOf4);
              penalty = penalty.add(toAdd);
            } else if (votesOfLastEpoch < minVoteTolerance) {
              toAdd = expectedAgeAfterOf4.sub(prod.div(minVoteTolerance));
              penalty = penalty.add(toAdd);
            }
          }
        }
        expectedAgeAfterOf4 = toBigNumber(expectedAgeAfterOf4).sub(penalty);
        expectedAgeAfterOf4 = expectedAgeAfterOf4 < 0 ? 0 : expectedAgeAfterOf4;
        const ageAfter2 = await stakeManager.getAge(stakerIdAcc4);
        assertBNEqual(expectedAgeAfterOf4, ageAfter2, 'Incorrect Penalties given');
      });

      it('should penalize staker if number of inactive epochs is greater than grace_period', async function () {
        await reset();
        const stake = tokenAmount('420000');
        let staker = await stakeManager.getStaker(3);

        const epochsJumped = GRACE_PERIOD + 2;
        for (let i = 0; i < epochsJumped; i++) {
          await mineToNextEpoch();
        }

        // commit
        const secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        staker = await stakeManager.stakers(3);
        assertBNNotEqual(staker.stake, stake, 'Stake should have decreased due to penalty');
      });

      it('should penalize staker age if number of inactive epochs is greater than grace_period', async function () {
        await reset();
        let staker = await stakeManager.getStaker(3);
        const ageBefore = staker.age;

        const epochsJumped = GRACE_PERIOD + 2;
        for (let i = 0; i < epochsJumped; i++) {
          await mineToNextEpoch();
        }

        // commit
        const secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        staker = await stakeManager.stakers(3);
        assertBNLessThan(toBigNumber(staker.age), toBigNumber(ageBefore), 'Staker age should have decreased due to penalty');
      });

      it('Staker age should be penalized based on penaltyAgeNotRevealNum', async function () {
        await reset();
        const penaltyAgeNotRevealNum = await rewardManager.penaltyAgeNotRevealNum();
        const penaltyPercentage = penaltyAgeNotRevealNum / BASE_DENOMINATOR;

        await mineToNextEpoch();
        let secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        let staker = await stakeManager.getStaker(3);
        const ageBefore = staker.age;

        const epochsJumped = GRACE_PERIOD + 2;
        for (let i = 0; i < epochsJumped; i++) {
          await mineToNextEpoch();
        }
        // commit
        secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        const penaltyAge = penaltyPercentage * epochsJumped * ageBefore;
        const expectedAge = Math.round(ageBefore - penaltyAge);
        staker = await stakeManager.stakers(3);

        assertBNEqual(staker.age, expectedAge, 'Staker age should decrease based on penaltyAgeNotRevealNum');

        await mineToNextState();
        await reveal(collectionManager, signers[3], 0, voteManager, stakeManager, collectionManager);
      });

      it('should not penalize staker if number of inactive epochs is smaller than / equal to grace_period', async function () {
        await reset();
        await mineToNextEpoch();
        let staker = await stakeManager.getStaker(3);
        const { stake } = staker;

        const epochsJumped = GRACE_PERIOD;
        for (let i = 0; i < epochsJumped; i++) {
          await mineToNextEpoch();
        }

        const secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
        await mineToNextState();

        await reveal(collectionManager, signers[3], 0, voteManager, stakeManager, collectionManager);
        staker = await stakeManager.stakers(3);
        assertBNEqual(staker.stake, stake, 'Stake should not change');
      });

      it('should penalize staker even if they restake and not do commit/reveal in grace_period', async function () {
        await reset();
        await mineToNextEpoch();
        let epoch = await getEpoch();
        let staker = await stakeManager.getStaker(3);

        const epochsJumped = GRACE_PERIOD;
        for (let i = 0; i < epochsJumped; i++) {
          await mineToNextEpoch();
        }
        epoch = await getEpoch();

        const stake2 = tokenAmount('2300');
        await razor.connect(signers[3]).approve(stakeManager.address, stake2);
        await stakeManager.connect(signers[3]).stake(epoch, stake2);

        await mineToNextEpoch();
        epoch = await getEpoch();
        staker = await stakeManager.getStaker(3);
        const newStake = staker.stake;

        const secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
        staker = await stakeManager.getStaker(3);

        assertBNNotEqual(staker.stake, newStake, 'Stake should have decreased due to inactivity penalty');
      });
    });

    describe('VoteManager: Snitch', async () => {
      before(async () => {
        await mineToNextState(); // propose

        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);

        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await mineToNextState(); // commit

        let secret = await getSecret(signers[4]);
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
        secret = await getSecret(signers[2]);
        await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);
        secret = await getSecret(signers[3]);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
      });

      beforeEach(async () => {
        snapshotId = await takeSnapshot();
      });

      afterEach(async () => {
        await restoreSnapshot(snapshotId);
      });

      it('Account 4 should have his stake slashed for leaking out his secret to another account before the reveal state', async function () {
        const epoch = await getEpoch();

        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakeBeforeAcc4 = (await stakeManager.stakers(stakerIdAcc4)).stake;

        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[4]);
        const root = await getRoot(signers[4]);

        await voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);

        const slashNums = await stakeManager.slashNums();
        const bountySlashNum = slashNums[0];
        const burnSlashNum = slashNums[1];
        const keepSlashNum = slashNums[2];
        const amountToBeBurned = stakeBeforeAcc4.mul(burnSlashNum).div(BASE_DENOMINATOR);
        const bounty = stakeBeforeAcc4.mul(bountySlashNum).div(BASE_DENOMINATOR);
        const amountTobeKept = stakeBeforeAcc4.mul(keepSlashNum).div(BASE_DENOMINATOR);
        const slashPenaltyAmount = amountToBeBurned.add(bounty).add(amountTobeKept);

        assertBNEqual((await stakeManager.stakers(stakerIdAcc4)).stake, stakeBeforeAcc4.sub(slashPenaltyAmount), 'stake should be less by slashPenalty');

        // Bounty should be locked
        const bountyLock = await stakeManager.bountyLocks(toBigNumber('1'));
        assertBNEqual(await stakeManager.bountyCounter(), toBigNumber('1'));
        assertBNEqual(bountyLock.bountyHunter, signers[10].address);
        assertBNEqual(bountyLock.redeemAfter, epoch + WITHDRAW_LOCK_PERIOD);
        assertBNEqual(bountyLock.amount, bounty);
      });

      it('staker should not be snitched on multiple times for same mal activity irrespective of slashPenalty', async function () {
        const epoch = await getEpoch();

        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[4]);
        const root = await getRoot(signers[4]);
        await voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);

        await assertRevert(tx, 'incorrect secret/value');
      });

      it('staker should not be able to snitch from himself', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[3]);
        const root = await getRoot(signers[3]);
        const tx = voteManager.connect(signers[3]).snitch(epoch, root, secret, signers[3].address);
        await assertRevert(tx, 'cant snitch on yourself');
      });

      it('should not be able to snitch from a staker who does not exists', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[7]);
        const root = await getRoot(signers[4]);
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[7].address);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('Should not be able to snitch with incorrect secret or values', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        // const realSecret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        const incorrectSecret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc';
        const root = await getRoot(signers[4]);
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, incorrectSecret, signers[4].address);
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('Should not be able to snitch from an innocent staker if secret provided is empty', async function () {
        const epoch = await getEpoch();
        const secret = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const root = await getRoot(signers[4]);
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);
        await assertRevert(tx, 'secret cannot be empty');
      });

      it('Once Lock Period is over, BountyHunter should be able to redeem bounty of snitch', async function () {
        const epoch = await getEpoch();
        const secret = await getSecret(signers[4]);
        const root = await getRoot(signers[4]);
        await voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);

        // Anyone shouldnt be able to redeem someones elses bounty
        const tx = stakeManager.connect(signers[8]).redeemBounty(toBigNumber('1'));
        await assertRevert(tx, 'Incorrect Caller');

        // Shouldnt be reedemable before withdrawlock period
        const tx1 = stakeManager.connect(signers[10]).redeemBounty(toBigNumber('1'));
        await assertRevert(tx1, 'Redeem epoch not reached');
        const bountyLock = await stakeManager.bountyLocks(toBigNumber('1'));

        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        // Should able to redeem
        const balanceBeforeAcc10 = await razor.balanceOf(signers[10].address);
        await stakeManager.connect(signers[10]).redeemBounty(toBigNumber('1'));
        const balanceAfterAcc10 = await razor.balanceOf(signers[10].address);
        assertBNEqual(balanceAfterAcc10, balanceBeforeAcc10.add(bountyLock.amount),
          'the bounty hunter should receive half of the slashPenaltyAmount of account 4');

        // Should not able to redeem again
        const tx2 = stakeManager.connect(signers[10]).redeemBounty(toBigNumber('1'));
        await assertRevert(tx2, 'Incorrect Caller');
      });

      it('Should not be able to reveal others secret if not in commit state', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        await mineToNextState(); // reveal
        const root = await getRoot(signers[4]);
        const othersSecret = await getSecret(signers[4]);
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, othersSecret, signers[4].address);
        await assertRevert(tx, 'incorrect state');
      });

      it('Should be able to slash if stake is zero', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();

        await governance.grantRole(GOVERNER_ROLE, signers[0].address);
        await governance.setMinStake(0);
        await governance.setMinSafeRazor(0);

        await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('0'));

        // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[5]);
        await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
        const root = await getRoot(signers[5]);
        const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const bountyCounterBefore = await stakeManager.bountyCounter();
        await voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[5].address);
        const stakeAcc6 = (await stakeManager.stakers(stakerIdAcc6)).stake;
        assertBNEqual(stakeAcc6, toBigNumber('0'), 'Stake of account 5 should be zero');

        // As half of Penalty is zero, slash would have returned 0, which indicates nothing was awarded to bounty hunter
        // hence bountyCounter shouldnt have changed
        assertBNEqual(await stakeManager.bountyCounter(), bountyCounterBefore);
      });

      it('Snitch,Slash,RedeemBounty should work even for stake 1', async function () {
        await mineToNextEpoch();

        await governance.grantRole(GOVERNER_ROLE, signers[0].address);
        await governance.setMinStake(0);
        await governance.setMinSafeRazor(0);

        let epoch = await getEpoch();
        await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('1'));

        // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = await getSecret(signers[5]);
        await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
        const root = await getRoot(signers[5]);

        const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
        const stakeBeforeAcc5 = (await stakeManager.stakers(stakerIdAcc5)).stake;
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const balanceBeforeAcc10 = await razor.balanceOf(signers[10].address);

        await voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[5].address);

        const slashNums = await stakeManager.slashNums();
        const bountySlashNum = slashNums[0];
        const burnSlashNum = slashNums[1];
        const keepSlashNum = slashNums[2];
        const amountToBeBurned = stakeBeforeAcc5.mul(burnSlashNum).div(BASE_DENOMINATOR);
        const bounty = stakeBeforeAcc5.mul(bountySlashNum).div(BASE_DENOMINATOR);
        const amountTobeKept = stakeBeforeAcc5.mul(keepSlashNum).div(BASE_DENOMINATOR);
        const slashPenaltyAmount = amountToBeBurned.add(bounty).add(amountTobeKept);

        const stakeAfterAcc5 = (await stakeManager.stakers(stakerIdAcc5)).stake;
        assertBNEqual(stakeAfterAcc5, stakeBeforeAcc5.sub(slashPenaltyAmount), 'Stake of account 5 should lessen by slashPenaltyAmount');

        // Bounty should be locked
        const bountyId = await stakeManager.bountyCounter();
        const bountyLock = await stakeManager.bountyLocks(bountyId);
        epoch = await getEpoch();
        assertBNEqual(bountyLock.bountyHunter, signers[10].address);
        assertBNEqual(bountyLock.redeemAfter, epoch + WITHDRAW_LOCK_PERIOD);
        assertBNEqual(bountyLock.amount, bounty);

        // Anyone shouldnt be able to redeem someones elses bounty
        const tx = stakeManager.connect(signers[8]).redeemBounty(bountyId);
        await assertRevert(tx, 'Incorrect Caller');

        // Shouldnt be reedemable before withdrawlock period
        const tx1 = stakeManager.connect(signers[10]).redeemBounty(bountyId);
        await assertRevert(tx1, 'Redeem epoch not reached');

        for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
          await mineToNextEpoch();
        }

        // Should able to redeem
        await stakeManager.connect(signers[10]).redeemBounty(bountyId);
        const balanceAfterAcc10 = await razor.balanceOf(signers[10].address);
        assertBNEqual(balanceAfterAcc10, balanceBeforeAcc10.add(bounty),
          'the bounty hunter should receive half of the slashPenaltyAmount of account 4');

        // Should not able to redeem again
        const tx2 = stakeManager.connect(signers[10]).redeemBounty(bountyId);
        await assertRevert(tx2, 'Incorrect Caller');
      });
    });

    describe('Vote Manager: No Participation', async () => {
      before(async () => {
        await restoreSnapshot(snapshotId2);
      });

      beforeEach(async () => {
        snapshotId = await takeSnapshot();
      });

      afterEach(async () => {
        await restoreSnapshot(snapshotId);
      });

      it('Block should not be proposed when no one votes', async function () {
        const epoch = await getEpoch();
        // commit state
        await mineToNextState();
        // reveal state
        await mineToNextState();
        // propose state
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        const tx = blockManager.connect(signers[3]).propose(epoch,
          [],
          [],
          iteration,
          biggestStakerId);
        try {
          await assertRevert(tx, 'Cannot propose without revealing');
        } catch (err) {
          await assertRevert(tx, 'not elected');
        }
      });

      it('No Finalise Dispute should happen if no block is proposed or no one votes', async function () {
        const epoch = await getEpoch();
        // commit state
        await mineToNextState();
        // reveal state
        await mineToNextState();
        // propose state
        await mineToNextState();
        // dispute state
        const sortedVotes = [];
        const tx1 = blockManager.connect(signers[3]).giveSorted(epoch, 1, sortedVotes);
        const tx2 = blockManager.connect(signers[3]).finalizeDispute(epoch, 0, 0);
        assert(tx1, 'should be able to give sorted votes');
        await assertRevert(tx2, 'Invalid dispute');
      });

      it('slashed staker should not be able to participate after it is slashed', async function () {
        let secret = await getSecret(signers[4]);
        const epoch = await getEpoch();
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
        const root = await getRoot(signers[4]);
        await voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);

        await mineToNextEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800];
        secret = await getSecret(signers[4]);
        const tx = commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
        await assertRevert(tx, 'staker is slashed');
        await mineToNextState(); // reveal
        const tx1 = reveal(collectionManager, signers[4], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx1, 'not committed in this epoch');
        await mineToNextState(); // propose
        const tx2 = propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);
        try {
          await assertRevert(tx2, 'Cannot propose without revealing');
        } catch (err) {
          await assertRevert(tx2, 'not elected');
        }
      });
    });
  });
});
