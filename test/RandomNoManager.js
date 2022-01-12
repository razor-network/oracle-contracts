/* TODO:
test same vote values, stakes
test penalizeEpochs */

const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
  assertBNNotEqual,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
} = require('./helpers/constants');
const {
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
  tokenAmount,
  prngHash,
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

  before(async () => {
    ({
      blockManager,
      razor,
      stakeManager,
      voteManager,
      randomNoManager,
      initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('razor', async () => {
    it('admin role should be granted', async () => {
      const isAdminRoleGranted = await randomNoManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
      assert(isAdminRoleGranted === true, 'Admin role was not Granted');
    });
    it('should not be able to initiliaze randomNoManager contract without admin role', async () => {
      const tx = randomNoManager.connect(signers[1]).initialize(
        blockManager.address
      );
      await assertRevert(tx, 'AccessControl');
    });

    it('should be able to initialize', async () => {
      await Promise.all(await initializeContracts());
      await mineToNextEpoch();
      const epoch = await getEpoch();
      await razor.transfer(signers[5].address, tokenAmount('423000'));
      await razor.connect(signers[5]).approve(stakeManager.address, tokenAmount('420000'));
      await stakeManager.connect(signers[5]).stake(epoch, tokenAmount('420000'));
    });

    it('client should be able to register for random number', async function () {
      // Lets consider follwoing epoch as X
      const epoch = await getEpoch();

      await randomNoManager.register();
      await randomNoManager.register();

      const reqid = utils.solidityKeccak256(['uint32', 'address'], ['1', signers[0].address]);
      const reqid2 = utils.solidityKeccak256(['uint32', 'address'], ['2', signers[0].address]);

      let nonce = await randomNoManager.nonce(signers[0].address);
      assertBNEqual(nonce, toBigNumber('2'));

      // EpochRequested would be: epoch X , as we are in commit state
      assertBNEqual(await randomNoManager.requests(reqid), epoch);
      assertBNEqual(await randomNoManager.requests(reqid2), epoch);

      // Commit
      const votes = [];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[5]).commit(epoch, commitment1);
      await mineToNextState();

      // Reveal
      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

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
      const epoch = await getEpoch();

      // Should revert as random no will only be available for request id : utils.solidityKeccak256(['uint32'], ['32434']) post confirm for Epoch X
      const reqid = utils.solidityKeccak256(['uint32', 'address'], ['1', signers[0].address]);
      let tx = randomNoManager.getRandomNumber(reqid);
      await assertRevert(tx, 'Random Number not genarated yet');

      // Propose
      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);

      await blockManager.connect(signers[5]).propose(epoch,
        [],
        iteration,
        biggestStakerId);
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
      const salt3 = 0;
      const locallyCalculatedRandomNo3 = await prngHash(seed3, salt3);
      assertBNEqual(randomNo3, toBigNumber(locallyCalculatedRandomNo3));
      assertBNNotEqual(randomNo3, randomNo);

      // Get Random no : Request id 3
      // Should revert as random no will still not be available for this request id, as its designated epoch would be X + 1
      const reqid3 = utils.solidityKeccak256(['uint32', 'address'], ['1', signers[1].address]);
      tx = randomNoManager.getRandomNumber(reqid3);
      await assertRevert(tx, 'Random Number not genarated yet');

      // Next Epoch
      await mineToNextState();

      // Get Random no : Generic From Last Epoch
      const randomNo4 = await randomNoManager.getGenericRandomNumberOfLastEpoch();
      assertBNEqual(randomNo4, toBigNumber(locallyCalculatedRandomNo3));
    });
  });
});
