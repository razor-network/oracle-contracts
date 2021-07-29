/* TODO:
test same vote values, stakes
test penalizeEpochs */
const { assert } = require('chai');
const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');

const {
  assertBNEqual,
  assertRevert,
  mineToNextEpoch,
  mineToNextState,
} = require('./helpers/testHelpers');

const {
  toBigNumber,
} = require('./helpers/utils');

describe('AssetManager', function () {
  let signers;
  let assetManager;
  let parameters;
  let initializeContracts;

  before(async () => {
    ({
      parameters,
      assetManager,
      initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Delegator', function () {
    it('Admin role should be granted', async () => {
      assert(await assetManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address) === true, 'Role was not Granted');
    });
    it('should be able to create Job', async function () {
      await mineToNextEpoch();
      await Promise.all(await initializeContracts());
      await assetManager.grantRole(await parameters.getAssetModifierHash(), signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      await assetManager.createJob(url, selector, name);
      const job = await assetManager.jobs(1);
      assert(job.url === url);
      assert(job.selector === selector);
      assertBNEqual(job.assetType, toBigNumber('1'));
      assertBNEqual((await assetManager.getNumAssets()), toBigNumber('1'));
    });

    it('should be able to create collection', async function () {
      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      await assetManager.createJob(url, selector, name);

      await mineToNextState(); // reveal
      await mineToNextState(); // propose
      await mineToNextState(); // dispute

      const collectionName = 'Test Collection';
      await assetManager.createCollection(collectionName, [1, 2], 1, true);
      const collection = await assetManager.getCollection(3);
      assert(collection.name === 'Test Collection');
      assertBNEqual(collection.aggregationMethod, toBigNumber('1'));
      assert((collection.jobIDs).length === 2);
      assertBNEqual((await assetManager.getNumAssets()), toBigNumber('3'));
      assertBNEqual((await assetManager.getNumActiveAssets()), toBigNumber('1'));
    });

    it('activeAssets list should be updated to 1', async () => {
      const activeAssets = await assetManager.getActiveAssets();
      assert(activeAssets.length === 1);
      assertBNEqual(activeAssets, toBigNumber('3'));
    });

    it('should be able to add a job to a collection', async function () {
      const url = 'http://testurl.com/3';
      const selector = 'selector/3';
      const name = 'test3';
      await assetManager.createJob(url, selector, name);
      await mineToNextState(); // confirm
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

    it('should return the correct active status when getActiveStatus is called', async () => {
      const numAssets = await assetManager.getNumAssets();
      for (let i = 1; i <= numAssets; i++) {
        const active = await assetManager.getActiveStatus(i);
        assert(active === true);
      }
    });

    it('should fulfill result to the correct asset', async function () {
      await assetManager.grantRole(await parameters.getAssetConfirmerHash(), signers[0].address);
      await assetManager.fulfillAsset(3, 444);
      const c4 = await assetManager.getResult(3);
      assertBNEqual(c4, toBigNumber('444'));
    });

    it('should be able to update Job', async function () {
      await assetManager.createJob('http://testurl.com/4', 'selector/4', 'test4');
      await assetManager.updateJob(5, 'http://testurl.com/5', 'selector/5');
      const job = await assetManager.jobs(5);
      assert(job.url === 'http://testurl.com/5');
      assert(job.selector === 'selector/5');
    });

    it('should be able to inactivate Job', async function () {
      await assetManager.setAssetStatus(5, false);
      const job = await assetManager.jobs(5);
      assert(job.active === false);
    });

    it('should be able to reactivate Job', async function () {
      await assetManager.setAssetStatus(5, true);
      const job = await assetManager.jobs(5);
      assert(job.active === true);
      await assetManager.setAssetStatus(5, false);
    });

    it('should be able remove job from collection', async function () {
      await assetManager.removeJobFromCollection(3, 2);
      const collection = await assetManager.getCollection(3);
      assert((collection.jobIDs).length === 2);
      assertBNEqual(collection.jobIDs[1], toBigNumber('2'));
    });

    it('should be able to inactivate collection', async function () {
      const collectionName = 'Test Collection6';
      await assetManager.createCollection(collectionName, [1, 2], 2, true);
      await assetManager.setAssetStatus(6, false);
      const collection = await assetManager.getCollection(6);
      assert(collection.active === false);
    });

    it('should be able to reactivate collection', async function () {
      await assetManager.setAssetStatus(6, true);
      const collection = await assetManager.getCollection(6);
      assert(collection.active === true);
      await assetManager.setAssetStatus(6, false);
    });

    it('should not be able to remove or add job to collection if the collection has been inactivated', async function () {
      const tx1 = assetManager.addJobToCollection(6, 3);
      await assertRevert(tx1, 'Collection is inactive');
    });

    it('should not be able to remove job from collection if index is out of range', async function () {
      const tx = assetManager.removeJobFromCollection(3, 5);
      await assertRevert(tx, 'Index not in range');
    });

    it('should not be able to update job if job does not exist', async function () {
      const tx = assetManager.updateJob(9, 'http://testurl.com/4', 'selector/4');
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not be able to update activity status of asset if assetID is 0', async function () {
      const tx = assetManager.setAssetStatus(0, true);
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('should not be able to update activity status of asset if assetID does not exist', async function () {
      const tx = assetManager.setAssetStatus(100, true);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should not be able to create collection in commit, reveal or propose', async () => {
      await mineToNextEpoch();// commit
      const collectionName = 'Test Collection2';
      let tx = assetManager.createCollection(collectionName, [1, 2, 4], 2, true);
      await assertRevert(tx, 'incorrect states');
      await mineToNextState();// reveal
      tx = assetManager.createCollection(collectionName, [1, 2, 4], 2, true);
      await assertRevert(tx, 'incorrect states');
      await mineToNextState();// propose
      tx = assetManager.createCollection(collectionName, [1, 2, 4], 2, true);
      await assertRevert(tx, 'incorrect states');
      await mineToNextState();// dispute
    });

    it('should not create a collection if one of the jobIDs is not a job', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection(collectionName, [1, 2, 3], 2, true);
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not create collection if it does not have more than 1 or any jobIDs', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection(collectionName, [], 1, true);
      await assertRevert(tx1, 'Number of jobIDs low to create collection');
      const tx2 = assetManager.createCollection(collectionName, [1], 1, true);
      await assertRevert(tx2, 'Number of jobIDs low to create collection');
    });

    it('aggregationMethod should not be equal to 0 or greater than 3', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = assetManager.createCollection(collectionName, [1, 2, 5], 4, true);
      await assertRevert(tx1, 'Aggregation range out of bounds');
      const tx2 = assetManager.createCollection(collectionName, [1, 2, 5], 0, true);
      await assertRevert(tx2, 'Aggregation range out of bounds');
    });

    it('should not create collection if duplicates jobIDs are present', async function () {
      const collectionName = 'Test Collection2';
      const tx = assetManager.createCollection(collectionName, [1, 2, 2, 5], 1, true);
      await assertRevert(tx, 'Duplicate JobIDs sent');
    });

    it('should not be able add or remove jobID from collection if not in confirm state', async () => {
      let tx = assetManager.addJobToCollection(5, 4);
      await assertRevert(tx, 'incorrect state');
      tx = assetManager.removeJobFromCollection(3, 1);
      await assertRevert(tx, 'incorrect state');
    });

    it('should not add jobID to a collection if the collectionID specified is not a collection', async function () {
      await mineToNextState();// confirm
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
    //  //await assetManager.grantRole(await parameters.getJobConfirmerHash(), signers[0].address);
    //  await assetManager.fulfillJob(2, 222);
    // });
  });
});
