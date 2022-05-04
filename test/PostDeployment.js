/* eslint-disable prefer-destructuring */
// @dev : above is a quick fix for this linting error
// I couldnt understand what it meant, to solve it

const {
  assertBNEqual,
  assertDeepEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  STAKE_MODIFIER_ROLE,
  COLLECTION_MODIFIER_ROLE,
  GOVERNER_ROLE,
  BLOCK_CONFIRMER_ROLE,
  REWARD_MODIFIER_ROLE,
  VOTE_MODIFIER_ROLE,
  DELEGATOR_MODIFIER_ROLE,
  REGISTRY_MODIFIER_ROLE,
  GOVERNANCE_ROLE,
  PAUSE_ROLE,
  SALT_MODIFIER_ROLE,
  SECRETS_MODIFIER_ROLE,
  DEPTH_MODIFIER_ROLE,
  ESCAPE_HATCH_ROLE,
  STOKEN_ROLE
} = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
  tokenAmount,
  getCollectionIdPositionInBlock,
} = require('./helpers/utils');

const { utils } = ethers;
const {
  commit, reveal, propose, proposeWithDeviation, reset, calculateMedians, calculateInvalidMedians, getIdsRevealed,
} = require('./helpers/InternalEngine');

describe.only('PostDeployment', function () {
  let signers;
  let blockManager;
  let collectionManager;
  let voteManager;
  let razor;
  let stakeManager;
  let rewardManager;
  let randomNoManager;
  let initializeContracts;
  let governance;

  before(async () => {
    ({
      blockManager,
      governance,
      collectionManager,
      razor,
      stakeManager,
      rewardManager,
      voteManager,
      randomNoManager,
      initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
    await Promise.all(await initializeContracts());
  });
  describe('razor', async () => {
    it('block confirmer role should be granted', async () => {
      const isBlockConfirmerRoleGranted = await blockManager.hasRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
      assert(isBlockConfirmerRoleGranted === true, 'Block Confirmer role was not Granted');
    });
    it('governance role should be granted', async () => {
      const isGovernanceRoleGranted = await blockManager.hasRole(GOVERNANCE_ROLE, signers[0].address);
      assert(isGovernanceRoleGranted === true, 'Governance role was not Granted');
    });
  });
});
