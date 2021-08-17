/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { assert } = require('chai');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  ASSET_MODIFIER_ROLE,

} = require('./helpers/constants');
const {
  assertBNEqual,
  assertRevert,
} = require('./helpers/testHelpers');

const { toBigNumber } = require('./helpers/utils');

describe('AssetManager', function () {
  let signers;
  let assetManager;

  before(async () => {
    ({ assetManager } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Delegator', function () {
    it('Admin role should be granted', async () => {
      assert(await assetManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address) === true, 'Role was not Granted');
    });
    it('should be able to create Job', async function () {
      await assetManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      const repeat = true;
      const power = -2;
      await assetManager.createJob(repeat, name, selector, url, power);
      const job = await assetManager.jobs(1);
      assert(job.url === url);
      assert(job.selector === selector);
      assert(job.repeat === repeat);
      assertBNEqual(job.assetType, toBigNumber('1'));
      assertBNEqual((await assetManager.getNumAssets()), toBigNumber('1'));
    });

    it('should be able to create a Collection', async function () {
      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      const repeat = true;
      const power = 3;
      await assetManager.createJob(
        repeat,
        name,
        selector,
        url,
        power
      );

      const collectionName = 'Test Collection';
      await assetManager.createCollection([1, 2], 1, collectionName, power);
      const collection = await assetManager.getCollection(3);
      assert(collection.name === collectionName);
      assertBNEqual(collection.aggregationMethod, toBigNumber('1'));
      assert((collection.jobIDs).length === 2);
      assertBNEqual((await assetManager.getNumAssets()), toBigNumber('3'));
    });

    it('should be able to add a job to a collection', async function () {
      const url = 'http://testurl.com/3';
      const selector = 'selector/3';
      const name = 'test3';
      const repeat = true;
      const power = -6;
      await assetManager.createJob(repeat, name, selector, url, power);

      await assetManager.addJobToCollection(3, 4);
      const collection = await assetManager.getCollection(3);
      assert((collection.jobIDs).length === 3);
      assertBNEqual(collection.jobIDs[2], toBigNumber('4'));
    });

    it('should return the correct asset type when getAssetType is called', async function () {
      const numAssets = await assetManager.getNumAssets();
      for (let i = 1; i <= numAssets; i++) {
        const asset = await assetManager.getAssetType(i);
        if (i !== 3) {
          assertBNEqual(asset, toBigNumber('1'));
        } else {
          assertBNEqual(asset, toBigNumber('2'));
        }
      }
    });

    it('should be able to update Job', async function () {
      await assetManager.createJob(true, 'test4', 'selector/4', 'http://testurl.com/4', 6);
      await assetManager.updateJob(5, 'selector/5', 'http://testurl.com/5', 4);
      const job = await assetManager.jobs(5);
      assert(job.url === 'http://testurl.com/5');
      assert(job.selector === 'selector/5');
      assertBNEqual(job.power, toBigNumber('4'));
    });

    it('should be able to inactivate Job', async function () {
      await assetManager.setAssetStatus(false, 5);
      const isActive = await assetManager.getActiveStatus(5);
      assert(isActive === false);
    });

    it('should be able to get a job', async function () {
      const job = await assetManager.getJob(1);
      assertBNEqual(job.active, 'true', 'job should be active');
      assertBNEqual(job.repeat, 'true', 'repeat should be true for job 1');
      assertBNEqual(job.name, 'test', 'job name should be "test"');
      assertBNEqual(job.selector, 'selector', 'job selector should be "selector"');
      assertBNEqual(job.url, 'http://testurl.com', 'job url should be "http://testurl.com"');
    });

    it('should not be able to create collection with inactive jobs', async function () {
      const tx = assetManager.createCollection([1, 5], 2, 'Test Collection', 0);
      await assertRevert(tx, 'Job ID not active');
    });

    it('should not be able to add inactive job to a collection', async function () {
      const tx = assetManager.addJobToCollection(3, 5);
      await assertRevert(tx, 'Job ID not active');
    });

    it('should be able to reactivate Job', async function () {
      await assetManager.setAssetStatus(true, 5);
      const job = await assetManager.jobs(5);
      assert(job.active === true);
      await assetManager.setAssetStatus(true, 5);
    });

    it('should not be able to get the active status of any asset if id is zero', async function () {
      const tx = assetManager.getActiveStatus(0);
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('should not be able to get the active status of any asset if id is greater than numAssets', async function () {
      const numAssets = await assetManager.getNumAssets();
      const tx = assetManager.getActiveStatus(numAssets + 1);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should be able to remove job from collection', async function () {
      await assetManager.removeJobFromCollection(3, 1);
      const collection = await assetManager.getCollection(3);
      assert((collection.jobIDs).length === 2);
      assertBNEqual(collection.jobIDs[1], toBigNumber('4'));
    });

    it('should be able to inactivate collection', async function () {
      const collectionName = 'Test Collection6';
      await assetManager.createCollection([1, 2], 2, collectionName, 0);
      await assetManager.setAssetStatus(false, 6);
      const collectionIsActive = await assetManager.getActiveStatus(6);
      assert(collectionIsActive === false);
    });

    it('should be able to reactivate collection', async function () {
      await assetManager.setAssetStatus(true, 6);
      const collection = await assetManager.getCollection(6);
      assert(collection.active === true);
      await assetManager.setAssetStatus(false, 6);
    });

    it('should not be able to remove or add job to collection if the collection has been inactivated', async function () {
      const tx1 = assetManager.addJobToCollection(6, 4);
      await assertRevert(tx1, 'Collection is inactive');
    });

    it('should not be able to remove job from collection if index is out of range', async function () {
      const tx = assetManager.removeJobFromCollection(3, 5);
      await assertRevert(tx, 'Index not in range');
    });

    it('should not be able to update job if job does not exist', async function () {
      const tx = assetManager.updateJob(9, 'http://testurl.com/4', 'selector/4', 2);
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not be able to get a job if job is not present', async function () {
      const tx = assetManager.getJob(10);
      await assertRevert(tx, 'ID is not a job');
    });

    it('should not be able to get a collection if ID specified is not a collection', async function () {
      const tx = assetManager.getCollection(10);
      await assertRevert(tx, 'ID is not a collection');
    });

    it('should not be able to get asset type if id is zero', async function () {
      const tx = assetManager.getAssetType(0);
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('should not be able to get asset type if id is greater than numAssets', async function () {
      const numAssets = await assetManager.getNumAssets();
      const tx = assetManager.getAssetType(numAssets + 1);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should not be able to update activity status of asset if assetID is 0', async function () {
      const tx = assetManager.setAssetStatus(true, 0);
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('should not be able to update activity status of asset if assetID does not exist', async function () {
      const tx = assetManager.setAssetStatus(true, 100);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should not create a collection if one of the jobIDs is not a job', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection([1, 2, 3], 2, collectionName, 0);
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not create collection if it does not have more than 1 or any jobIDs', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection([], 1, collectionName, 0);
      await assertRevert(tx1, 'Number of jobIDs low to create collection');
      const tx2 = assetManager.createCollection([1], 1, collectionName, 0);
      await assertRevert(tx2, 'Number of jobIDs low to create collection');
    });

    it('aggregationMethod should not be equal to 0 or greater than 3', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection([1, 2, 5], 4, collectionName, 0);
      await assertRevert(tx1, 'Aggregation range out of bounds');
      const tx2 = assetManager.createCollection([1, 2, 5], 0, collectionName, 0);
      await assertRevert(tx2, 'Aggregation range out of bounds');
    });

    it('should not create collection if duplicates jobIDs are present', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection([1, 2, 2, 5], 1, collectionName, 0);
      await assertRevert(tx, 'Duplicate JobIDs sent');
    });

    it('should not add jobID to a collection if the collectionID specified is not a collection', async function () {
      const tx = assetManager.addJobToCollection(5, 4);
      await assertRevert(tx, 'Collection ID not present');
    });

    it('should not be able to remove job from collection if the collectionID specified is not a collection', async function () {
      const tx = assetManager.removeJobFromCollection(5, 4);
      await assertRevert(tx, 'Collection ID not present');
    });

    it('should not add jobID to a collection if the jobID specified is not a Job', async function () {
      // jobID does not exist
      const tx = assetManager.addJobToCollection(3, 7);
      await assertRevert(tx, 'Job ID not present');
      // jobID specified is a collection
      const tx1 = assetManager.addJobToCollection(3, 6);
      await assertRevert(tx1, 'Job ID not present');
    });

    it('should not be add job if it already exists in the collection', async function () {
      const tx = assetManager.addJobToCollection(3, 1);
      await assertRevert(tx, 'Job exists in this collection');
    });

    // it('should be able to get result using proxy', async function () {
    //  await delegator.upgradeDelegate(assetManager.address);
    //  assert(await delegator.delegate() === assetManager.address);
    //
    //  const url = 'http://testurl.com/2';
    //  const selector = 'selector/2';
    //  const name = 'test2';
    //  const repeat = true;
    //  await assetManager.createJob(url, selector, name, repeat);
    //  //await assetManager.grantRole(await parameters.getJobConfirmerHash(), signers[0].address);
    //  await assetManager.fulfillJob(2, 222);
    // });
  });
});
