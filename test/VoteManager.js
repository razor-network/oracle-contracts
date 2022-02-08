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
  getCommitAndRevealData,
} = require('./helpers/utils');

const { commit, reveal, propose } = require('./helpers/InternalEngine');

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
    let dataRevealedThisEpoch = { influence: [], values: [] };

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
        const commitment1 = utils.solidityKeccak256(
          ['uint32', 'bytes32'],
          [epoch, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
        );
        const tx = voteManager.connect(signers[5]).commit(epoch, commitment1);
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
          await collectionManager.createCollection(500000, 3, 1, [i, i + 1], Cname);
        }
        Cname = 'Test Collection10';
        await collectionManager.createCollection(500000, 3, 1, [9, 1], Cname);

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
        await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('20000'));
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
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[3]).commit(epoch, commitment1[0]);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const commitment2 = await voteManager.getCommitment(stakerIdAcc3);

        assertBNEqual(commitment1[0], commitment2.commitmentHash, 'commitment1, commitment2 not equal');

        const age1 = 10000;
        const age2 = await stakeManager.getAge(stakerIdAcc3);
        assertBNEqual(age1, age2, 'age1, age2 not equal');

        // // const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];

        const commitment3 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        await voteManager.connect(signers[4]).commit(epoch, commitment3[0]);

        const age3 = 10000;
        const age4 = await stakeManager.getAge(stakerIdAcc4);
        assertBNEqual(age3, age4, 'age3, age4 not equal');

        // // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];

        const commitment4 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        await voteManager.connect(signers[2]).commit(epoch, commitment4[0]);
        const age5 = 10000;
        const age6 = await stakeManager.getAge(stakerIdAcc2);
        assertBNEqual(age5, age6, 'age3, age4 not equal');
      });

      it('should not be able to commit if already commited in a particular epoch', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        const tx = voteManager.connect(signers[3]).commit(epoch, commitment1[0]);
        await assertRevert(tx, 'already commited');
      });

      it('should not be able to commit if commitment is zero', async function () {
        const epoch = await getEpoch();
        const tx = voteManager.connect(signers[3]).commit(epoch, '0x0000000000000000000000000000000000000000000000000000000000000000');
        await assertRevert(tx, 'Invalid commitment');
      });

      it('should not be able to commit if staker does not exists', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        const tx = voteManager.connect(signers[7]).commit(epoch, commitment1[0]);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('should not be able to reveal if length of the votes value is not same as number of active collections', async function () {
        const epoch = await getEpoch();
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[1]).commit(epoch, commitment[0]);
        await mineToNextState(); // reveal
        const treeRevealData = commitment[1];
        // eslint-disable-next-line prefer-destructuring
        treeRevealData.values = [treeRevealData.values[0]];
        const tx = voteManager.connect(signers[1]).reveal(epoch, treeRevealData, commitment[2]);
        await assertRevert(tx, 'values length mismatch');
      });

      it('should be able to reveal', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;

        // // Correct Reveal
        const commitment3 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[3]).reveal(epoch, commitment3[1], commitment3[2]); // arguments getvVote => epoch, stakerId, assetId
        const influenceAcc3 = await voteManager.getInfluenceSnapshot(epoch, stakerIdAcc3);
        dataRevealedThisEpoch.influence.push(influenceAcc3);
        dataRevealedThisEpoch.values.push(commitment3[6]);
        const anymedianIndex = toBigNumber(commitment3[3][0]);
        const voteValueForThatMedianIndex = (anymedianIndex.add(1)).mul(100);
        assertBNEqual(await voteManager.getVoteValue(epoch, stakerIdAcc3, anymedianIndex), voteValueForThatMedianIndex, 'Votes are not matching');

        // const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const commitment4 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        await voteManager.connect(signers[4]).reveal(epoch, commitment4[1], commitment4[2]);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const influenceAcc4 = await voteManager.getInfluenceSnapshot(epoch, stakerIdAcc4);
        dataRevealedThisEpoch.influence.push(influenceAcc4);
        dataRevealedThisEpoch.values.push(commitment4[6]);

        // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const commitment2 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        await voteManager.connect(signers[2]).reveal(epoch, commitment2[1], commitment2[2]);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
        const influenceAcc2 = await voteManager.getInfluenceSnapshot(epoch, stakerIdAcc2);
        dataRevealedThisEpoch.influence.push(influenceAcc2);
        dataRevealedThisEpoch.values.push(commitment2[6]);

        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNEqual(stakeBefore, stakeAfter);
      });

      it('should not be able to reveal if secret is zero', async function () {
        const epoch = await getEpoch();
        // const votes2 = [104, 204, 304, 404, 504, 604, 704, 804, 904];
        const commitment2 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        const tx = voteManager.connect(signers[4]).reveal(epoch, commitment2[1], '0x0000000000000000000000000000000000000000000000000000000000000000');
        await assertRevert(tx, 'secret cannot be empty');
      });

      it('should be able to commit again with correct influence', async function () {
        let epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        const numActiveCollections = await collectionManager.getNumActiveCollections();
        const medians = [];
        for (let i = 0; i < numActiveCollections; i++) medians.push(0);
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        let influenceSum = toBigNumber('0');
        for (let i = 0; i < ((dataRevealedThisEpoch.influence).length); i++) influenceSum = influenceSum.add((dataRevealedThisEpoch.influence)[i]);
        let result = toBigNumber('0');
        for (let i = 0; i < commitment[3].length; i++) {
          for (let j = 0; j < (dataRevealedThisEpoch.influence).length; j++) {
            result = result.add((toBigNumber((dataRevealedThisEpoch.values)[j][i])).mul((dataRevealedThisEpoch.influence)[j]));
          }
          medians[(commitment[3])[i]] = result.div(influenceSum);
          result = toBigNumber('0');
        }
        await mineToNextState(); // propose
        await blockManager.connect(signers[3]).propose(epoch,
          [0, 0, 0],
          medians,
          iteration,
          biggestStakerId);
        dataRevealedThisEpoch = { influence: [], values: [] };
        const influenceBefore = (await stakeManager.getInfluence(stakerIdAcc3));
        const ageBefore = await stakeManager.getAge(stakerIdAcc3);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await mineToNextState(); // commit
        epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[3]).commit(epoch, commitment1[0]);

        // const votes2 = [106, 206, 306, 406, 506, 606, 706, 806, 906];

        const commitment2 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 20);
        await voteManager.connect(signers[4]).commit(epoch, commitment2[0]);

        // const votes3 = [104, 204, 304, 404, 504, 604, 704, 804, 904];

        const commitment3 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 4);
        await voteManager.connect(signers[2]).commit(epoch, commitment3[0]);

        const commitment4 = await voteManager.getCommitment(stakerIdAcc3);

        assertBNEqual(commitment1[0], commitment4.commitmentHash, 'commitment1, commitment3 not equal');

        const ageAfter = await stakeManager.getAge(stakerIdAcc3);
        const expectedAgeDifference = toBigNumber(10000);
        const influenceAfter = (await stakeManager.getInfluence(stakerIdAcc3));

        assertBNEqual(toBigNumber(ageAfter).sub(ageBefore), expectedAgeDifference, 'Age difference incorrect');
        assertBNLessThan(influenceBefore, influenceAfter, 'Not rewarded');
        assertBNEqual(toBigNumber(ageBefore).add(10000), ageAfter, 'Penalty should not be applied');

        await mineToNextState(); // reveal

        await voteManager.connect(signers[3]).reveal(epoch, commitment1[1], commitment1[2]); // arguments getvVote => epoch, stakerId, assetId
        const influenceAcc3 = await voteManager.getInfluenceSnapshot(epoch, stakerIdAcc3);
        dataRevealedThisEpoch.influence.push(influenceAcc3);
        dataRevealedThisEpoch.values.push(commitment1[6]);
        const anymedianIndex = toBigNumber(commitment1[3][0]);
        const voteValueForThatMedianIndex = (anymedianIndex.add(1)).mul(100);

        assertBNEqual((await voteManager.getVoteValue(epoch, stakerIdAcc3, anymedianIndex)), voteValueForThatMedianIndex, 'Votes are not matching');

        await voteManager.connect(signers[4]).reveal(epoch, commitment2[1], commitment2[2]);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const influenceAcc4 = await voteManager.getInfluenceSnapshot(epoch, stakerIdAcc4);
        dataRevealedThisEpoch.influence.push(influenceAcc4);
        dataRevealedThisEpoch.values.push(commitment2[6]);

        await voteManager.connect(signers[2]).reveal(epoch, commitment3[1], commitment3[2]);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
        const influenceAcc2 = await voteManager.getInfluenceSnapshot(epoch, stakerIdAcc2);
        dataRevealedThisEpoch.influence.push(influenceAcc2);
        dataRevealedThisEpoch.values.push(commitment3[6]);
      });

      it('account 4 should be penalised for incorrect voting in the previous epoch but not account 2 due to asset tolerance', async function () {
        let epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const stakerIdAcc2 = await stakeManager.stakerIds(signers[2].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);

        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        await mineToNextState(); // propose
        const numActiveCollections = await collectionManager.getNumActiveCollections();
        const medians = [];
        for (let i = 0; i < numActiveCollections; i++) medians.push(0);
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        let influenceSum = toBigNumber('0');
        for (let i = 0; i < ((dataRevealedThisEpoch.influence).length); i++) influenceSum = influenceSum.add((dataRevealedThisEpoch.influence)[i]);
        let result = toBigNumber('0');
        for (let i = 0; i < commitment[3].length; i++) {
          for (let j = 0; j < (dataRevealedThisEpoch.influence).length; j++) {
            result = result.add((toBigNumber((dataRevealedThisEpoch.values)[j][i])).mul((dataRevealedThisEpoch.influence)[j]));
          }
          medians[(commitment[3])[i]] = result.div(influenceSum);
          result = toBigNumber('0');
        }
        await blockManager.connect(signers[3]).propose(epoch,
          [0, 0, 0],
          medians,
          iteration,
          biggestStakerId);
        // const stakeBefore = ((await stakeManager.stakers(stakerIdAcc3)).stake);
        // const stakeBefore2 = ((await stakeManager.stakers(stakerIdAcc4)).stake);
        const ageBefore = await stakeManager.getAge(stakerIdAcc3);
        const ageBefore2 = await stakeManager.getAge(stakerIdAcc4);
        const ageBefore3 = await stakeManager.getAge(stakerIdAcc2);
        await mineToNextState(); // dispute
        await mineToNextState(); // confirm
        await blockManager.connect(signers[3]).claimBlockReward();
        await mineToNextState(); // commit
        epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);

        await voteManager.connect(signers[2]).commit(epoch, commitment1[0]);
        await voteManager.connect(signers[3]).commit(epoch, commitment1[0]);
        await voteManager.connect(signers[4]).commit(epoch, commitment1[0]);

        const commitment2 = await voteManager.getCommitment(stakerIdAcc3);

        assert(commitment1[0] === commitment2.commitmentHash, 'commitment1, commitment2 not equal');

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
        for (let j = 0; j < ((dataRevealedThisEpoch.values)[1]).length; j++) {
          const voteValue = ((dataRevealedThisEpoch.values)[1])[j];
          const voteValue2 = ((dataRevealedThisEpoch.values)[2])[j];
          const val = toBigNumber(voteValue).div(toBigNumber(100));
          const val2 = toBigNumber(voteValue2).div(toBigNumber(100));
          votes2[val - 1] = voteValue;
          votes3[val2 - 1] = voteValue2;
        }
        dataRevealedThisEpoch = { influence: [], values: [] };
        let expectedAgeAfter2 = toBigNumber(ageBefore2).add(10000);
        expectedAgeAfter2 = expectedAgeAfter2 > 1000000 ? 1000000 : expectedAgeAfter2;
        let expectedAgeAfter3 = toBigNumber(ageBefore3).add(10000);
        expectedAgeAfter3 = expectedAgeAfter3 > 1000000 ? 1000000 : expectedAgeAfter3;
        for (let i = 0; i < votes2.length; i++) {
          const tolerance = await collectionManager.getCollectionTolerance(i);
          const maxVoteTolerance = Math.round(medians[i] + ((medians[i] * tolerance) / BASE_DENOMINATOR));
          const minVoteTolerance = Math.round(medians[i] - ((medians[i] * tolerance) / BASE_DENOMINATOR));
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

          // calculating for staker 2
          prod2 = toBigNumber(votes3[i]).mul(expectedAgeAfter3);
          if (votes3[i] > maxVoteTolerance) {
            toAdd2 = (prod2.div(maxVoteTolerance)).sub(expectedAgeAfter3);
            penalty2 = penalty2.add(toAdd2);
          } else if (votes3[i] < minVoteTolerance) {
            toAdd2 = expectedAgeAfter3.sub(prod2.div(minVoteTolerance));
            penalty2 = penalty2.add(toAdd2);
          }
        }
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
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);

        await governance.grantRole(GOVERNER_ROLE, signers[0].address);
        await governance.setSlashParams(500, 4500, 0);
        await voteManager.connect(signers[10]).snitch(epoch, commitment1[4], commitment1[2], signers[4].address);

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
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[10]).snitch(epoch, commitment1[4], commitment1[2], signers[4].address);

        await governance.setSlashParams(500, 9500, 0);// Restoring the slashPenaltyNum again
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('staker should not be able to snitch from himself', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[4]).snitch(epoch, commitment1[4], commitment1[2], signers[4].address);
        await assertRevert(tx, 'cant snitch on yourself');
      });

      it('should not be able to snitch from a staker who does not exists', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[10]).snitch(epoch, commitment1[4], commitment1[2], signers[7].address);
        await assertRevert(tx, 'Staker does not exist');
      });

      it('Should not be able to snitch with incorrect secret or values', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[10]).snitch(epoch, commitment1[4],
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc', signers[4].address);
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('Should not be able to snitch from an innocent staker if secret provided is empty', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[10]).snitch(epoch, commitment1[4],
          '0x0000000000000000000000000000000000000000000000000000000000000000', signers[4].address);
        await assertRevert(tx, 'secret cannot be empty');
      });

      it('Account 3 should be able to reveal again', async function () {
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);

        // const ageBefore = (await stakeManager.stakers(stakerIdAcc3)).age;

        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        await mineToNextState(); // reveal
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);

        await voteManager.connect(signers[3]).reveal(epoch, commitment[1], commitment[2]); // arguments getvVote => epoch, stakerId, assetId
        const anymedianIndex = toBigNumber(commitment[3][0]);
        const voteValueForThatMedianIndex = (anymedianIndex.add(1)).mul(100);
        assertBNEqual((await voteManager.getVoteValue(epoch, stakerIdAcc3, anymedianIndex)), voteValueForThatMedianIndex, 'Votes not matching');

        // const ageAfter = (await stakeManager.stakers(stakerIdAcc3)).age;
        // assertBNEqual(ageBefore.add(10000), ageAfter);
      });

      it('should not be able to reveal if staker does not exists', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[7]).reveal(epoch, commitment[1], commitment[2]); // arguments getvVote => epoch, stakerId, assetId

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
        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);

        await voteManager.connect(signers[7]).commit(epoch, commitment1[0]);
        const commitment2 = await voteManager.getCommitment(stakerId);
        assert(commitment2.commitmentHash.toString() !== commitment1[0].toString(), 'commitment was successful');
      });

      it('Staker should not be able to reveal if not committed', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        await mineToNextState(); // reveal
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[7]).reveal(epoch, commitment[1], commitment[2]);
        await assertRevert(tx, 'not committed in this epoch');
      });

      it('should not be able to commit other than in commit state', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const commitment1 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[7]).commit(epoch, commitment1[0]);
        await assertRevert(tx, 'incorrect state');
      });

      it('Staker should not be able to reveal other than in reveal state', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[7]).stake(epoch, tokenAmount('20000'));
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[7]).commit(epoch, commitment[0]);
        const tx2 = voteManager.connect(signers[7]).reveal(epoch, commitment[1], commitment[2]);
        await assertRevert(tx2, 'incorrect state');
      });

      it('Should not be able to reveal others secret if not in commit state', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        await mineToNextState(); // reveal
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[10]).snitch(epoch, commitment[4], commitment[2], signers[7].address);
        await assertRevert(tx, 'incorrect state');
      });

      it('Should not be able to reveal with incorrect value', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 2);
        const tx = voteManager.connect(signers[7]).reveal(epoch, commitment[1], commitment[2]);
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('Should not be able to reveal with incorrect secret', async function () {
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 2);
        const tx = voteManager.connect(signers[7]).reveal(epoch, commitment[1],
          '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddc'); // last digit 'd' changed to 'c' for having incorrect secret
        await assertRevert(tx, 'incorrect secret/value');
      });

      it('should not be able to call snitch on a staker if staker has not commited in present epoch', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[10]).snitch(epoch, commitment[4], commitment[2], signers[4].address);
        await assertRevert(tx, 'not committed in this epoch');
      });

      it('Staker should not be able to commit in present epoch for commitment of next epoch', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 950]; // 900 changed to 950 for having incorrect value
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[7]).commit(epoch + 1, commitment[0]);
        await assertRevert(tx, 'incorrect epoch');
      });

      it('Staker should not be able to reveal if stake is zero', async function () {
        const epoch = await getEpoch();
        const stakerId = await stakeManager.stakerIds(signers[7].address);
        const staker = await stakeManager.getStaker(stakerId);
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[7]).commit(epoch, commitment[0]);

        await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
        // setting stake below minstake
        await stakeManager.setStakerStake(epoch, stakerId, 2, staker.stake, tokenAmount('0'));

        await mineToNextState(); // reveal
        const tx = voteManager.connect(signers[7]).reveal(epoch, commitment[1], commitment[2]);
        await assertRevert(tx, 'stake below minimum');
      });

      it('Should be able to slash if stake is zero', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();

        await governance.setMinStake(0);
        await governance.setMinSafeRazor(0);

        await stakeManager.connect(signers[6]).stake(epoch, tokenAmount('0'));

        // const votes2 = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment3 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[6]).commit(epoch, commitment3[0]);

        const stakerIdAcc6 = await stakeManager.stakerIds(signers[6].address);
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const bountyCounterBefore = await stakeManager.bountyCounter();
        await voteManager.connect(signers[10]).snitch(epoch, commitment3[4], commitment3[2], signers[6].address);
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
        const commitment3 = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[5]).commit(epoch, commitment3[0]);

        const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
        const stakeBeforeAcc5 = (await stakeManager.stakers(stakerIdAcc5)).stake;
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        const balanceBeforeAcc10 = await razor.balanceOf(signers[10].address);

        await voteManager.connect(signers[10]).snitch(epoch, commitment3[4], commitment3[2], signers[5].address);

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
        const tx2 = blockManager.connect(signers[3]).finalizeDispute(epoch, 0);
        assert(tx1, 'should be able to give sorted votes');
        await assertRevert(tx2, 'Invalid dispute');
      });
      it('In next epoch everything should work as expected if in previous epoch no one votes', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        const stakerIdAcc3 = await stakeManager.stakerIds(signers[3].address);
        const staker = await stakeManager.getStaker(stakerIdAcc3);
        const stakeBefore = (await stakeManager.stakers(stakerIdAcc3)).stake;
        // commit state
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[3]).commit(epoch, commitment[0]);
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        await mineToNextState();
        // reveal state
        await voteManager.connect(signers[3]).reveal(epoch, commitment[1], commitment[2]);
        const influenceAcc3 = await voteManager.getInfluenceSnapshot(epoch, stakerIdAcc3);
        dataRevealedThisEpoch.influence.push(influenceAcc3);
        dataRevealedThisEpoch.values.push(commitment[6]);
        // propose state
        await mineToNextState();
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        const numActiveCollections = await collectionManager.getNumActiveCollections();
        const medians = [];
        for (let i = 0; i < numActiveCollections; i++) medians.push(0);
        let influenceSum = toBigNumber('0');
        for (let i = 0; i < ((dataRevealedThisEpoch.influence).length); i++) influenceSum = influenceSum.add((dataRevealedThisEpoch.influence)[i]);
        let result = toBigNumber('0');
        for (let i = 0; i < commitment[3].length; i++) {
          for (let j = 0; j < (dataRevealedThisEpoch.influence).length; j++) {
            result = result.add((toBigNumber((dataRevealedThisEpoch.values)[j][i])).mul((dataRevealedThisEpoch.influence)[j]));
          }
          medians[(commitment[3])[i]] = result.div(influenceSum);
          result = toBigNumber('0');
        }
        await blockManager.connect(signers[3]).propose(epoch,
          [0, 0, 0],
          medians,
          iteration,
          biggestStakerId);
        dataRevealedThisEpoch = { influence: [], values: [] };
        // penalty should be applied for not voting in previous epoch
        assert(stakeAfter, stakeBefore, 'no penalties when medians length is 0 and epochInactive less than grace period');
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
        // commit state
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        await voteManager.connect(signers[3]).commit(epoch, commitment[0]);
        const stakeAfter = (await stakeManager.stakers(stakerIdAcc3)).stake;
        assertBNLessThan(stakeAfter, stakeBefore, 'stake should reduce');
      });
      it('slashed staker should not be able to participate after it is slashed', async function () {
        await mineToNextEpoch();
        const epoch = await getEpoch();
        // const votes = [100, 200, 300, 400, 500, 600, 700, 800];
        const stakerIdAcc4 = await stakeManager.stakerIds(signers[4].address);
        const staker = await stakeManager.getStaker(stakerIdAcc4);
        const commitment = await getCommitAndRevealData(collectionManager, voteManager, blockManager, 0);
        const tx = voteManager.connect(signers[4]).commit(epoch, commitment[0]);
        await assertRevert(tx, 'staker is slashed');
        await mineToNextState(); // reveal
        const tx1 = voteManager.connect(signers[4]).reveal(epoch, commitment[1], commitment[2]);
        await assertRevert(tx1, 'not committed in this epoch');
        await mineToNextState(); // propose
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        const tx2 = blockManager.connect(signers[4]).propose(epoch,
          [0, 0, 0],
          [100, 200, 300, 400, 500, 600, 700, 800],
          iteration,
          biggestStakerId);
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
        await mineToNextState();
        const epoch = await getEpoch();
        await stakeManager.connect(signers[15]).stake(epoch, tokenAmount('20000'));
        const medians = [100, 200, 300, 400, 500, 600, 700, 800];

        const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
        await commit(signers[15], 0, voteManager, collectionManager, secret);
        await commit(signers[3], 15, voteManager, collectionManager, secret);
        await mineToNextState();

        await reveal(signers[15], 0, voteManager);
        await reveal(signers[3], 15, voteManager);
        await mineToNextState();

        await propose(signers[3], [1, 2, 3, 4, 5, 6, 7, 8], medians, stakeManager, blockManager, voteManager);
        await mineToNextState();

        await mineToNextState();

        const stakerIdAcc15 = await stakeManager.stakerIds(signers[15].address);

        const ageBefore2 = await stakeManager.getAge(stakerIdAcc15);
        await blockManager.connect(signers[3]).claimBlockReward();
        await mineToNextState(); // commit
        await commit(signers[15], 0, voteManager, collectionManager, secret);

        let penalty = toBigNumber(0);
        let toAdd = toBigNumber(0);
        let prod = toBigNumber(0);
        let expectedAgeAfter2 = toBigNumber(ageBefore2).add(10000);
        expectedAgeAfter2 = expectedAgeAfter2 > 1000000 ? 1000000 : expectedAgeAfter2;

        const votes2 = [0, 0, 0, 415, 515, 0, 715, 0];

        for (let i = 0; i < votes2.length; i++) {
          if (votes2[i] !== 0) {
            const tolerance = await collectionManager.getCollectionTolerance(i);
            const maxVoteTolerance = medians[i] + ((medians[i] * tolerance) / BASE_DENOMINATOR);
            const minVoteTolerance = medians[i] - ((medians[i] * tolerance) / BASE_DENOMINATOR);

            prod = toBigNumber(votes2[i]).mul(expectedAgeAfter2);
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
