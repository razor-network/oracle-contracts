const { assert } = require('chai');
const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
  assertBNNotEqual,
  takeSnapshot,
  restoreSnapshot,
} = require('./helpers/testHelpers');
const { commit, reveal, propose } = require('./helpers/InternalEngine');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  COLLECTION_MODIFIER_ROLE,
  SECRETS_MODIFIER_ROLE,
} = require('./helpers/constants');
const {
  getEpoch,
  getState,
  toBigNumber,
  tokenAmount,
  prngHash,
  getSecret,
} = require('./helpers/utils');

const { utils } = ethers;

describe('RandomNoManager', function () {
  let signers;
  let blockManager;
  let voteManager;
  let razor;
  let stakeManager;
  let randomNoManager;
  let initializeContracts;
  let collectionManager;
  let snapshotId;

  before(async () => {
    ({
      blockManager,
      razor,
      stakeManager,
      voteManager,
      collectionManager,
      randomNoManager,
      initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();

    const isAdminRoleGranted = await randomNoManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
    assert(isAdminRoleGranted === true, 'Admin role was not Granted');

    const tx = randomNoManager.connect(signers[1]).initialize(
      blockManager.address
    );
    await assertRevert(tx, 'AccessControl');

    await Promise.all(await initializeContracts());
    await mineToNextEpoch();
    await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
    const jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 9) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url,
      };
      jobs.push(job);
      i++;
    }
    await collectionManager.createMulJob(jobs);
    while (Number(await getState(await stakeManager.EPOCH_LENGTH())) !== 4) { await mineToNextState(); }

    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c1');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c2');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c3');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c4');
    await collectionManager.createCollection(500, 3, 1, 1, [1, 2, 3], 'c5');

    await mineToNextEpoch();
    const epoch = await getEpoch();
    await razor.transfer(signers[5].address, tokenAmount('423000'));
    await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('420000'));
    await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('420000'));
  });

  beforeEach(async () => {
    snapshotId = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshotId);
  });

  describe('razor', async () => {
    it('client should be able to register for random number', async function () {
      // Lets consider follwoing epoch as X
      const epoch = await getEpoch();

      await randomNoManager.register();
      await randomNoManager.register();

      const reqid = utils.solidityKeccak256(['uint32', 'address'], ['1', signers[0].address]);
      const reqid2 = utils.solidityKeccak256(['uint32', 'address'], ['2', signers[0].address]);

      let nonce = await randomNoManager.nonce(signers[0].address);
      assertBNEqual(nonce, toBigNumber('2'));

      // EpochRequested would be: epoch X + 1, irrespective of state
      assertBNEqual(await randomNoManager.requests(reqid), epoch + 1);
      assertBNEqual(await randomNoManager.requests(reqid2), epoch + 1);

      // Commit
      const secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      // Reveal
      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager, collectionManager);

      // Registering with unique reqId
      await randomNoManager.connect(signers[1]).register();
      const reqid3 = utils.solidityKeccak256(['uint32', 'address'], ['1', signers[1].address]);
      nonce = await randomNoManager.nonce(signers[1].address);
      assertBNEqual(nonce, toBigNumber('1'));
      // EpochRequsted would be: epoch X + 1, as we requsted after commit state
      // For some reason this add is throwing exception that is not function, will check this
      assertBNEqual(await randomNoManager.requests(reqid3), epoch + 1);
    });

    it('client should be able to get random number if its ready', async () => {
      // Should revert as random no will only be available for request id : utils.solidityKeccak256(['uint32'], ['32434']) post confirm for Epoch X
      await randomNoManager.register();
      await randomNoManager.register();

      const reqid = utils.solidityKeccak256(['uint32', 'address'], ['1', signers[0].address]);
      const tx = randomNoManager.getRandomNumber(reqid);
      await assertRevert(tx, 'Random Number not genarated yet');

      // Random number requested in epoch n will be fulfilled once after the block for n+1 epoch is confirmed.
      await mineToNextEpoch();
      const epoch = await getEpoch();
      const secret = await getSecret(signers[5]);

      // Commit
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      // Reveal
      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager, collectionManager);

      // Propose
      await mineToNextState();
      await propose(signers[5], stakeManager, blockManager, voteManager, collectionManager);
      // Dispute
      await mineToNextState();
      // Confirm
      await mineToNextState();
      await blockManager.connect(signers[5]).claimBlockReward();

      // Get Random no : Request id
      const randomNo = await randomNoManager.getRandomNumber(reqid);
      const seed = await randomNoManager.secrets(epoch);
      const salt = reqid;
      const locallyCalculatedRandomNo = await prngHash(seed, salt);
      assertBNEqual(randomNo, toBigNumber(locallyCalculatedRandomNo));

      // Get Random no : Request id2
      const reqid2 = utils.solidityKeccak256(['uint32', 'address'], ['2', signers[0].address]);
      const randomNo2 = await randomNoManager.getRandomNumber(reqid2);
      assertBNNotEqual(randomNo2, randomNo);

      // Get Random no : Generic From Epoch
      const randomNo3 = await randomNoManager.getGenericRandomNumber(epoch);
      const seed3 = await randomNoManager.secrets(epoch);
      const salt3 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const locallyCalculatedRandomNo3 = await prngHash(seed3, salt3);
      assertBNEqual(randomNo3, toBigNumber(locallyCalculatedRandomNo3));
      assertBNNotEqual(randomNo3, randomNo);

      // Next Epoch
      await mineToNextState();

      // Get Random no : Generic From Last Epoch
      const randomNo4 = await randomNoManager.getGenericRandomNumberOfLastEpoch();
      assertBNEqual(randomNo4, toBigNumber(locallyCalculatedRandomNo3));
    });
    it('should not be able to provide secret if secret is already set for particular epoch', async function () {
      await mineToNextEpoch();
      // ****** set secret ******
      // Commit
      const secret = await getSecret(signers[5]);
      await commit(signers[5], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      // Reveal
      await reveal(collectionManager, signers[5], 0, voteManager, stakeManager, collectionManager);

      // Propose
      await mineToNextState();
      await propose(signers[5], stakeManager, blockManager, voteManager, collectionManager);
      // Dispute
      await mineToNextState();
      // Confirm
      await mineToNextState();
      await blockManager.connect(signers[5]).claimBlockReward();
      // ****** secret now set ******

      await mineToNextEpoch();
      const epoch = await getEpoch();
      await randomNoManager.grantRole(SECRETS_MODIFIER_ROLE, signers[0].address);
      const randomSecret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      await randomNoManager.connect(signers[0]).provideSecret(epoch, randomSecret);
      const tx = randomNoManager.connect(signers[0]).provideSecret(epoch, randomSecret);
      await assertRevert(tx, 'Secret already set');
    });
  });
});
