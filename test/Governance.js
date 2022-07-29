const { assert } = require('chai');
const { utils } = require('ethers');
const {
  assertBNEqual, assertRevert, restoreSnapshot, takeSnapshot,
} = require('./helpers/testHelpers');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  GOVERNER_ROLE,
} = require('./helpers/constants');
const { setupContracts } = require('./helpers/testSetup');
const {
  toBigNumber, tokenAmount,
} = require('./helpers/utils');

describe('Governance contract Test', async () => {
  let signers;
  let snapShotId;
  let governance;
  let collectionManager;
  let blockManager;
  let bondManager;
  let stakeManager;
  let rewardManager;
  let voteManager;
  let initializeContracts;

  const expectedRevertMessage = 'AccessControl';

  const penaltyNotRevealNumerator = toBigNumber('1000');
  const penaltyAgeNotRevealNumerator = toBigNumber('100000');

  const unstakeLockPeriod = toBigNumber('1');
  const withdrawLockPeriod = toBigNumber('1');
  const maxAltBlocks = toBigNumber('5');

  const minimumStake = tokenAmount('20000');
  const minimumSafeRazor = tokenAmount('10000');
  const blockReward = tokenAmount('100');
  const withdrawReleasePeriod = toBigNumber('5');
  const resetUnstakeLockPenalty = toBigNumber('100000');
  const maxAge = toBigNumber('1000000');
  const maxTolerance = toBigNumber('1000000');
  const maxCommission = toBigNumber('20');
  const deltaCommission = toBigNumber('3');
  const epochLimitForUpdateCommission = toBigNumber('100');
  const toAssign = toBigNumber('3');
  const depositPerJob = tokenAmount('500000');
  const minBond = tokenAmount('100000');
  const epochLimitForUpdateBond = toBigNumber('5');
  const minJobs = toBigNumber('2');
  const maxJobs = toBigNumber('6');

  const blockConfirmerHash = utils.solidityKeccak256(['string'], ['BLOCK_CONFIRMER_ROLE']);
  const stakeModifierHash = utils.solidityKeccak256(['string'], ['STAKE_MODIFIER_ROLE']);
  const rewardModifierHash = utils.solidityKeccak256(['string'], ['REWARD_MODIFIER_ROLE']);
  const collectionModifierHash = utils.solidityKeccak256(['string'], ['COLLECTION_MODIFIER_ROLE']);
  const voteModifierHash = utils.solidityKeccak256(['string'], ['VOTE_MODIFIER_ROLE']);
  const delegatorModifierHash = utils.solidityKeccak256(['string'], ['DELEGATOR_MODIFIER_ROLE']);
  const registryModifierHash = utils.solidityKeccak256(['string'], ['REGISTRY_MODIFIER_ROLE']);
  const secretsModifierHash = utils.solidityKeccak256(['string'], ['SECRETS_MODIFIER_ROLE']);
  const pauseHash = utils.solidityKeccak256(['string'], ['PAUSE_ROLE']);
  const governanceHash = utils.solidityKeccak256(['string'], ['GOVERNANCE_ROLE']);
  const stokenHash = utils.solidityKeccak256(['string'], ['STOKEN_ROLE']);
  const saltModifierHash = utils.solidityKeccak256(['string'], ['SALT_MODIFIER_ROLE']);
  const depthModifierHash = utils.solidityKeccak256(['string'], ['DEPTH_MODIFIER_ROLE']);
  const escapeHatchHash = utils.solidityKeccak256(['string'], ['ESCAPE_HATCH_ROLE']);
  const governerHash = utils.solidityKeccak256(['string'], ['GOVERNER_ROLE']);

  before(async () => {
    ({
      governance, collectionManager, blockManager, bondManager, stakeManager, voteManager,
      rewardManager, initializeContracts,
    } = await setupContracts());
    await Promise.all(await initializeContracts());
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
  });

  it('admin role should be granted', async () => {
    const isAdminRoleGranted = await governance.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
    assert(isAdminRoleGranted === true, 'Admin role was not Granted');
  });

  it('parameters should not be modified without governer role access', async () => {
    let tx = governance.connect(signers[0]).setPenaltyNotRevealNum(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setPenaltyAgeNotRevealNum(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setSlashParams(toBigNumber('1'), toBigNumber('1'), toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setUnstakeLockPeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setWithdrawLockPeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setWithdrawInitiationPeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setResetUnstakeLockPenalty(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMaxAltBlocks(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMinStake(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMinSafeRazor(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setBlockReward(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMaxAge(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMaxTolerance(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMaxCommission(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setDeltaCommission(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setEpochLimitForUpdateCommission(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setToAssign(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMinBond(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setDepositPerJob(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setEpochLimitForUpdateBond(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMaxJobs(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMinJobs(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);
  });

  it('parameters should be able to modify with governer role access', async () => {
    await governance.grantRole(GOVERNER_ROLE, signers[0].address);
    await governance.setPenaltyNotRevealNum(toBigNumber('5'));
    const penaltyNotRevealNum = await rewardManager.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNum, toBigNumber('5'));

    await governance.setPenaltyAgeNotRevealNum(toBigNumber('5'));
    const penaltyAgeNotRevealNum = await rewardManager.penaltyAgeNotRevealNum();
    assertBNEqual(penaltyAgeNotRevealNum, toBigNumber('5'));

    await governance.setMinStake(toBigNumber('8'));
    const minStake = await stakeManager.minStake();
    const minStake1 = await voteManager.minStake();
    const minStake2 = await blockManager.minStake();
    assertBNEqual(minStake, toBigNumber('8'));
    assertBNEqual(minStake1, toBigNumber('8'));
    assertBNEqual(minStake2, toBigNumber('8'));

    await governance.setUnstakeLockPeriod(toBigNumber('9'));
    const unstakeLockPeriod = await stakeManager.unstakeLockPeriod();
    assertBNEqual(unstakeLockPeriod, toBigNumber('9'));
    await governance.setMinSafeRazor(toBigNumber('2'));
    const minSafeRazor = await stakeManager.minSafeRazor();
    assertBNEqual(minSafeRazor, toBigNumber('2'));

    await governance.setWithdrawLockPeriod(toBigNumber('9'));
    const withdrawLockPeriod = await stakeManager.withdrawLockPeriod();
    const withdrawLockPeriod1 = await bondManager.withdrawLockPeriod();
    assertBNEqual(withdrawLockPeriod, toBigNumber('9'));
    assertBNEqual(withdrawLockPeriod1, toBigNumber('9'));

    await governance.setMaxAltBlocks(toBigNumber('10'));
    const maxAltBlocks = await blockManager.maxAltBlocks();
    assertBNEqual(maxAltBlocks, toBigNumber('10'));

    await governance.setMaxTolerance(toBigNumber('15'));
    const maxTolerance = await rewardManager.maxTolerance();
    const maxTolerance1 = await collectionManager.maxTolerance();
    assertBNEqual(maxTolerance, toBigNumber('15'));
    assertBNEqual(maxTolerance1, toBigNumber('15'));

    await governance.setWithdrawInitiationPeriod(toBigNumber('16'));
    const withdrawInitiationPeriod = await stakeManager.withdrawInitiationPeriod();
    assertBNEqual(withdrawInitiationPeriod, toBigNumber('16'));

    await governance.setResetUnstakeLockPenalty(toBigNumber('200000'));
    const resetUnstakeLockPenalty = await stakeManager.resetUnstakeLockPenalty();
    assertBNEqual(resetUnstakeLockPenalty, toBigNumber('200000'));

    await governance.setMaxAge(toBigNumber('18'));
    const maxAge = await rewardManager.maxAge();
    assertBNEqual(maxAge, toBigNumber('18'));

    await governance.setMaxCommission(toBigNumber('19'));
    const maxCommission = await stakeManager.maxCommission();
    assertBNEqual(maxCommission, toBigNumber('19'));

    await governance.setSlashParams(toBigNumber('22'), toBigNumber('23'), toBigNumber('24'));
    const slashNums = await stakeManager.slashNums();
    assertBNEqual(slashNums.bounty, toBigNumber('22'));
    assertBNEqual(slashNums.burn, toBigNumber('23'));
    assertBNEqual(slashNums.keep, toBigNumber('24'));

    await governance.setDeltaCommission(toBigNumber('25'));
    const deltaCommission = await stakeManager.deltaCommission();
    assertBNEqual(deltaCommission, toBigNumber('25'));

    await governance.setEpochLimitForUpdateCommission(toBigNumber('26'));
    const epochLimitForUpdateCommission = await stakeManager.epochLimitForUpdateCommission();
    assertBNEqual(epochLimitForUpdateCommission, toBigNumber('26'));

    await governance.setBlockReward(toBigNumber('27'));
    const blockReward = await blockManager.blockReward();
    assertBNEqual(blockReward, toBigNumber('27'));

    await governance.setMinBond(toBigNumber('28'));
    const minBond = await bondManager.minBond();
    assertBNEqual(minBond, toBigNumber('28'));

    await governance.setDepositPerJob(toBigNumber('29'));
    const depositPerJob = await bondManager.depositPerJob();
    assertBNEqual(depositPerJob, toBigNumber('29'));

    await governance.setEpochLimitForUpdateBond(toBigNumber('30'));
    const epochLimitForUpdateBond = await bondManager.epochLimitForUpdateBond();
    assertBNEqual(epochLimitForUpdateBond, toBigNumber('30'));

    await governance.setMaxJobs(toBigNumber('31'));
    const maxJobs = await bondManager.maxJobs();
    assertBNEqual(maxJobs, toBigNumber('31'));

    await governance.setMinJobs(toBigNumber('32'));
    const minJobs = await bondManager.minJobs();
    assertBNEqual(minJobs, toBigNumber('32'));

    let tx = governance.setMaxCommission(toBigNumber('101'));
    await assertRevert(tx, 'Invalid Max Commission Update');

    tx = governance.setMaxAge(toBigNumber('1010001'));
    await assertRevert(tx, 'Invalid Max Age Update');

    tx = governance.setSlashParams(toBigNumber('5000000'), toBigNumber('4000000'), toBigNumber('3000000'));
    await assertRevert(tx, 'Slash nums addtion exceeds 10mil');

    tx = governance.setMaxTolerance(toBigNumber('11000000'));
    await assertRevert(tx, 'maxTolerance exceeds baseDenom');

    await governance.connect(signers[0]).setToAssign(toBigNumber('10'));
    const toAssign = await voteManager.toAssign();
    assertBNEqual(toAssign, toBigNumber('10'));
  });

  it('parameters values should be initialized correctly', async () => {
    const penaltyNotRevealNumValue = await rewardManager.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNumerator, penaltyNotRevealNumValue);

    const penaltyAgeNotRevealNumValue = await rewardManager.penaltyAgeNotRevealNum();
    assertBNEqual(penaltyAgeNotRevealNumerator, penaltyAgeNotRevealNumValue);

    const slashParams = await stakeManager.slashNums();
    assertBNEqual(slashParams[0], toBigNumber('500000'));
    assertBNEqual(slashParams[1], toBigNumber('9500000'));
    assertBNEqual(slashParams[2], toBigNumber('0'));

    const minStakeValue = await stakeManager.minStake();
    assertBNEqual(minimumStake, minStakeValue);

    const minSafeRazor = await stakeManager.minSafeRazor();
    assertBNEqual(minimumSafeRazor, minSafeRazor);

    const blockRewardValue = await blockManager.blockReward();
    assertBNEqual(blockReward, blockRewardValue);

    const withdrawLockPeriodValue = await stakeManager.withdrawLockPeriod();
    assertBNEqual(withdrawLockPeriod, withdrawLockPeriodValue);

    const unstakeLockPeriodValue = await stakeManager.unstakeLockPeriod();
    assertBNEqual(unstakeLockPeriod, unstakeLockPeriodValue);

    const withdrawReleasePeriodValue = await stakeManager.withdrawInitiationPeriod();
    assertBNEqual(withdrawReleasePeriod, withdrawReleasePeriodValue);

    const resetUnstakeLockPenaltyValue = await stakeManager.resetUnstakeLockPenalty();
    assertBNEqual(resetUnstakeLockPenalty, resetUnstakeLockPenaltyValue);

    const maxAltBlocksValue = await blockManager.maxAltBlocks();
    assertBNEqual(maxAltBlocks, maxAltBlocksValue);

    const maxAgeValue = await rewardManager.maxAge();
    assertBNEqual(maxAge, maxAgeValue);

    const maxToleranceValue = await rewardManager.maxTolerance();
    assertBNEqual(maxTolerance, maxToleranceValue);

    const maxCommissionValue = await stakeManager.maxCommission();
    assertBNEqual(maxCommission, maxCommissionValue);

    const deltaCommissionValue = await stakeManager.deltaCommission();
    assertBNEqual(deltaCommission, deltaCommissionValue);

    const epochLimitForUpdateCommissionValue = await stakeManager.epochLimitForUpdateCommission();
    assertBNEqual(epochLimitForUpdateCommission, epochLimitForUpdateCommissionValue);

    const toAssignValue = await voteManager.toAssign();
    assertBNEqual(toAssign, toAssignValue);

    const depositPerJobValue = await bondManager.depositPerJob();
    assertBNEqual(depositPerJob, depositPerJobValue);

    const minBondValue = await bondManager.minBond();
    assertBNEqual(minBond, minBondValue);

    const epochLimitForUpdateBondValue = await bondManager.epochLimitForUpdateBond();
    assertBNEqual(epochLimitForUpdateBond, epochLimitForUpdateBondValue);

    const minJobsValue = await bondManager.minJobs();
    assertBNEqual(minJobs, minJobsValue);

    const maxJobsValue = await bondManager.maxJobs();
    assertBNEqual(maxJobs, maxJobsValue);
  });

  it('test keccak hash of all roles', async function () {
    const blockConfirmerHashValue = await governance.BLOCK_CONFIRMER_ROLE();
    assert(blockConfirmerHash === blockConfirmerHashValue, 'incorrect hash');

    const stakeModifierHashValue = await governance.STAKE_MODIFIER_ROLE();
    assert(stakeModifierHash === stakeModifierHashValue, 'incorrect hash');

    const rewardModifierHashValue = await governance.REWARD_MODIFIER_ROLE();
    assert(rewardModifierHash === rewardModifierHashValue, 'incorrect hash');

    const collectionModifierHashValue = await governance.COLLECTION_MODIFIER_ROLE();
    assert(collectionModifierHash === collectionModifierHashValue, 'incorrect hash');

    const voteModifierHashValue = await governance.VOTE_MODIFIER_ROLE();
    assert(voteModifierHash === voteModifierHashValue, 'incorrect hash');

    const delegatorModifierHashValue = await governance.DELEGATOR_MODIFIER_ROLE();
    assert(delegatorModifierHash, delegatorModifierHashValue, 'incorrect hash');

    const registryModifierHashValue = await governance.REGISTRY_MODIFIER_ROLE();
    assert(registryModifierHash === registryModifierHashValue, 'incorrect hash');

    const secretsModifierHashValue = await governance.SECRETS_MODIFIER_ROLE();
    assert(secretsModifierHash === secretsModifierHashValue, 'incorrect hash');

    const pauseHashValue = await governance.PAUSE_ROLE();
    assert(pauseHash === pauseHashValue, 'incorrect hash');

    const governanceHashValue = await governance.GOVERNANCE_ROLE();
    assert(governanceHash === governanceHashValue, 'incorrect hash');

    const stokenHashValue = await governance.STOKEN_ROLE();
    assert(stokenHash === stokenHashValue, 'incorrect hash');

    const saltModifierHashValue = await governance.SALT_MODIFIER_ROLE();
    assert(saltModifierHash === saltModifierHashValue, 'incorrect hash');

    const depthModifierHashValue = await governance.DEPTH_MODIFIER_ROLE();
    assert(depthModifierHash === depthModifierHashValue, 'incorrect hash');

    const escapeHatchHashValue = await governance.ESCAPE_HATCH_ROLE();
    assert(escapeHatchHash === escapeHatchHashValue, 'incorrect hash');

    const governerHashValue = await governance.GOVERNER_ROLE();
    assert(governerHash === governerHashValue, 'incorrect hash');
  });
});
