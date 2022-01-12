/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { assert } = require('chai');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  COLLECTION_MODIFIER_ROLE,
} = require('./helpers/constants');
const {
  assertBNEqual,
  mineToNextState,
  mineToNextEpoch,
} = require('./helpers/testHelpers');

const {
  toBigNumber,
  getEpoch,
  tokenAmount,
  getBiggestStakeAndId,
  getIteration,
} = require('./helpers/utils');

const { utils } = ethers;

describe('Delegator', function () {
  let signers;
  let blockManager;
  let delegator;
  let collectionManager;
  let voteManager;
  let razor;
  let stakeManager;
  let initializeContracts;

  before(async () => {
    ({
      blockManager,
      collectionManager,
      razor,
      stakeManager,
      voteManager,
      initializeContracts,
      delegator,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });
  describe('Delegator', function () {
    it('Admin role should be granted', async () => {
      assert(await delegator.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address) === true, 'Role was not Granted');
    });

    it('should be able to get correct collectionID mapped to its hashed name but not registered yet', async function () {
      await Promise.all(await initializeContracts());
      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
      let url = 'http://testurl.com';
      let selector = 'selector';
      let selectorType = 0;
      let name = 'testJSON';
      let power = -2;
      let weight = 50;
      await collectionManager.createJob(weight, power, selectorType, name, selector, url);
      url = 'http://testurl.com/2';
      selector = 'selector/2';
      selectorType = 1;
      name = 'testXHTML';
      power = 2;
      weight = 50;
      await collectionManager.createJob(weight, power, selectorType, name, selector, url);
      power = 3;
      await mineToNextState();// reveal
      await mineToNextState();// propose
      await mineToNextState();// dispute
      await mineToNextState();// confirm
      const epoch = await getEpoch();
      const collectionName = 'Test Collection';
      await collectionManager.createCollection(500, power, 1, [1, 2], collectionName);
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const collectionID = await delegator.ids(hName);
      assertBNEqual(collectionID, toBigNumber('1'));
      assertBNEqual(await collectionManager.getUpdateRegistryEpoch(), toBigNumber(epoch + 1));
      assertBNEqual(await collectionManager.idToIndexRegistry(1), toBigNumber('0'));
    });

    it('should be able to get the correct number of active assets from delegator', async function () {
      assertBNEqual((await delegator.getNumActiveCollections()), toBigNumber('1'), 'incorrect value fetched');
    });

    it('should be able to register collection that has just been created', async function () {
      await mineToNextEpoch();
      await razor.transfer(signers[5].address, tokenAmount('423000'));

      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('420000'));
      const epoch = await getEpoch();
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('420000'));

      const votes = [100];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[5]).propose(epoch,
        [100],
        iteration,
        biggestStakerId);
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();

      assertBNEqual(await collectionManager.idToIndexRegistry(1), toBigNumber('1'));
      // const collectionName = 'Test Collection2';
      // await collectionManager.createCollection([1, 2], 1, 2, collectionName);
      // assertBNEqual(await collectionManager.idToIndexRegistry(2), toBigNumber('0'));
    });

    it('should be able to fetch the result of the desired id', async function () {
      await mineToNextEpoch();
      const collectionName = 'Test Collection';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], toBigNumber('100'));
      assertBNEqual(result[1], toBigNumber('3'));
    });

    it('should update registry when multiple collections are created', async function () {
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();

      for (let i = 2; i <= 9; i++) {
        await collectionManager.createCollection(500, 2, 1, [1, 2], `Test Collection${String(i)}`);
        assertBNEqual(await collectionManager.idToIndexRegistry(i), toBigNumber('0'));
      }
      await mineToNextState();
      const epoch = await getEpoch();
      const votes = [100, 200, 300, 400, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[5]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();
      for (let i = 1; i <= 9; i++) {
        assertBNEqual(await collectionManager.idToIndexRegistry(i), toBigNumber(i));
      }
    });

    it('getResult should give the right value after deactivation of assets', async function () {
      let epoch = await getEpoch();
      await collectionManager.setCollectionStatus(false, 2);
      await collectionManager.setCollectionStatus(false, 3);
      await collectionManager.setCollectionStatus(false, 4);
      assert(await collectionManager.getCollectionStatus(2) === false);
      assert(await collectionManager.getCollectionStatus(3) === false);
      assert(await collectionManager.getCollectionStatus(4) === false);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('6'));
      assertBNEqual(await collectionManager.getUpdateRegistryEpoch(), toBigNumber(epoch + 1));
      await mineToNextEpoch();
      epoch = await getEpoch();

      const votes = [100, 500, 600, 700, 800, 900];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[5]).propose(epoch,
        [100, 500, 600, 700, 800, 900],
        iteration,
        biggestStakerId);

      await mineToNextState();
      await mineToNextState();
      await blockManager.connect(signers[5]).claimBlockReward();
      let j = 1;
      for (let i = 1; i <= 9; i++) {
        const collection = await collectionManager.getCollection(i);
        if (collection.active === true) {
          assertBNEqual(await collectionManager.idToIndexRegistry(i), toBigNumber(j));
          j++;
        } else {
          assertBNEqual(await collectionManager.idToIndexRegistry(i), toBigNumber('0'));
        }
      }
      await mineToNextEpoch();
      const collectionName = 'Test Collection5';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], toBigNumber('500'));
      assertBNEqual(result[1], toBigNumber('2'));
    });

    it('getResult should give the right value after activations and deactivation of assets', async function () {
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();
      await mineToNextState();
      let epoch = await getEpoch();
      await collectionManager.setCollectionStatus(true, 2);
      await collectionManager.setCollectionStatus(true, 3);
      await collectionManager.setCollectionStatus(true, 4);
      await collectionManager.setCollectionStatus(false, 8);
      await collectionManager.setCollectionStatus(false, 9);
      assert(await collectionManager.getCollectionStatus(2) === true);
      assert(await collectionManager.getCollectionStatus(3) === true);
      assert(await collectionManager.getCollectionStatus(4) === true);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('7'));
      assertBNEqual(await collectionManager.getUpdateRegistryEpoch(), toBigNumber(epoch + 1));
      await mineToNextEpoch();
      epoch = await getEpoch();

      const votes = [100, 200, 300, 400, 500, 600, 700];

      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );

      await voteManager.connect(signers[5]).commit(epoch, commitment1);

      await mineToNextState();

      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[5]).propose(epoch,
        [100, 200, 300, 400, 500, 600, 700],
        iteration,
        biggestStakerId);

      await mineToNextState();
      await mineToNextState();
      await blockManager.connect(signers[5]).claimBlockReward();
      let j = 1;
      for (let i = 1; i <= 9; i++) {
        const collection = await collectionManager.getCollection(i);
        if (collection.active === true) {
          assertBNEqual(await collectionManager.idToIndexRegistry(i), toBigNumber(j));
          j++;
        } else {
          assertBNEqual(await collectionManager.idToIndexRegistry(i), toBigNumber('0'));
        }
      }
      await mineToNextEpoch();
      const collectionName = 'Test Collection3';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], toBigNumber('300'));
      assertBNEqual(result[1], toBigNumber('2'));
    });
  });
});
