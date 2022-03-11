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

} = require('./helpers/constants'); const {
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
  getBiggestStakeAndId,
  toBigNumber,
  tokenAmount,
} = require('./helpers/utils');
// const { createMerkle, getProofPath } = require('./MerklePosAware');
const {
  commit, reveal, propose, getAnyAssignedIndex, reset, getRoot, getCommitment, getValuesArrayRevealed, getTreeRevealData, getData, calculateMedians,
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
    const data = [];

    before(async () => {
      ({
        blockManager, governance, collectionManager, razor, stakeManager, rewardManager, voteManager, initializeContracts,
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

      it('should be able to initialize', async function () {
        await Promise.all(await initializeContracts());

        await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
        const url = 'http://testurl.com';
        const selector = 'selector';
        let name;
        const power = -2;
        const selectorType = 0;
        const weight = 50;
        let i = 0;
        while (i < 9) {
          name = `test${i}`;
          await collectionManager.createJob(weight, power, selectorType, name, selector, url);
          i++;
        }
        await mineToNextEpoch();
        await mineToNextState();
        await mineToNextState();
        await mineToNextState();
        await mineToNextState();

        let Cname;
        for (let i = 1; i <= 8; i++) {
          Cname = `Test Collection${String(i)}`;
          await collectionManager.createCollection(500, 3, 1, [i, i + 1], Cname);
        }
        Cname = 'Test Collection10';
        await collectionManager.createCollection(500, 3, 1, [9, 1], Cname);

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
      });

      it('should not be able to initialize contracts if they are already initialized', async function () {
        const tx = voteManager.connect(signers[0]).initialize(stakeManager.address, rewardManager.address, blockManager.address, collectionManager.address);
        await assertRevert(tx, 'contract already initialized');
      });

      it('should be able to commit', async function () {
        const epoch = await getEpoch();
        let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
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
        secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc';
        await commit(signers[4], 4, voteManager, collectionManager, secret, blockManager);

        const age3 = 10000;
        const age4 = await stakeManager.getAge(stakerIdAcc4);
        assertBNEqual(age3, age4, 'age3, age4 not equal');

        // // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9dcc';
        await commit(signers[2], 4, voteManager, collectionManager, secret, blockManager);
        const age5 = 10000;
        const age6 = await stakeManager.getAge(stakerIdAcc2);
        assertBNEqual(age5, age6, 'age3, age4 not equal');
      });

      it('should not be able to commit if already commited in a particular epoch', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
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
        const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8ddd';
        const tx = commit(signers[7], 0, voteManager, collectionManager, secret, blockManager);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('should not be able to reveal if length of the votes value is not same as number of active collections', async function () {
        const epoch = await getEpoch();
        const commitment = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dec';
        const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccbced8';
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
        await voteManager.connect(signers[1]).commit(epoch, commitment);
        await mineToNextState(); // reveal
        // eslint-disable-next-line prefer-destructuring
        const tx = voteManager.connect(signers[1]).reveal(epoch, treeRevealData, secret);
        await assertRevert(tx, 'values length mismatch');
      });

      it('if the vote value for assigned asset is zero, staker should not be able to reveal', async function () {
        const epoch = await getEpoch();
        const signer3secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
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
        const tx = voteManager.connect(signers[3]).reveal(epoch, treeRevealData, signer3secret);
        await assertRevert(tx, '0 vote for assigned coll');
      });
      it('should not be able to reveal non alloted assets', async function () {
        const epoch = await getEpoch();
        const signer3secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        const randomBytes = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb8dec';
        const data = await getData(signers[3]);
        const { seqAllotedCollections } = data;
        const { tree } = data;
        const root3 = tree[0][0];
        const values3 = [];
        let nonAssignedCollection;
        const numActiveCollections = await collectionManager.getNumActiveCollections();
        for (let i = 0; i < numActiveCollections; i++) {
          if (!(seqAllotedCollections[i])) {
            nonAssignedCollection = i;
            break;
          }
        }
        for (let j = 0; j < seqAllotedCollections.length; j++) {
          if (j === 0) {
            values3.push({
              leafId: Number(nonAssignedCollection),
              value: (Number(seqAllotedCollections[j]) + 1) * 100,
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
        const tx = voteManager.connect(signers[3]).reveal(epoch, treeRevealData, signer3secret);
        await assertRevert(tx, 'Revealed asset not alloted');
      });

      it('should be able to reveal', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // Correct Reveal
        await reveal(signers[3], 0, voteManager, stakeManager); // arguments getvVote => epoch, stakerId, assetId
        const anyLeafId = await getAnyAssignedIndex(signers[3]);
        const voteValueForThatLeafId = (anyLeafId.add(1)).mul(100);
        assertBNEqual(await voteManager.getVoteValue(epoch, stakerIdAcc3, anyLeafId), voteValueForThatLeafId,
          'Votes are not matching');

        await reveal(signers[4], 4, voteManager, stakeManager);
        await reveal(signers[2], 4, voteManager, stakeManager);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNEqual(stakeBefore, stakeAfter);
      });

      it('should not be able to reveal if secret is zero', async function () {
        const epoch = await getEpoch();
        // const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const treeRevealData = await getTreeRevealData(signers[4]); // getting treeRevealData of signers[4] which revealed in last testcase above
        const tx = voteManager.connect(signers[4]).reveal(epoch, treeRevealData, '0x0000000000000000000000000000000000000000000000000000000000000000');
        await assertRevert(tx, 'secret cannot be empty');
      });

      it('should be able to commit again with correct influence', async function () {
        await mineToNextState(); // propose
        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        await reset();
        const influenceBefore = (await stakeManager.getInfluence(stakerIdAcc3));
        const ageBefore = await stakeManager.getAge(stakerIdAcc3);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await reset();
        await mineToNextState(); // commit
        const epoch = await getEpoch();

        let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        // Signer 4 is voting incoherently
        secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9e02481415c0823ea49d847ecb9ddd';
        await commit(signers[4], 20, voteManager, collectionManager, secret, blockManager);

        secret = '0x727d5c9e6d18ed15ce7ac8d3ece6ec8a0e9e02481415c0823ea49d747ecb9ddd';
        await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);

        const commitment4 = await voteManager.getCommitment(stakerIdAcc3);
        const commitment = await getCommitment(signers[3]);
        assertBNEqual(commitment, commitment4.commitmentHash, 'commitment, commitment3 not equal');

        const ageAfter = await stakeManager.getAge(stakerIdAcc3);
        const expectedAgeDifference = toBigNumber(10000);
        const influenceAfter = (await stakeManager.getInfluence(stakerIdAcc3));
        assertBNEqual(toBigNumber(ageAfter).sub(ageBefore), expectedAgeDifference, 'Age difference incorrect');
        assertBNLessThan(influenceBefore, influenceAfter, 'Not rewarded');
        assertBNEqual(toBigNumber(ageBefore).add(10000), ageAfter, 'Penalty should not be applied');

        await mineToNextState(); // reveal

        await reveal(signers[3], 0, voteManager, stakeManager);
        const anyLeafId = await getAnyAssignedIndex(signers[3]);
        const voteValueForThatLeafId = (anyLeafId.add(1)).mul(100);
        assertBNEqual((await voteManager.getVoteValue(epoch, stakerIdAcc3, anyLeafId)), voteValueForThatLeafId,
          'Votes are not matching');

        await reveal(signers[4], 20, voteManager, stakeManager);
        await reveal(signers[2], 0, voteManager, stakeManager);
        const data2 = await getValuesArrayRevealed(signers[2]);
        const data4 = await getValuesArrayRevealed(signers[4]);
        data.push(data4);
        data.push(data2);
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

        const secret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
        await commit(signers[2], 0, voteManager, collectionManager, secret, blockManager);
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        let expectedAgeAfter4 = toBigNumber(ageBeforeStaker4).add(10000);

        let prod;
        let penalty = toBigNumber('0');

        const idsProposedOfLastEpoch = (await blockManager.getBlock(epoch - 1)).ids;
        for (let i = 0; i < idsProposedOfLastEpoch.length; i++) {
          const index = await collectionManager.getLeafIdOfCollection(idsProposedOfLastEpoch[i]);
          const votesOfLastEpoch = await voteManager.getVoteValue(epoch - 1, stakerIdAcc4, index);
          const tolerance = await collectionManager.getCollectionTolerance(index);
          const maxVoteTolerance = toBigNumber(medians[i]).add(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          const minVoteTolerance = toBigNumber(medians[i]).sub(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));

          prod = toBigNumber(votesOfLastEpoch).mul(expectedAgeAfter4);
          if (votesOfLastEpoch !== 0) {
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

      it('Account 4 should have his stake slashed for leaking out his secret to another account before the reveal state', async function () {
        const epoch = await getEpoch();

        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakeBeforeAcc4 = (await stakeManager.stakers(stakerIdAcc4)).stake;

        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        const root = await getRoot(signers[4]);

        await governance.grantRole(GOVERNER_ROLE, signers[0].address);
        await governance.setSlashParams(500, 4500, 0);
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
        assertBNEqual(bounty, slashPenaltyAmount.div(toBigNumber('10'))); // To check if contract calculation is working as expected
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
        const secret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        const root = await getRoot(signers[4]);
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);

        await governance.setSlashParams(500, 9500, 0);// Restoring the slashPenaltyNum again
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('staker should not be able to snitch from himself', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        const root = await getRoot(signers[4]);
        const tx = voteManager.connect(signers[4]).snitch(epoch, root, secret, signers[4].address);
        await assertRevert(tx, 'cant snitch on yourself');
      });

      it('should not be able to snitch from a staker who does not exists', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
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

      it('Account 3 should be able to reveal again', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        // const ageBefore = (await stakeManager.stakers(stakerIdAcc3)).age;

        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        await mineToNextState(); // reveal

        await reveal(signers[3], 0, voteManager, stakeManager);
        const anyLeafId = await getAnyAssignedIndex(signers[3]);
        const voteValueForThatLeafId = (anyLeafId.add(1)).mul(100);
        assertBNEqual((await voteManager.getVoteValue(epoch, stakerIdAcc3, anyLeafId)), voteValueForThatLeafId,
          'Votes not matching');

        // const ageAfter = (await stakeManager.stakers(stakerIdAcc3)).age;
        // assertBNEqual(ageBefore.add(10000), ageAfter);
      });

      it('should not be able to reveal if staker does not exists', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed45ce7ac8d6ecc3ec8a0e9c02481415c0823ea49d847ccb9ece';
        const treeRevealData = await getTreeRevealData(signers[3]); /* intentionally passing signers[3]s reveal data since signers[7]
         hasn't revealed yet but this won't affect moto of test case */
        const tx = voteManager.connect(signers[7]).reveal(epoch, treeRevealData, secret);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('Once Lock Period is over, BountyHunter should be able to redeem bounty of snitch', async function () {
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

      it('should not be able to commit if stake is below minstake', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('20000'));
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        let staker = await stakeManager.getStaker(stakerId);
        // slashing the staker to make his stake below minstake
        await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
        await stakeManager.setStakerStake(epoch, stakerId, 2, staker.stake, tokenAmount('999'));
        staker = await stakeManager.getStaker(stakerId);
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[7], 0, voteManager, collectionManager, secret, blockManager);
        const commitment2 = await voteManager.getCommitment(stakerId);
        const commitment = await getCommitment(signers[7]);
        assert(commitment2.commitmentHash.toString() !== commitment.toString(), 'commitment was successful');
      });

      it('Staker should not be able to reveal if not committed', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        await mineToNextState(); // reveal
        const tx = reveal(signers[7], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx, 'not committed in this epoch');
      });

      it('should not be able to commit other than in commit state', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        const tx = commit(signers[7], 0, voteManager, collectionManager, secret, blockManager);
        await assertRevert(tx, 'incorrect state');
      });

      it('Staker should not be able to reveal other than in reveal state', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('20000'));
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[7], 0, voteManager, collectionManager, secret, blockManager);
        const tx = reveal(signers[7], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx, 'incorrect state');
      });

      it('Should not be able to reveal others secret if not in commit state', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        await mineToNextState(); // reveal
        const root = await getRoot(signers[4]);
        const othersSecret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, othersSecret, signers[7].address);
        await assertRevert(tx, 'incorrect state');
      });

      it('Should not be able to reveal with incorrect value', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const tx = reveal(signers[7], 10, voteManager, stakeManager, collectionManager); // value changed with deviation 10
        await assertRevert(tx, 'invalid merkle proof');
      });

      it('Should not be able to reveal with incorrect secret', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        // const correctSecret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';  This was the correctSecret for signers[7]
        const incorrectSecret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc';
        // last digit 'd' changed to 'c' for having incorrect secret
        const treeRevealData = await getTreeRevealData(signers[7]);
        const tx = voteManager.connect(signers[7]).reveal(epoch, treeRevealData, incorrectSecret);
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('should not be able to call snitch on a staker if staker has not commited in present epoch', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        const root = await getRoot(signers[4]);
        const tx = voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[4].address);
        await assertRevert(tx, 'not committed in this epoch');
      });

      it('Staker should not be able to commit in present epoch for commitment of next epoch', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitment(signers[7]);
        const tx = voteManager.connect(signers[7]).commit(epoch + 1, commitment);
        await assertRevert(tx, 'incorrect epoch');
      });

      it('Staker should not be able to reveal if stake is zero', async function () {
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const staker = await stakeManager.getStaker(stakerId);
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed15ce7ac7e3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[7], 0, voteManager, collectionManager, secret, blockManager);

        await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
        // setting stake below minstake
        await stakeManager.setStakerStake(epoch, stakerId, 2, staker.stake, tokenAmount('0'));

        await mineToNextState(); // reveal
        const tx = reveal(signers[7], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx, 'stake below minimum');
      });

      it('Should be able to slash if stake is zero', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();

        await governance.setMinStake(0);
        await governance.setMinSafeRazor(0);

        await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('0'));

        // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d81ed15ce7ac7e3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[6], 0, voteManager, collectionManager, secret, blockManager);
        const root = await getRoot(signers[6]);
        const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const bountyCounterBefore = await stakeManager.bountyCounter();
        await voteManager.connect(signers[10]).snitch(epoch, root, secret, signers[6].address);
        const stakeAcc6 = (await stakeManager.stakers(stakerIdAcc6)).stake;
        assertBNEqual(stakeAcc6, toBigNumber('0'), 'Stake of account 6 should be zero');

        // As half of Penalty is zero, slash would have returned 0, which indicates nothing was awarded to bounty hunter
        // hence bountyCounter shouldnt have changed
        assertBNEqual(await stakeManager.bountyCounter(), bountyCounterBefore);
      });

      it('Snitch,Slash,RedeemBounty should work even for stake 1', async function () {
        let epoch = await getEpoch();
        await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('1'));

        // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d81ed15ce7ac73ec8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
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

      it('Block should not be proposed when no one votes', async function () {
        await mineToNextEpoch();
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
        await mineToNextState();
        // dispute state
        const sortedVotes = [];
        const tx1 = blockManager.connect(signers[3]).giveSorted(epoch, 1, sortedVotes);
        const tx2 = blockManager.connect(signers[3]).finalizeDispute(epoch, 0, 0);
        assert(tx1, 'should be able to give sorted votes');
        await assertRevert(tx2, 'Invalid dispute');
      });
      it('In next epoch everything should work as expected if in previous epoch no one votes', async function () {
        await mineToNextEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // commit state
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x277d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        await mineToNextState();
        // reveal state
        await reveal(signers[3], 0, voteManager, stakeManager);
        await mineToNextState(); // propose state
        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
        await reset();
        // penalty should be applied for not voting in previous epoch
        assert(stakeAfter, stakeBefore, 'no penalties when medians length is 0 and epochInactive less than grace period');
      });
      it('penalties should be applied if staker does not participate for more than 8 epochs(grace period)', async function () {
        await mineToNextState();
        await mineToNextState();
        for (let i = 0; i <= 10; i++) {
          await mineToNextEpoch();
        }
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // commit state
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x277d5c9e6d18ed45ce7ac8d3cce6eca80e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNLessThan(stakeAfter, stakeBefore, 'stake should reduce');
      });
      it('slashed staker should not be able to participate after it is slashed', async function () {
        await mineToNextEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800];
        const secret = '0x277d5c9e6d18ed45ce7ac8d3dde6eca80e9c02481415c0823ea49d847ccb9ddd';
        const tx = commit(signers[4], 0, voteManager, collectionManager, secret, blockManager);
        await assertRevert(tx, 'staker is slashed');
        await mineToNextState(); // reveal
        const tx1 = reveal(signers[4], 0, voteManager, stakeManager, collectionManager);
        await assertRevert(tx1, 'not committed in this epoch');
        await mineToNextState(); // propose
        const tx2 = propose(signers[4], stakeManager, blockManager, voteManager, collectionManager);
        try {
          await assertRevert(tx2, 'Cannot propose without revealing');
        } catch (err) {
          await assertRevert(tx2, 'not elected');
        }
      });
      it('Correct penalties need to be given even after an asset has been deactivated', async function () {
        await mineToNextState();
        await mineToNextState();
        await collectionManager.setCollectionStatus(false, 9);
        await mineToNextEpoch();
        await reset();
        let epoch = await getEpoch();
        await stakeManager.connect(signers[15]).stake(epoch, tokenAmount('20000'));
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800];
        let secret = '0x277d5c9e6d18ed45ce7ac843dde6eca80e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret, blockManager);

        // // const votes2 = [100, 206, 300, 400, 500, 600, 700, 800];
        await commit(signers[15], -99, voteManager, collectionManager, secret, blockManager);

        await mineToNextState();

        const stakerIdAcc15 = await stakeManager.stakerIds(signers[15].address);

        await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
        await reveal(signers[15], -99, voteManager, stakeManager, collectionManager);

        await mineToNextState(); // propose

        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
        const medians = await calculateMedians(collectionManager);
        await reset();
        const ageBeforeOf15 = await stakeManager.getAge(stakerIdAcc15);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();

        await mineToNextState(); // commit
        epoch = await getEpoch();
        secret = '0x277d5c9e6d18ed45ce7ac843dde6ece80e9c024814e5c0823ea49d847ccb9ddd';
        await commit(signers[15], 0, voteManager, collectionManager, secret, blockManager);
        let penalty = toBigNumber(0);
        let toAdd = toBigNumber(0);
        let prod = toBigNumber(0);

        const idsProposedOfLastEpoch = (await blockManager.getBlock(epoch - 1)).ids;

        let expectedAgeAfterOf15 = toBigNumber(ageBeforeOf15).add(10000);
        expectedAgeAfterOf15 = expectedAgeAfterOf15 > 1000000 ? 1000000 : expectedAgeAfterOf15;

        for (let i = 0; i < idsProposedOfLastEpoch.length; i++) {
          const index = await collectionManager.getLeafIdOfCollection(idsProposedOfLastEpoch[i]);
          const votesOfLastEpoch = await voteManager.getVoteValue(epoch - 1, stakerIdAcc15, index);
          const tolerance = await collectionManager.getCollectionTolerance(index);
          const maxVoteTolerance = toBigNumber(medians[i]).add(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          const minVoteTolerance = toBigNumber(medians[i]).sub(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));

          prod = toBigNumber(votesOfLastEpoch).mul(expectedAgeAfterOf15);
          if (votesOfLastEpoch !== 0) {
            if (votesOfLastEpoch > maxVoteTolerance) {
              toAdd = (prod.div(maxVoteTolerance)).sub(expectedAgeAfterOf15);
              penalty = penalty.add(toAdd);
            } else if (votesOfLastEpoch < minVoteTolerance) {
              toAdd = expectedAgeAfterOf15.sub(prod.div(minVoteTolerance));
              penalty = penalty.add(toAdd);
            }
          }
        }
        expectedAgeAfterOf15 = toBigNumber(expectedAgeAfterOf15).sub(penalty);
        expectedAgeAfterOf15 = expectedAgeAfterOf15 < 0 ? 0 : expectedAgeAfterOf15;
        const ageAfter2 = await stakeManager.getAge(stakerIdAcc15);
        assertBNEqual(expectedAgeAfterOf15, ageAfter2, 'Incorrect Penalties given');
      });
    });
  });
});
