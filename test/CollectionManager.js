/* TODO:
test same vote values, stakes
test penalizeEpochs */
const { utils } = require('ethers');
const { assert, expect } = require('chai');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  COLLECTION_MODIFIER_ROLE,

} = require('./helpers/constants');
const {
  assertBNEqual,
  assertRevert,
  mineToNextState,
  mineToNextEpoch,
  takeSnapshot,
  restoreSnapshot,
  mineBlock,
} = require('./helpers/testHelpers');

const {
  toBigNumber,
  getDepth,
  getState,
} = require('./helpers/utils');

describe('CollectionManager', function () {
  let signers;
  let collectionManager;
  let initializeContracts;
  let delegator;
  let snapshotId;

  before(async () => {
    ({
      collectionManager,
      initializeContracts,
      delegator,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Collection Manager: Create Job Tests', async () => {
    before(async () => {
      await Promise.all(await initializeContracts());
      await mineToNextEpoch();
      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
    });
    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('Admin role should be granted', async () => {
      assert(await collectionManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address) === true, 'Role was not Granted');
    });

    it('should be able to create Job with JSON selector', async function () {
      const url = 'http://testurl.com';
      const selector = 'selector';
      const selectorType = 0;
      const name = 'testJSON';
      const power = -2;
      const weight = 50;
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
      await collectionManager.createMulJob(jobs);
      const job = await collectionManager.getJob(1);
      assert(job.url === url);
      assert(job.selector === selector);
      assertBNEqual(job.selectorType, toBigNumber('0'));
      assertBNEqual((await collectionManager.getNumJobs()), toBigNumber('1'));
    });

    it('should be able to create Job with XHTML selector', async function () {
      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      const selectorType = 1;
      const name = 'testXHTML';
      const power = -2;
      const weight = 50;
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
      await collectionManager.createMulJob(jobs);
      const job = await collectionManager.getJob(1);
      assert(job.url === url);
      assert(job.selector === selector);
      assertBNEqual(job.selectorType, toBigNumber('1'));
      assertBNEqual((await collectionManager.getNumJobs()), toBigNumber('1'));
    });

    it('should not be able to get job if job does not exist', async function () {
      const tx = collectionManager.getJob(9);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should not be able to get a job if jobId is zero', async function () {
      const tx = collectionManager.getJob(0);
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('Should not be able to set Weight of job beyond max : 100', async function () {
      const weight = 125;
      const power = 0;
      const selectorType = 0;
      const name = 'test4';
      const selector = 'selector/4';
      const url = 'http://testurl.com/4';
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
      const tx0 = collectionManager.createMulJob(jobs);
      await assertRevert(tx0, 'Weight beyond max');
    });
  });

  describe('Collection Manager: Update Job', async () => {
    before(async () => {
      const url = 'http://testurl.com';
      const selector = 'selector';
      const power = -2;
      const weight = 50;
      const jobs = [];
      jobs.push({
        id: 0,
        selectorType: 0,
        weight,
        power,
        name: 'testJSON',
        selector,
        url,
      });

      jobs.push({
        id: 0,
        selectorType: 1,
        weight,
        power,
        name: 'testXHTML',
        selector,
        url,
      });

      await collectionManager.createMulJob(jobs);

      while (Number(await getState()) !== 4) {
        if (Number(await getState()) === -1) {
          await mineBlock();
        } else {
          await mineToNextState();
        }
      }
    });
    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('should be able to update Job', async function () {
      await collectionManager.updateJob(2, 50, 4, 0, 'selector/2', 'http://testurl.com/2');
      const job = await collectionManager.jobs(2);
      assert(job.url === 'http://testurl.com/2');
      assert(job.selector === 'selector/2');
      assertBNEqual(job.power, toBigNumber('4'));
    });

    it('should not be able to update job if job does not exist', async function () {
      const tx = collectionManager.updateJob(3, 50, 2, 0, 'http://testurl.com/4', 'selector/4');
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not be able to update job if jobId is zero', async function () {
      const tx = collectionManager.updateJob(0, 50, 2, 0, 'http://testurl.com/4', 'selector/4');
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('updateJob should not work in commit state', async function () {
      await mineToNextState();
      const tx = collectionManager.updateJob(1, 50, 4, 0, 'selector/6', 'http://testurl.com/6');
      await assertRevert(tx, 'incorrect state');
    });

    it('Should not be able to update Weight of job beyond max : 100', async function () {
      const tx1 = collectionManager.updateJob(2, 125, 0, 0, 'testSelector', 'http://testurl.com/5');
      await assertRevert(tx1, 'Weight beyond max');
    });
  });
  describe('Collection Manager: Create Collection', async () => {
    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('should be able to create a Collection with both one or more than one jobs', async function () {
      const power = 3;
      const tolerance = 500;
      const collectionName = 'Test Collection';
      const collectionName2 = 'Test Collection2';
      await collectionManager.createCollection(tolerance, power, 1, 1, [1, 2], collectionName);
      await collectionManager.createCollection(tolerance, power, 1, 2, [1], collectionName2);
      const collection1 = await collectionManager.getCollection(1);
      const collection2 = await collectionManager.getCollection(2);
      const collectionId = await delegator.getCollectionID(utils.formatBytes32String('Test Collection'));
      assert(collection1.name === collectionName);
      assert(collection2.name === collectionName2);
      assertBNEqual(collection1.aggregationMethod, toBigNumber('1'));
      assertBNEqual(collection2.aggregationMethod, toBigNumber('2'));
      assert((collection1.jobIDs).length === 2);
      assert((collection2.jobIDs).length === 1);
      assertBNEqual(collectionId, toBigNumber('0'));
      assertBNEqual((await collectionManager.getNumCollections()), toBigNumber('2'));
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('2'));
      assertBNEqual(await collectionManager.getCollectionPower(1), toBigNumber('3'));
    });

    it('should not be able to create collection if tolerance value is not less than maxTolerance', async function () {
      const tx = collectionManager.createCollection(1000001, 3, 1, 1, [1, 2], 'Test Collection');
      await assertRevert(tx, 'Invalid tolerance value');
    });

    it('should not create collection if it does not have any jobIDs', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = collectionManager.createCollection(0, 0, 1, 1, [], collectionName);
      await assertRevert(tx1, 'no jobs added');
    });

    it('should not create collection if jobID doesnt exist', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = collectionManager.createCollection(1, 0, 0, 1, [118, 10], collectionName);
      await assertRevert(tx1, 'job not present');
    });

    it('should not be able to get collection if collection does not exist', async function () {
      const tx = collectionManager.getCollection(10);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should not be able to get collection if collectionId is zero', async function () {
      const tx = collectionManager.getCollection(0);
      await assertRevert(tx, 'ID cannot be 0');
    });
  });
  describe('Collection Manager: Update Collection', async () => {
    before(async () => {
      const power = 3;
      const tolerance = 500;
      const collectionName = 'Test Collection';
      const collectionName2 = 'Test Collection2';
      await collectionManager.createCollection(tolerance, power, 1, 1, [1, 2], collectionName);
      await collectionManager.createCollection(tolerance, power, 1, 2, [1], collectionName2);

      const url = 'http://testurl.com/3';
      const selector = 'selector/3';
      const selectorType = 0;
      const name = 'test3';
      const weight = 50;
      const jobs = [];
      jobs.push({
        id: 0,
        selectorType,
        weight,
        power: -6,
        name,
        selector,
        url,
      });
      await collectionManager.createMulJob(jobs);
    });
    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('should be able to add a job to a collection', async function () {
      await collectionManager.updateCollection(1, 500, 1, 3, [1, 2, 3]);

      const collection = await collectionManager.getCollection(1);
      assert((collection.jobIDs).length === 3);
      assertBNEqual(collection.jobIDs[2], toBigNumber('3'));
    });

    it('should be able to update collection', async function () {
      await collectionManager.updateCollection(1, 500, 2, 5, [1, 2, 3]);
      const collection = await collectionManager.getCollection(1);
      assertBNEqual(collection.power, toBigNumber('5'));
      assertBNEqual(collection.aggregationMethod, toBigNumber('2'));
    });

    it('should be able to remove job from collection', async function () {
      await collectionManager.updateCollection(1, 500, 1, 3, [1]);
      const collection = await collectionManager.getCollection(1);
      assert((collection.jobIDs).length === 1);
      assertBNEqual(collection.jobIDs[0], toBigNumber('1'));
    });

    it('should not be able to update collection if tolerance value is not less than maxTolerance', async function () {
      const tx = collectionManager.updateCollection(1, 1000001, 2, 5, [1, 2, 5]);
      await assertRevert(tx, 'Invalid tolerance value');
    });

    it('updateCollection should only work for collections which exists', async function () {
      const tx = collectionManager.updateCollection(10, 500, 2, 5, [1]);
      await assertRevert(tx, 'Collection ID not present');
    });

    it('updateCollection should not work if the jobID does not exist', async function () {
      const tx = collectionManager.updateCollection(1, 500, 2, 5, [1, 100]);
      await assertRevert(tx, 'job not present');
    });

    it('updateCollection should not work if jobIDs array is empty', async function () {
      const tx = collectionManager.updateCollection(2, 500, 2, 5, []);
      await assertRevert(tx, 'no jobs added');
    });

    it('updateCollection should not work in commit state', async function () {
      await mineToNextEpoch();

      const tx2 = collectionManager.updateCollection(3, 500, 2, 5, [1, 2, 5]);
      await assertRevert(tx2, 'incorrect state');
    });
  });

  describe('Collection Manager: set collection status', async () => {
    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('should be able to inactivate collection', async function () {
      await collectionManager.setCollectionStatus(false, 2);
      const collectionIsActive = await collectionManager.getCollectionStatus(2);
      assert(collectionIsActive === false);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('1'));
    });

    it('should be able to reactivate collection', async function () {
      await collectionManager.setCollectionStatus(false, 2);
      await mineToNextEpoch(); // commit
      await mineToNextState(); // reveal
      await mineToNextState(); // propose
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm

      await collectionManager.setCollectionStatus(true, 2);
      const collection = await collectionManager.getCollection(2);
      assert(collection.active === true);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('2'));
    });

    it('should not be able to update Collection status if collection does not exist', async function () {
      const tx1 = collectionManager.setCollectionStatus(true, 0);// id should not be zero
      await assertRevert(tx1, 'ID cannot be 0');
      const tx2 = collectionManager.setCollectionStatus(true, 100);// asset does not exist
      await assertRevert(tx2, 'ID does not exist');
    });
  });

  describe('Collection Manager: Depth calculation', async () => {
    beforeEach(async () => {
      snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotId);
    });

    it('Should be able to get correct depth of merkle tree for 1 active collections', async function () {
      await collectionManager.setCollectionStatus(false, 2);
      const numActiveCollections = await collectionManager.getNumActiveCollections();
      const depth = await collectionManager.getDepth(numActiveCollections);
      assert(depth, getDepth(numActiveCollections));
    });

    it('Should be able to get correct depth of merkle tree for series of 100 active collections', async function () {
      const power = 3;
      const tolerance = 500;
      const depthArr = [];
      const expectedDepthArr = [];
      for (let i = 3; i <= 100; i++) {
        await collectionManager.createCollection(tolerance, power, 1, 1, [1, 2], `Test Collection ${i}`);
        const numActiveCollections = await collectionManager.getNumActiveCollections();
        const treeDepth = await collectionManager.getDepth(numActiveCollections);
        depthArr.push(treeDepth.toNumber());
        expectedDepthArr.push(getDepth(numActiveCollections));
      }
      expect(depthArr).to.eql(expectedDepthArr);
    });
  });
});
