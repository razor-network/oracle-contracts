/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { assert } = require('chai');
const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');

const {
  assertBNEqual,
  assertRevert,
} = require('./helpers/testHelpers');

const { toBigNumber } = require('./helpers/utils');

describe('AssetManager', function () {
  let signers;
  let constants;
  let assetManager;

  before(async () => {
    ({ constants, assetManager } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Delegator', function () {
    it('Admin role should be granted', async () => {
      assert(await assetManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address) === true, 'Role was not Granted');
    });
    it('should be able to create Job', async function () {
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      const repeat = true;
      await assetManager.createJob(url, selector, name, repeat);
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
      await assetManager.createJob(url, selector, name, repeat);

      const collectionName = 'Test Collection';
      await assetManager.createCollection(collectionName, [1, 2], 1);
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
      await assetManager.createJob(url, selector, name, repeat);

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

    it('should fulfill result to the correct asset', async function () {
      await assetManager.grantRole(await constants.getAssetConfirmerHash(), signers[0].address);
      await assetManager.fulfillAsset(1, 111);
      await assetManager.fulfillAsset(2, 222);
      await assetManager.fulfillAsset(3, 333);
      await assetManager.fulfillAsset(4, 444);
      const j1 = await assetManager.getJob(1);
      const j2 = await assetManager.getJob(2);
      const c3 = await assetManager.getCollection(3);
      const j4 = await assetManager.getJob(4);
      assertBNEqual(j1.result, toBigNumber('111'));
      assertBNEqual(j2.result, toBigNumber('222'));
      assertBNEqual(c3.result, toBigNumber('333'));
      assertBNEqual(j4.result, toBigNumber('444'));
    });

    it('should not create a collection if one of the jobIDs is not a job', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection(collectionName, [1, 2, 5], 2);
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not create collection if it does not have more than 1 or any jobIDs', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection(collectionName, [], 1);
      await assertRevert(tx1, 'Number of jobIDs low to create collection');
      const tx2 = assetManager.createCollection(collectionName, [1], 1);
      await assertRevert(tx2, 'Number of jobIDs low to create collection');
    });

    it('aggregationMethod should not be equal to 0 or greater than 3', async function () {
      const url = 'http://testurl.com/4';
      const selector = 'selector/4';
      const name = 'test4';
      const repeat = true;
      await assetManager.createJob(url, selector, name, repeat);
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection(collectionName, [1, 2, 5], 4);
      await assertRevert(tx1, 'Aggregation range out of bounds');
      const tx2 = assetManager.createCollection(collectionName, [1, 2, 5], 0);
      await assertRevert(tx2, 'Aggregation range out of bounds');
      await assetManager.createCollection(collectionName, [1, 2, 5], 1);
    });

    it('should not create collection if duplicates jobIDs are present', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection(collectionName, [1, 2, 2, 5], 1);
      await assertRevert(tx, 'Duplicate JobIDs sent');
    });

    it('should not add jobID to a collection if the collectionID specified is not a collection', async function () {
      const tx = assetManager.addJobToCollection(5, 4);
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
    //  //await assetManager.grantRole(await constants.getJobConfirmerHash(), signers[0].address);
    //  await assetManager.fulfillJob(2, 222);
    // });
  });
});
