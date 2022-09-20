/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { assert } = require('chai');
const { setupContracts } = require('./helpers/testSetup');
const {
  COLLECTION_MODIFIER_ROLE,
  PAUSE_ROLE,
} = require('./helpers/constants');
const {
  assertBNEqual,
  mineToNextState,
  mineToNextEpoch,
  assertRevert,
  assertBNNotEqual,
  takeSnapshot,
  restoreSnapshot,
  mineBlock,
} = require('./helpers/testHelpers');

const {
  toBigNumber,
  getEpoch,
  tokenAmount,
  adhocPropose,
  getSecret,
  getState,
} = require('./helpers/utils');

const { commit, reveal } = require('./helpers/InternalEngine');

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
  let snapShotId;

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

    await Promise.all(await initializeContracts());
    await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
    let url = 'http://testurl.com';
    let selector = 'selector';
    let selectorType = 0;
    let name = 'testJSON';
    let power = -2;
    let weight = 50;
    const jobs = [];
    jobs.push({
      id: 0,
      selectorType,
      weight,
      power,
      name,
      selector,
      url,
    });
    url = 'http://testurl.com/2';
    selector = 'selector/2';
    selectorType = 1;
    name = 'testXHTML';
    power = 2;
    weight = 50;
    jobs.push({
      id: 0,
      selectorType,
      weight,
      power,
      name,
      selector,
      url,
    });
    await collectionManager.createMulJob(jobs);

    await razor.transfer(signers[5].address, tokenAmount('423000'));
    await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('420000'));
    const epoch = await getEpoch();
    await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('420000'));
  });

  describe('Delegator: Hash Mapping', function () {
    beforeEach(async () => {
      snapShotId = await takeSnapshot();
      while (Number(await getState()) !== 4) {
        if (Number(await getState()) === -1) {
          await mineBlock();
        } else {
          await mineToNextState();
        }
      }
      const collectionName = 'Test Collection';
      await collectionManager.createCollection(500, 3, 1, 1, [1, 2], collectionName);
    });

    afterEach(async () => {
      await restoreSnapshot(snapShotId);
    });

    it('should be able to get correct collectionID mapped to its hashed name but not registered yet', async function () {
      await mineToNextEpoch();
      const collectionName = 'Test Collection';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const collectionID = await collectionManager.ids(hName);
      assertBNEqual(collectionID, toBigNumber('1'));
    });

    it('should be able to get the correct active collection ids from delegator', async function () {
      const activeCollectionsIds = [1];
      assertBNEqual((await delegator.getActiveCollections()), activeCollectionsIds, 'incorrect active collection ids');
    });

    it('should not be able to create collection with same name', async function () {
      while (Number(await getState()) !== 4) {
        if (Number(await getState()) === -1) {
          await mineBlock();
        } else {
          await mineToNextState();
        }
      }
      const collectionName = 'Test Collection';
      const power = 2;
      const tx = collectionManager.createCollection(500, power, 1, 1, [1, 2], collectionName);
      await assertRevert(tx, 'Collection exists with same name');
    });
  });

  describe('Delegator: Update registry and Random Manager', function () {
    before(async () => {
      while (Number(await getState()) !== 4) {
        if (Number(await getState()) === -1) {
          await mineBlock();
        } else {
          await mineToNextState();
        }
      }
      for (let i = 1; i <= 9; i++) {
        await collectionManager.createCollection(500, 2, 1, 1, [1, 2], `Test Collection${String(i)}`);
      }

      await mineToNextEpoch();

      const secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager);
      await mineToNextState();

      await adhocPropose(signers[5], [1, 2, 3, 4, 5, 6, 7, 8, 9], [100, 200, 300, 400, 500, 600, 700, 800, 900], stakeManager, blockManager, voteManager);
      await mineToNextState();

      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();
    });

    beforeEach(async () => {
      snapShotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapShotId);
    });

    it('should be able to fetch the result of the desired id', async function () {
      await mineToNextEpoch();
      const collectionName = 'Test Collection1';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], toBigNumber('100'));
      assertBNEqual(result[1], toBigNumber('2'));
    });

    it('should be able to fetch result using id', async function () {
      await mineToNextEpoch();
      const result = await delegator.getResultFromID(1);
      assertBNEqual(result[0], toBigNumber('100'));
      assertBNEqual(result[1], toBigNumber('2'));
    });

    it('getResult should give the right value after deactivation of assets', async function () {
      await collectionManager.setCollectionStatus(false, 2);
      await collectionManager.setCollectionStatus(false, 3);
      await collectionManager.setCollectionStatus(false, 4);
      assert(await collectionManager.getCollectionStatus(2) === false);
      assert(await collectionManager.getCollectionStatus(3) === false);
      assert(await collectionManager.getCollectionStatus(4) === false);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('6'));
      await mineToNextEpoch();

      // const votes = [100, 500, 600, 700, 800, 900];
      const secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager);
      await mineToNextState();

      await adhocPropose(signers[5], [1, 5, 6, 7, 8, 9], [100, 500, 600, 700, 800, 900], stakeManager, blockManager, voteManager);
      await mineToNextState();

      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();

      await mineToNextEpoch();
      const collectionName = 'Test Collection5';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], toBigNumber('500'));
      assertBNEqual(result[1], toBigNumber('2'));
    });

    it('getResult should give the right value after activations and deactivation of assets', async function () {
      await collectionManager.setCollectionStatus(false, 2);
      await collectionManager.setCollectionStatus(false, 3);
      await collectionManager.setCollectionStatus(false, 4);
      await mineToNextEpoch();
      let secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager);
      await mineToNextState();

      await adhocPropose(signers[5], [1, 5, 6, 7, 8, 9], [100, 500, 600, 700, 800, 900], stakeManager, blockManager, voteManager);
      await mineToNextState();

      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();
      await collectionManager.setCollectionStatus(true, 2);
      await collectionManager.setCollectionStatus(true, 3);
      await collectionManager.setCollectionStatus(true, 4);
      await collectionManager.setCollectionStatus(false, 8);
      await collectionManager.setCollectionStatus(false, 9);
      assert(await collectionManager.getCollectionStatus(2) === true);
      assert(await collectionManager.getCollectionStatus(3) === true);
      assert(await collectionManager.getCollectionStatus(4) === true);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('7'));
      await mineToNextEpoch();

      secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager);
      await mineToNextState();

      await adhocPropose(signers[5], [1, 2, 3, 4, 5, 6, 7], [100, 200, 300, 400, 500, 600, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();

      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();

      await mineToNextEpoch();
      const collectionName = 'Test Collection3';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      const collectionID = await collectionManager.ids(hName);
      assertBNEqual(collectionID, toBigNumber('3'));
      assertBNEqual(result[0], toBigNumber('300'));
      assertBNEqual(result[1], toBigNumber('2'));
    });

    it('should not be able to fetch result from delegator if paused', async function () {
      await delegator.grantRole(PAUSE_ROLE, signers[0].address);
      await delegator.pause();
      const tx = delegator.getResultFromID(1);
      await assertRevert(tx, 'Pausable: paused');
    });

    it('should be able to fetch random number generated of last epoch', async function () {
      await mineToNextEpoch();
      const randomNumberOfLastEpoch = await delegator.getGenericRandomNumberOfLastEpoch();
      assertBNNotEqual(randomNumberOfLastEpoch, toBigNumber('0'), 'Random number of last epoch reported as 0');
    });

    it('should be able to fetch random number using epoch', async function () {
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const randomNumber = await delegator.getGenericRandomNumber(epoch - 1);
      assertBNNotEqual(randomNumber, toBigNumber('0'), 'Random number of epoch reported as 0');
    });

    it('should be able to register to fetch random number', async function () {
      // If the request to register randum number is in n epoch
      // then random number would be generated in n+1 epoch once after block for n+1 epoch is confirmed
      const requestId = await delegator.connect(signers[5]).callStatic.register();
      await delegator.connect(signers[5]).register();
      await mineToNextEpoch();
      const secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager);
      await mineToNextState();

      await adhocPropose(signers[5], [1, 2, 3, 4, 5, 6, 7], [100, 200, 300, 400, 500, 600, 700], stakeManager, blockManager, voteManager);
      await mineToNextState();

      const tx = delegator.connect(signers[5]).getRandomNumber(requestId);
      await assertRevert(tx, 'Random Number not genarated yet');

      await mineToNextState();
      await blockManager.connect(signers[5]).claimBlockReward();

      const randomNumber = await delegator.connect(signers[5]).getRandomNumber(requestId);
      assertBNNotEqual(randomNumber, toBigNumber('0'), 'Request for random number reported 0');
    });
  });
});
