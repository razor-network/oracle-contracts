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
  mineToNextState,
  mineToNextEpoch,
} = require('./helpers/testHelpers');

const {
  toBigNumber,
  getEpoch,
  tokenAmount,
  getBiggestInfluenceAndId,
  getIteration,
} = require('./helpers/utils');

const { utils } = ethers;

describe('Delegator', function () {
  let signers;
  let blockManager;
  let delegator;
  let assetManager;
  let voteManager;
  let razor;
  let stakeManager;
  let initializeContracts;

  before(async () => {
    ({
      blockManager,
      assetManager,
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

    it('should be able to get correct jobID mapped to its hashed name', async function () {
      await Promise.all(await initializeContracts());
      await mineToNextEpoch();
      await assetManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      const selectorType = 0;
      const name = 'testJSON';
      const power = -2;
      const weight = 50;
      await assetManager.createJob(weight, power, selectorType, name, selector, url);
      const hName = utils.solidityKeccak256(['string'], [name]);
      const jobID = await delegator.ids(hName);
      assertBNEqual(jobID, toBigNumber('1'));
    });

    it('should be able to get correct collectionID mapped to its hashed name', async function () {
      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const selectorType = 1;
      const name = 'testXHTML';
      let power = 2;
      const weight = 50;
      await assetManager.createJob(weight, power, selectorType, name, selector, url);
      power = 3;
      await mineToNextState();// reveal
      await mineToNextState();// propose
      await mineToNextState();// dispute
      await mineToNextState();// confirm
      const collectionName = 'Test Collection';
      await assetManager.createCollection([1, 2], 1, power, collectionName);
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const collectionID = await delegator.ids(hName);
      assertBNEqual(collectionID, toBigNumber('3'));
    });

    it('should be able to get the correct number of active assets from delegator', async function () {
      assertBNEqual((await delegator.getNumActiveCollections()), toBigNumber('1'), 'incorrect value fetched');
    });

    it('should be able to fetch the result of the desired id', async function () {
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

      const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);

      await blockManager.connect(signers[5]).propose(epoch,
        [100],
        iteration,
        biggestInfluencerId);
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[5]).claimBlockReward();

      let collectionName = 'Test Collection2';
      await assetManager.createCollection([1, 2], 1, 2, collectionName);
      await assetManager.setCollectionStatus(false, 3);
      await mineToNextEpoch();
      collectionName = 'Test Collection';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], toBigNumber('100'));
      assertBNEqual(result[1], toBigNumber('3'));
    });

    it('getResult should give the right value after deactivation of asset', async function () {
      const epoch = await getEpoch();

      const votes = [100, 200];

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

      const { biggestInfluence, biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestInfluence);

      await blockManager.connect(signers[5]).propose(epoch,
        [100, 200],
        iteration,
        biggestInfluencerId);

      await mineToNextState();
      await mineToNextState();
      await blockManager.connect(signers[5]).claimBlockReward();
      await mineToNextEpoch();
      const collectionName = 'Test Collection2';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result = await delegator.getResult(hName);
      assertBNEqual(result[0], toBigNumber('200'));
      assertBNEqual(result[1], toBigNumber('2'));
    });
  });
});
