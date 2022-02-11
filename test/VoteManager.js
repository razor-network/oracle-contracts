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
const {
  commit, reveal, propose, getAnyAssignedIndex, reset, getRoot, getCommitment, getValuesArrayRevealed, getTreeRevealData, calculateMedians,
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
    let data = [];

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
        await razor.transfer(signers[2].address, tokenAmount('30000'));
        await razor.transfer(signers[3].address, tokenAmount('423000'));
        await razor.transfer(signers[4].address, tokenAmount('20000'));
        await razor.transfer(signers[5].address, tokenAmount('20000'));
        await razor.transfer(signers[6].address, tokenAmount('20000'));
        await razor.transfer(signers[7].address, tokenAmount('200000'));
        await razor.transfer(signers[8].address, tokenAmount('20000'));
        await razor.transfer(signers[9].address, tokenAmount('20000'));
        await razor.transfer(signers[15].address, tokenAmount('20000'));

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
        await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('30000'));
        await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('420000'));
        await stakeManager.connect(signers[4]).stake(epoch, tokenAmount('20000'));
      });

      it('should not be able to initialize contracts if they are already initialized', async function () {
        const tx = voteManager.connect(signers[0]).initialize(stakeManager.address, rewardManager.address, blockManager.address, collectionManager.address);
        await assertRevert(tx, 'contract already initialized');
      });

      it('should be able to commit', async function () {
        let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const commitment2 = await voteManager.getCommitment(stakerIdAcc3);
        const commitment = await getCommitment(signers[3]);
        assertBNEqual(commitment, commitment2.commitmentHash, 'commitment, commitment2 not equal');

        const age1 = 10000;
        const age2 = await stakeManager.getAge(stakerIdAcc3);
        assertBNEqual(age1, age2, 'age1, age2 not equal');

        // // const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc';
        await commit(signers[4], 4, voteManager, collectionManager, secret);

        const age3 = 10000;
        const age4 = await stakeManager.getAge(stakerIdAcc4);
        assertBNEqual(age3, age4, 'age3, age4 not equal');

        // // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9dcc';
        await commit(signers[2], 4, voteManager, collectionManager, secret);
        const age5 = 10000;
        const age6 = await stakeManager.getAge(stakerIdAcc2);
        assertBNEqual(age5, age6, 'age3, age4 not equal');
      });

      it('should not be able to commit if already commited in a particular epoch', async function () {
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        const tx = commit(signers[3], 0, voteManager, collectionManager, secret);
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
        const tx = commit(signers[7], 0, voteManager, collectionManager, secret);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('should be able to reveal', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;

        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        //
        await mineToNextState(); // reveal
        //
        // // const assignedAssets = await getAssignedAssets(numAssets, stakerIdAcc3, votes, maxAssetsPerStaker, random);
        // const ids = [1,2,3,4,5,6,7,8,9];
        //
        //
        // // Correct Reveal
        await reveal(signers[3], 0, voteManager, stakeManager, collectionManager); // arguments getvVote => epoch, stakerId, assetId
        const anymedianIndex = await getAnyAssignedIndex(signers[3]);
        const voteValueForThatMedianIndex = (anymedianIndex.add(1)).mul(100);
        assertBNEqual(await voteManager.getVoteValue(epoch, stakerIdAcc3, anymedianIndex), voteValueForThatMedianIndex, 'Votes are not matching');

        // const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        await reveal(signers[4], 4, voteManager, stakeManager, collectionManager);
        // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        await reveal(signers[2], 4, voteManager, stakeManager, collectionManager);

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
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret);

        // const votes2 = [106, 206, 306, 406, 506, 606, 706, 806, 906];

        secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9e02481415c0823ea49d847ecb9ddd';
        await commit(signers[4], 20, voteManager, collectionManager, secret);

        // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];

        secret = '0x727d5c9e6d18ed15ce7ac8d3ece6ec8a0e9e02481415c0823ea49d747ecb9ddd';
        await commit(signers[2], 4, voteManager, collectionManager, secret);

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

        await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
        const anymedianIndex = await getAnyAssignedIndex(signers[3]);
        const voteValueForThatMedianIndex = (anymedianIndex.add(1)).mul(100);
        assertBNEqual((await voteManager.getVoteValue(epoch, stakerIdAcc3, anymedianIndex)), voteValueForThatMedianIndex, 'Votes are not matching');

        await reveal(signers[4], 20, voteManager, stakeManager, collectionManager);
        await reveal(signers[2], 4, voteManager, stakeManager, collectionManager);
        const data2 = await getValuesArrayRevealed(signers[2]);
        const data4 = await getValuesArrayRevealed(signers[4]);
        data.push(data4);
        data.push(data2);
      });

      it('account 4 should be penalised for incorrect voting in the previous epoch but not account 2 due to asset tolerance', async function () {
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
        await mineToNextState(); // propose
        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
        const medians = await calculateMedians(collectionManager);
        await reset();
        // const stakeBefore = ((await stakeManager.stakers(stakerIdAcc3)).stake);
        // const stakeBefore2 = ((await stakeManager.stakers(stakerIdAcc4)).stake);
        const ageBefore = await stakeManager.getAge(stakerIdAcc3);
        const ageBefore2 = await stakeManager.getAge(stakerIdAcc4);
        const ageBefore3 = await stakeManager.getAge(stakerIdAcc2);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await mineToNextState(); // commit
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[2], 0, voteManager, collectionManager, secret);

        secret = '0x727d5c9e6d186d15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret);

        secret = '0x727d5c9e6d18ed15ce7ac8d3c8e6ec8a0e9c02481415c0823ea49d847ecb9ddd';
        await commit(signers[4], 0, voteManager, collectionManager, secret);

        const commitment2 = await voteManager.getCommitment(stakerIdAcc3);
        const commitment = await getCommitment(signers[3]);

        assert(commitment === commitment2.commitmentHash, 'commitment, commitment2 not equal');

        // const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // const stakeAfter2 = (await stakeManager.stakers(stakerIdAcc4)).stake;
        let penalty = toBigNumber(0);
        let penalty2 = toBigNumber(0);
        let toAdd = toBigNumber(0);
        let toAdd2 = toBigNumber(0);
        let prod = toBigNumber(0);
        let prod2 = toBigNumber(0);
        const votes2 = [];
        const votes3 = [];
        for (let i = 0; i < medians.length; i++) {
          votes2.push(0);
          votes3.push(0);
        }
        for (let j = 0; j < (data[0]).length; j++) {
          const voteValue = ((data[0])[j]).value;
          votes2[((data[0])[j]).medianIndex] = voteValue;
        }
        for (let j = 0; j < (data[0]).length; j++) {
          const voteValue = ((data[1])[j]).value;
          votes3[((data[1])[j]).medianIndex] = voteValue;
        }
        let expectedAgeAfter2 = toBigNumber(ageBefore2).add(10000);
        expectedAgeAfter2 = expectedAgeAfter2 > 1000000 ? 1000000 : expectedAgeAfter2;
        let expectedAgeAfter3 = toBigNumber(ageBefore3).add(10000);
        expectedAgeAfter3 = expectedAgeAfter3 > 1000000 ? 1000000 : expectedAgeAfter3;
        for (let i = 0; i < medians.length; i++) {
          const tolerance = await collectionManager.getCollectionTolerance(i);
          const maxVoteTolerance = toBigNumber(medians[i]).add(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          const minVoteTolerance = toBigNumber(medians[i]).sub(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          // calculating for signers[4]
          prod = toBigNumber(votes2[i]).mul(expectedAgeAfter2);
          if (votes2[i] !== 0) {
            if (votes2[i] > maxVoteTolerance) {
              toAdd = (prod.div(maxVoteTolerance)).sub(expectedAgeAfter2);
              penalty = penalty.add(toAdd);
            } else if (votes2[i] < minVoteTolerance) {
              toAdd = expectedAgeAfter2.sub(prod.div(minVoteTolerance));
              penalty = penalty.add(toAdd);
            }
          }
          // calculating for signers[2]
          prod2 = toBigNumber(votes3[i]).mul(expectedAgeAfter3);
          if (votes3[i] !== 0) {
            if (votes3[i] > maxVoteTolerance) {
              toAdd2 = (prod2.div(maxVoteTolerance)).sub(expectedAgeAfter3);
              penalty2 = penalty2.add(toAdd2);
            } else if (votes3[i] < minVoteTolerance) {
              toAdd2 = expectedAgeAfter3.sub(prod2.div(minVoteTolerance));
              penalty2 = penalty2.add(toAdd2);
            }
          }
        }
        data = [];
        expectedAgeAfter2 = toBigNumber(expectedAgeAfter2).sub(penalty);
        expectedAgeAfter3 = toBigNumber(expectedAgeAfter3).sub(penalty2);

        const ageAfter = await stakeManager.getAge(stakerIdAcc3);
        const ageAfter2 = await stakeManager.getAge(stakerIdAcc4);

        assertBNEqual(penalty2, toBigNumber('0'), 'Penalty applied');
        assertBNLessThan(toBigNumber(ageBefore), toBigNumber(ageAfter), 'Not rewarded');
        assertBNEqual(toBigNumber(ageBefore3).add(toBigNumber(10000)), expectedAgeAfter3, 'Age Penalty should not be applied');
        assertBNEqual(ageAfter2, expectedAgeAfter2, 'Age Penalty should be applied');
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

        await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
        const anymedianIndex = await getAnyAssignedIndex(signers[3]);
        const voteValueForThatMedianIndex = (anymedianIndex.add(1)).mul(100);
        assertBNEqual((await voteManager.getVoteValue(epoch, stakerIdAcc3, anymedianIndex)), voteValueForThatMedianIndex, 'Votes not matching');

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
        await commit(signers[7], 0, voteManager, collectionManager, secret);
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
        const tx = commit(signers[7], 0, voteManager, collectionManager, secret);
        await assertRevert(tx, 'incorrect state');
      });

      it('Staker should not be able to reveal other than in reveal state', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('20000'));
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[7], 0, voteManager, collectionManager, secret);
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

      // it('Should not be able to reveal with incorrect secret', async function () {
      //   const epoch = await getEpoch();
      //   // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
      //   let correctSecret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      //   let incorrectSecret = '0x727d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      //
      //   const tx = reveal(signers[7], 10, voteManager, stakeManager, collectionManager); // last digit 'd' changed to 'c' for having incorrect secret
      //   await assertRevert(tx, 'incorrect secret/value');
      // });

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
        await commit(signers[7], 0, voteManager, collectionManager, secret);

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
        await commit(signers[6], 0, voteManager, collectionManager, secret);
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
        await commit(signers[5], 0, voteManager, collectionManager, secret);
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

      // it('if the revealed value is zero, staker should not be able to reveal', async function () {
      //   await governance.setMinStake(20000);
      //   await governance.setMinSafeRazor(10000);
      //   await mineToNextEpoch();
      //
      //   let epoch = await getEpoch();
      //   await stakeManager.connect(signers[8]).stake(epoch, tokenAmount('20000'));
      //   await stakeManager.connect(signers[9]).stake(epoch, tokenAmount('20000'));
      //
      //   // const votes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      //
      //   const res1 = utils.solidityKeccak256(
      //     ['uint32', 'uint48[]', 'bytes32'],
      //     [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      //   );
      //
      //   await voteManager.connect(signers[8]).commit(epoch, res1);
      //   const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
      //   const commitment2 = await voteManager.getCommitment(stakerIdAcc8);
      //
      //   assertBNEqual(res1, commitment2.commitmentHash, 'res1, commitment2 not equal');
      //   epoch = await getEpoch();
      //
      //   await mineToNextState(); // reveal
      //
      //   await voteManager.connect(signers[8]).reveal(epoch, votes,
      //     '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      //   //
      //   // await assertRevert(tx, 'revert');
      // });
      // it('if the proposed value is zero, staker should be able to propose', async function () {
      //   const epoch = await getEpoch();
      //
      //   await mineToNextState(); // propose
      //   const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
      //   const staker = await stakeManager.getStaker(stakerIdAcc8);
      //
      //   const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      //   const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      //
      //   const medians = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      //   await blockManager.connect(signers[8]).propose(epoch,
      //     medians,
      //     iteration,
      //     biggestStakerId);
      //
      //   // await assertRevert(tx, 'revert');
      // });
      //
      // it('if the disputed value is zero, staker should not be able to dispute', async function () {
      //   await mineToNextState(); // dispute
      //   const epoch = await getEpoch();
      //
      //   const sortedVotes = [toBigNumber('0')];
      //
      //   const tx = blockManager.connect(signers[9]).giveSorted(epoch, 1, sortedVotes);
      //
      //   await assertRevert(tx, 'sortedStaker <= LVS');
      // });
      //
      // it('if the revealed value is zero, next epoch should work normally', async function () {
      //   await mineToNextState(); // confirm
      //   await blockManager.connect(signers[8]).claimBlockReward();
      //   await mineToNextState(); // commit
      //
      //   let epoch = await getEpoch();
      //
      //   // const votes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      //
      //   const res1 = utils.solidityKeccak256(
      //     ['uint32', 'uint48[]', 'bytes32'],
      //     [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      //   );
      //
      //   await voteManager.connect(signers[8]).commit(epoch, res1);
      //   const stakerIdAcc8 = await stakeManager.stakerIds(signers[8].address);
      //   const commitment2 = await voteManager.getCommitment(stakerIdAcc8);
      //
      //   assertBNEqual(res1, commitment2.commitmentHash, 'res1, commitment2 not equal');
      //
      //   epoch = await getEpoch();
      //
      //   // const votes2 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      //   await mineToNextState(); // reveal
      //
      //   await voteManager.connect(signers[8]).reveal(epoch, votes2,
      //     '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');
      //
      //   epoch = await getEpoch();
      //
      //   await mineToNextState(); // propose
      //
      //   const staker = await stakeManager.getStaker(stakerIdAcc8);
      //
      //   const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      //   const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      //   const medians = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      //   await blockManager.connect(signers[8]).propose(epoch,
      //     medians,
      //     iteration,
      //     biggestStakerId);
      //
      //   //
      //   await mineToNextState(); // dispute
      //   epoch = await getEpoch();
      //   //
      //   const sortedVotes = [toBigNumber('0')];
      //   //
      //   const tx3 = blockManager.connect(signers[9]).giveSorted(epoch, 1, sortedVotes);
      //   //
      //   await assertRevert(tx3, 'sortedStaker <= LVS');
      // });
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
        const tx2 = blockManager.connect(signers[3]).finalizeDispute(epoch, 0);
        assert(tx1, 'should be able to give sorted votes');
        await assertRevert(tx2, 'reverted with panic code 0x12 (Division or modulo division by zero)');
      });
      it('In next epoch everything should work as expected if in previous epoch no one votes', async function () {
        await mineToNextEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // commit state
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const secret = '0x277d5c9e6d18ed45ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[3], 0, voteManager, collectionManager, secret);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        await mineToNextState();
        // reveal state
        await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
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
        await commit(signers[3], 0, voteManager, collectionManager, secret);
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNLessThan(stakeAfter, stakeBefore, 'stake should reduce');
      });
      it('slashed staker should not be able to participate after it is slashed', async function () {
        await mineToNextEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800];
        const secret = '0x277d5c9e6d18ed45ce7ac8d3dde6eca80e9c02481415c0823ea49d847ccb9ddd';
        const tx = commit(signers[4], 0, voteManager, collectionManager, secret);
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
        await commit(signers[3], 0, voteManager, collectionManager, secret);

        // // const votes2 = [100, 206, 300, 400, 500, 600, 700, 800];
        secret = '0x277d5c9e6d18ed45ce7ac843dde6ece80e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[15], 0, voteManager, collectionManager, secret);

        await mineToNextState();

        const stakerIdAcc15 = await stakeManager.stakerIds(signers[15].address);

        await reveal(signers[3], 0, voteManager, stakeManager, collectionManager);
        await reveal(signers[15], 0, voteManager, stakeManager, collectionManager);
        const data3 = await getValuesArrayRevealed(signers[3]);
        data.push(data3);

        await mineToNextState(); // propose

        await propose(signers[3], stakeManager, blockManager, voteManager, collectionManager);
        const medians = await calculateMedians(collectionManager);
        await reset();
        const ageBefore2 = await stakeManager.getAge(stakerIdAcc15);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await mineToNextState(); // commit
        epoch = await getEpoch();
        secret = '0x277d5c9e6d18ed45ce7ac843dde6ece80e9c024814e5c0823ea49d847ccb9ddd';
        await commit(signers[15], 0, voteManager, collectionManager, secret);

        let penalty = toBigNumber(0);
        let toAdd = toBigNumber(0);
        let prod = toBigNumber(0);
        const votes2 = [];
        for (let i = 0; i < medians.length; i++) {
          votes2.push(0);
        }
        for (let j = 0; j < (data[0]).length; j++) {
          const voteValue = ((data[0])[j]).value;
          votes2[((data[0])[j]).medianIndex] = voteValue;
        }
        let expectedAgeAfter2 = toBigNumber(ageBefore2).add(10000);
        expectedAgeAfter2 = expectedAgeAfter2 > 1000000 ? 1000000 : expectedAgeAfter2;
        for (let i = 0; i < medians.length; i++) {
          const tolerance = await collectionManager.getCollectionTolerance(i);
          const maxVoteTolerance = toBigNumber(medians[i]).add(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));
          const minVoteTolerance = toBigNumber(medians[i]).sub(((toBigNumber(medians[i])).mul(tolerance)).div(BASE_DENOMINATOR));

          prod = toBigNumber(votes2[i]).mul(expectedAgeAfter2);
          if (votes2[i] !== 0) {
            if (votes2[i] > maxVoteTolerance) {
              toAdd = (prod.div(maxVoteTolerance)).sub(expectedAgeAfter2);
              penalty = penalty.add(toAdd);
            } else if (votes2[i] < minVoteTolerance) {
              toAdd = expectedAgeAfter2.sub(prod.div(minVoteTolerance));
              penalty = penalty.add(toAdd);
            }
          }
        }
        expectedAgeAfter2 = toBigNumber(expectedAgeAfter2).sub(penalty);
        const ageAfter2 = await stakeManager.getAge(stakerIdAcc15);
        assertBNEqual(toBigNumber(ageAfter2), (toBigNumber(ageBefore2).add(toBigNumber('10000')).sub(penalty)), 'Incorrect Penalties given');
      });
    });
  });
});
