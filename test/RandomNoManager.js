/* TODO:
test same vote values, stakes
test penalizeEpochs */

const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
} = require('./helpers/constants');
const {
  getEpoch,
  getBiggestInfluenceAndId,
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
  let parameters;
  let randomNoManager;
  let initializeContracts;

  before(async () => {
    ({
      blockManager,
      parameters,
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
        blockManager.address,
        parameters.address
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
      // requestId = 1; EpochRequested would be: epoch X , as we are in commit state
      assertBNEqual(await randomNoManager.requests(toBigNumber('1')), epoch);

      // Commit
      const votes = [0];
      const commitment1 = utils.solidityKeccak256(
        ['uint32', 'uint48[]', 'bytes32'],
        [epoch, votes, '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd']
      );
      await voteManager.connect(signers[5]).commit(epoch, commitment1);
      await mineToNextState();

      // Reveal
      await voteManager.connect(signers[5]).reveal(epoch, votes,
        '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd');

      await randomNoManager.register();

      // requestId = 2; EpochRequsted would be: epoch X + 1, as we requsted after commit state
      // For some reason this add is throwing exception that is not function, will check this
      // assertBNEqual(await randomNoManager.requests(toBigNumber('2')), epoch.add(toBigNumber('1')));
    });

    it('client should be able to get random number if its ready', async () => {
      const epoch = await getEpoch();

      // Should revert as random no will only be available for request id 1 post confirm for Epoch X
      let tx = randomNoManager.getRandomNumber(toBigNumber(1));
      await assertRevert(tx, 'Random Number not genarated yet');

      // Propose
      await mineToNextState();
      const stakerIdAcc5 = await stakeManager.stakerIds(signers[5].address);
      const staker = await stakeManager.getStaker(stakerIdAcc5);

      const { biggestInfluencerId } = await getBiggestInfluenceAndId(stakeManager);
      const iteration = await getIteration(voteManager, stakeManager, staker);

      await blockManager.connect(signers[5]).propose(epoch,
        [],
        iteration,
        biggestInfluencerId);
      // Dispute
      await mineToNextState();
      // Confirm
      await mineToNextState();
      await blockManager.connect(signers[5]).claimBlockReward();

      // Get Random no : Request id 1
      const randomNo = await randomNoManager.getRandomNumber(toBigNumber(1));
      const seed = await randomNoManager.secrets(epoch);
      const salt = utils.solidityKeccak256(['bytes32'], [utils.defaultAbiCoder.encode(['uint256'], [toBigNumber('1')])]);
      const locallyCalculatedRandomNo = await prngHash(seed, salt);
      assertBNEqual(randomNo, toBigNumber(locallyCalculatedRandomNo));

      // Get Random no : Generic From Epoch
      const randomNo1 = await randomNoManager.getGenericRandomNumber(epoch);
      const seed1 = await randomNoManager.secrets(epoch);
      const salt1 = utils.solidityKeccak256(['bytes32'], [utils.defaultAbiCoder.encode(['uint256'], [toBigNumber('0')])]);
      const locallyCalculatedRandomNo1 = await prngHash(seed1, salt1);
      assertBNEqual(randomNo1, toBigNumber(locallyCalculatedRandomNo1));

      // Get Random no : Request id 2
      // Should revert as random no will still not be available for request id 2, as its designated epoch would be X + 1
      tx = randomNoManager.getRandomNumber(toBigNumber(2));
      await assertRevert(tx, 'Random Number not genarated yet');

      // Next Epoch
      mineToNextState();

      // Get Random no : Generic From Last Epoch
      const randomNo2 = await randomNoManager.getGenericRandomNumberOfLastEpoch();
      assertBNEqual(randomNo2, toBigNumber(locallyCalculatedRandomNo1));
    });
  });
});
