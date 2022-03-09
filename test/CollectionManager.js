/* TODO:
test same vote values, stakes
test penalizeEpochs */
const { utils } = require('ethers');
const { assert } = require('chai');
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
} = require('./helpers/testHelpers');

const {
  toBigNumber,
  getEpoch,
  tokenAmount,
} = require('./helpers/utils');

describe('CollectionManager', function () {
  let signers;
  let blockManager;
  let collectionManager;
  let razor;
  let stakeManager;
  let initializeContracts;
  let delegator;

  before(async () => {
    ({
      collectionManager,
      blockManager,
      stakeManager,
      razor,
      initializeContracts,
      delegator,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('CollectionManager', function () {
    it('Admin role should be granted', async () => {
      assert(await collectionManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address) === true, 'Role was not Granted');
    });
    it('should be able to create Job with JSON selector', async function () {
      await Promise.all(await initializeContracts());
      await mineToNextEpoch();
      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      const selectorType = 0;
      const name = 'testJSON';
      const power = -2;
      const weight = 50;
      await collectionManager.createJob(weight, power, selectorType, name, selector, url);
      const job = await collectionManager.jobs(1);
      assert(job.url === url);
      assert(job.selector === selector);
      assertBNEqual(job.selectorType, toBigNumber('0'));
      assertBNEqual((await collectionManager.getNumJobs()), toBigNumber('1'));
    });

    it('should be able to create Job with XHTML selector', async function () {
      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const selectorType = 1;
      const name = 'testXHTML';
      const power = 2;
      const weight = 50;
      await collectionManager.createJob(weight, power, selectorType, name, selector, url);
      const job = await collectionManager.jobs(2);
      assert(job.url === url);
      assert(job.selector === selector);
      assertBNEqual(job.selectorType, toBigNumber('1'));
      assertBNEqual((await collectionManager.getNumJobs()), toBigNumber('2'));
    });

    it('should be able to create a Collection with both one or more than one jobs', async function () {
      const power = 3;
      const tolerance = 500;
      await mineToNextState();// reveal
      await mineToNextState();// propose
      await mineToNextState();// dispute
      await mineToNextState();// confirm
      const epoch = await getEpoch();
      const collectionName = 'Test Collection';
      const collectionName2 = 'Test Collection2';
      await collectionManager.createCollection(tolerance, power, 1, [1, 2], collectionName);
      await collectionManager.createCollection(tolerance, power, 2, [1], collectionName2);
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
      assertBNEqual(await collectionManager.getUpdateRegistryEpoch(), toBigNumber(epoch + 1));
    });

    it('should be able to add a job to a collection', async function () {
      const url = 'http://testurl.com/3';
      const selector = 'selector/3';
      const selectorType = 0;
      const name = 'test3';
      const power = -6;
      const weight = 50;
      await collectionManager.createJob(weight, power, selectorType, name, selector, url);

      await collectionManager.updateCollection(1, 500, 1, 3, [1, 2, 5]);
      const collection = await collectionManager.getCollection(1);
      assert((collection.jobIDs).length === 3);
      assertBNEqual(collection.jobIDs[2], toBigNumber('5'));
    });

    it('should not be able to create collection if tolerance value is not less than maxTolerance', async function () {
      const tx = collectionManager.createCollection(1000001, 3, 1, [1, 2], 'Test Collection');
      await assertRevert(tx, 'Invalid tolerance value');
    });

    it('should not be able to update collection if tolerance value is not less than maxTolerance', async function () {
      const tx = collectionManager.updateCollection(1, 1000001, 2, 5, [1, 2, 5]);
      await assertRevert(tx, 'Invalid tolerance value');
    });

    it('should be able to update collection', async function () {
      await collectionManager.updateCollection(1, 500, 2, 5, [1, 2, 5]);
      const collection = await collectionManager.getCollection(1);
      assertBNEqual(collection.power, toBigNumber('5'));
      assertBNEqual(collection.aggregationMethod, toBigNumber('2'));
    });

    it('should be able to update Job', async function () {
      await collectionManager.createJob(50, 6, 0, 'test4', 'selector/4', 'http://testurl.com/4');
      await collectionManager.updateJob(4, 50, 4, 0, 'selector/5', 'http://testurl.com/5');
      const job = await collectionManager.jobs(4);
      assert(job.url === 'http://testurl.com/5');
      assert(job.selector === 'selector/5');
      assertBNEqual(job.power, toBigNumber('4'));
    });

    it('should be able to get a job', async function () {
      const job = await collectionManager.getJob(1);
      assert(job.name, 'testJSON');
      assertBNEqual(job.selectorType, toBigNumber('0'));
      assertBNEqual(job.selector, 'selector', 'job selector should be "selector"');
      assertBNEqual(job.url, 'http://testurl.com', 'job url should be "http://testurl.com"');
    });

    it('should not be able to get a job if jobId is zero', async function () {
      const tx = collectionManager.getJob(0);
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('should not be able to get collection if collectionId is zero', async function () {
      const tx = collectionManager.getCollection(0);
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('should not be able to get the power of any collection which does not exists', async function () {
      const numCollections = await collectionManager.getNumCollections();
      const tx = collectionManager.getCollectionPower(numCollections + 1);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should be able to remove job from collection', async function () {
      await collectionManager.updateCollection(1, 500, 1, 3, [1, 5]);
      const collection = await collectionManager.getCollection(1);
      assert((collection.jobIDs).length === 2);
      assertBNEqual(collection.jobIDs[1], toBigNumber('5'));
    });

    it('should be able to inactivate collection', async function () {
      let epoch = await getEpoch();
      const collectionName = 'Test Collection6';
      await collectionManager.createCollection(500, 0, 2, [1, 2], collectionName);
      await collectionManager.setCollectionStatus(false, 3);
      const collectionIsActive = await collectionManager.getCollectionStatus(3);
      assert(collectionIsActive === false);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('2'));
      assertBNEqual(await collectionManager.getUpdateRegistryEpoch(), toBigNumber(epoch + 1));
      await mineToNextEpoch(); // commit
      await razor.transfer(signers[5].address, tokenAmount('423000'));
      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('420000'));
      epoch = await getEpoch();
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('420000'));

      await mineToNextState(); // reveal
      await mineToNextState(); // propose
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await blockManager.connect(signers[5]).claimBlockReward();
    });

    it('should be able to reactivate collection', async function () {
      const epoch = await getEpoch();
      await collectionManager.setCollectionStatus(true, 3);
      const collection = await collectionManager.getCollection(3);
      assert(collection.active === true);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('3'));
      assertBNEqual(await collectionManager.getUpdateRegistryEpoch(), toBigNumber(epoch + 1));
      await collectionManager.setCollectionStatus(false, 3);
      assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('2'));
      assertBNEqual(await collectionManager.getUpdateRegistryEpoch(), toBigNumber(epoch + 1));
      await mineToNextEpoch(); // commit
      await mineToNextState(); // reveal
      await mineToNextState(); // propose
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await blockManager.connect(signers[5]).claimBlockReward();
    });

    it('should not be able to update job if job does not exist', async function () {
      const tx = collectionManager.updateJob(9, 50, 2, 0, 'http://testurl.com/4', 'selector/4');
      await assertRevert(tx, 'Job ID not present');
    });

    it('should not be able to get job if job does not exist', async function () {
      const tx = collectionManager.getJob(9);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should not be able to get collection if collection does not exist', async function () {
      const tx = collectionManager.getCollection(10);
      await assertRevert(tx, 'ID does not exist');
    });

    it('should not be able to update job if jobId is zero', async function () {
      const tx = collectionManager.updateJob(0, 50, 2, 0, 'http://testurl.com/4', 'selector/4');
      await assertRevert(tx, 'ID cannot be 0');
    });

    it('should not be able to update Collection status if collection does not exist', async function () {
      const tx1 = collectionManager.setCollectionStatus(true, 0);// id should not be zero
      await assertRevert(tx1, 'ID cannot be 0');
      const tx2 = collectionManager.setCollectionStatus(true, 100);// asset does not exist
      await assertRevert(tx2, 'ID does not exist');
    });

    it('should not be able to set Collection status if provided status is the same as current collectionstatus', async function () {
      const tx1 = collectionManager.setCollectionStatus(false, 3);// status of collection with Id 3 is already false
      await assertRevert(tx1, 'status not being changed');
    });

    it('should not create collection if it does not have any jobIDs', async function () {
      const collectionName = 'Test Collection2';
      const tx1 = collectionManager.createCollection(0, 0, 1, [], collectionName);
      await assertRevert(tx1, 'no jobs added');
    });

    it('updateCollection should only work for collections which exists', async function () {
      const tx = collectionManager.updateCollection(10, 500, 2, 5, [1]);
      await assertRevert(tx, 'Collection ID not present');
    });

    it('updateCollection should only work for collections which are currently active', async function () {
      await mineToNextEpoch(); // commit
      await mineToNextState(); // reveal
      await mineToNextState(); // propose
      await mineToNextState(); // dispute
      await mineToNextState(); // confirm
      await blockManager.connect(signers[5]).claimBlockReward();
      const tx = collectionManager.updateCollection(3, 500, 2, 5, [1]);
      await assertRevert(tx, 'Collection is inactive');
    });

    it('updateJob, updateCollection should not work in commit state', async function () {
      await mineToNextEpoch();

      const tx = collectionManager.updateJob(5, 50, 4, 0, 'selector/6', 'http://testurl.com/6');
      await assertRevert(tx, 'incorrect state');

      const tx2 = collectionManager.updateCollection(3, 500, 2, 5, [1, 2, 5]);
      await assertRevert(tx2, 'incorrect state');
    });

    it('Should not be able to set Weight of job beyond max : 100', async function () {
      const tx0 = collectionManager.createJob(125, 0, 0, 'testName', 'testSelector', 'http://testurl.com/5');
      await mineToNextState();
      const tx1 = collectionManager.updateJob(4, 125, 0, 0, 'testSelector', 'http://testurl.com/5');
      await assertRevert(tx0, 'Weight beyond max');
      await assertRevert(tx1, 'Weight beyond max');
    });
    // it('should be able to get result using proxy', async function () {
    //  await delegator.upgradeDelegate(collectionManager.address);
    //  assert(await delegator.delegate() === collectionManager.address);
    //
    //  const url = 'http://testurl.com/2';
    //  const selector = 'selector/2';
    //  const name = 'test2';
    //  const repeat = true;
    //  await collectionManager.createJob(url, selector, name, repeat);
    //  //await collectionManager.grantRole(await parameters.getJobConfirmerHash(), signers[0].address);
    //  await collectionManager.fulfillJob(2, 222);
    // });
  });
});
