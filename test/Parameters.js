const { assert } = require('chai');
const {
  assertBNEqual, assertRevert, restoreSnapshot, takeSnapshot,
} = require('./helpers/testHelpers');
const {
  DEFAULT_ADMIN_ROLE_HASH,
} = require('./helpers/constants');
const { setupContracts } = require('./helpers/testSetup');
const {
  getEpoch, getState, toBigNumber, tokenAmount,
} = require('./helpers/utils');

const { utils } = ethers;

describe('Parameters contract Tests', async () => {
  let signers;
  let snapShotId;
  let parameters;
  const expectedRevertMessage = 'AccessControl';

  const penaltyNotRevealNumerator = toBigNumber('1');
  const baseDenominator = toBigNumber('10000');

  const withdrawLockPeriod = toBigNumber('1');
  const maxAltBlocks = toBigNumber('5');
  const epochLength = toBigNumber('300');
  const exposureDenominator = toBigNumber('1000');
  const gracePeriod = toBigNumber('8');
  const minimumStake = tokenAmount('1000');
  const blockReward = tokenAmount('100');
  const withdrawReleasePeriod = toBigNumber('5');
  const extendLockPenalty = toBigNumber('1');
  const maxAge = toBigNumber('1000000');
  const maxCommission = toBigNumber('20');

  const blockConfirmerHash = utils.solidityKeccak256(['string'], ['BLOCK_CONFIRMER_ROLE']);
  const assetConfirmerHash = utils.solidityKeccak256(['string'], ['ASSET_CONFIRMER_ROLE']);
  const stakerActivityUpdaterHash = utils.solidityKeccak256(['string'], ['STAKER_ACTIVITY_UPDATER_ROLE']);
  const stakeModifierHash = utils.solidityKeccak256(['string'], ['STAKE_MODIFIER_ROLE']);
  const assetModifierHash = utils.solidityKeccak256(['string'], ['ASSET_MODIFIER_ROLE']);
  const delegatorModifierHash = utils.solidityKeccak256(['string'], ['DELEGATOR_MODIFIER_ROLE']);

  before(async () => {
    ({ parameters } = await setupContracts());
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
  });

  it('admin role should be granted', async () => {
    const isAdminRoleGranted = await parameters.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
    assert(isAdminRoleGranted === true, 'Admin role was not Granted');
  });

  it('checking getEpoch functionality with custom getEpoch mock function', async () => {
    // mock function
    const epoch = await getEpoch();
    const epochValue = await parameters.getEpoch();
    assertBNEqual(epoch, epochValue);
  });

  it('checking getState functionality with custom getState mock function', async () => {
    // mock function
    const state = await getState();
    const stateValue = await parameters.getState();
    assertBNEqual(state, stateValue);
  });

  it('parameters should not be modified without admin role access', async () => {
    let tx = parameters.connect(signers[1]).setPenaltyNotRevealNum(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setSlashParams(toBigNumber('1'), toBigNumber('1'), toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setBaseDenominator(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setWithdrawLockPeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setWithdrawReleasePeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setExtendLockPenalty(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setMaxAltBlocks(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setEpochLength(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setExposureDenominator(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setMinStake(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setGracePeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setMaxAge(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setMaxCommission(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);
  });

  it('parameters should be able to modify with admin role access', async () => {
    await parameters.setPenaltyNotRevealNum(toBigNumber('5'));
    const penaltyNotRevealNum = await parameters.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNum, toBigNumber('5'));

    await parameters.setMinStake(toBigNumber('8'));
    const minStake = await parameters.minStake();
    assertBNEqual(minStake, toBigNumber('8'));

    await parameters.setWithdrawLockPeriod(toBigNumber('9'));
    const withdrawLockPeriod = await parameters.withdrawLockPeriod();
    assertBNEqual(withdrawLockPeriod, toBigNumber('9'));

    await parameters.setMaxAltBlocks(toBigNumber('10'));
    const maxAltBlocks = await parameters.maxAltBlocks();
    assertBNEqual(maxAltBlocks, toBigNumber('10'));

    await parameters.setEpochLength(toBigNumber('11'));
    const epochLength = await parameters.epochLength();
    assertBNEqual(epochLength, toBigNumber('11'));

    await parameters.setExposureDenominator(toBigNumber('13'));
    const exposureDenominator = await parameters.exposureDenominator();
    assertBNEqual(exposureDenominator, toBigNumber('13'));

    await parameters.setGracePeriod(toBigNumber('14'));
    const gracePeriod = await parameters.gracePeriod();
    assertBNEqual(gracePeriod, toBigNumber('14'));

    await parameters.setWithdrawReleasePeriod(toBigNumber('16'));
    const withdrawReleasePeriod = await parameters.withdrawReleasePeriod();
    assertBNEqual(withdrawReleasePeriod, toBigNumber('16'));

    await parameters.setExtendLockPenalty(toBigNumber('17'));
    const extendLockPenalty = await parameters.extendLockPenalty();
    assertBNEqual(extendLockPenalty, toBigNumber('17'));

    await parameters.setMaxAge(toBigNumber('18'));
    const maxAge = await parameters.maxAge();
    assertBNEqual(maxAge, toBigNumber('18'));

    await parameters.setMaxCommission(toBigNumber('19'));
    const maxCommission = await parameters.maxCommission();
    assertBNEqual(maxCommission, toBigNumber('19'));

    await parameters.setSlashParams(toBigNumber('22'), toBigNumber('23'), toBigNumber('24'));
    const slashNums = await parameters.slashNums();
    assertBNEqual(slashNums.bounty, toBigNumber('22'));
    assertBNEqual(slashNums.burn, toBigNumber('23'));
    assertBNEqual(slashNums.keep, toBigNumber('24'));

    await parameters.setBaseDenominator(toBigNumber('1'));
    const baseDenom = await parameters.baseDenominator();
    assertBNEqual(baseDenom, toBigNumber('1'));

    const tx = parameters.setMaxCommission(toBigNumber('101'));
    assertRevert(tx, 'Invalid Max Commission Update');
  });

  it('parameters values should be initialized correctly', async () => {
    const penaltyNotRevealNumValue = await parameters.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNumerator, penaltyNotRevealNumValue);

    const slashParams = await parameters.getAllSlashParams();
    assertBNEqual(slashParams[0], toBigNumber('500'));
    assertBNEqual(slashParams[1], toBigNumber('9500'));
    assertBNEqual(slashParams[2], toBigNumber('0'));

    const baseDenom = await parameters.baseDenominator();
    assertBNEqual(baseDenom, baseDenominator);

    const minStakeValue = await parameters.minStake();
    assertBNEqual(minimumStake, minStakeValue);

    const blockRewardValue = await parameters.blockReward();
    assertBNEqual(blockReward, blockRewardValue);

    const withdrawLockPeriodValue = await parameters.withdrawLockPeriod();
    assertBNEqual(withdrawLockPeriod, withdrawLockPeriodValue);

    const withdrawReleasePeriodValue = await parameters.withdrawReleasePeriod();
    assertBNEqual(withdrawReleasePeriod, withdrawReleasePeriodValue);

    const extendLockPenaltyValue = await parameters.extendLockPenalty();
    assertBNEqual(extendLockPenalty, extendLockPenaltyValue);

    const maxAltBlocksValue = await parameters.maxAltBlocks();
    assertBNEqual(maxAltBlocks, maxAltBlocksValue);

    const epochLengthValue = await parameters.epochLength();
    assertBNEqual(epochLength, epochLengthValue);

    const maxAgeValue = await parameters.maxAge();
    assertBNEqual(maxAge, maxAgeValue);

    const maxCommissionValue = await parameters.maxCommission();
    assertBNEqual(maxCommission, maxCommissionValue);

    const exposureDenominatorValue = await parameters.exposureDenominator();
    assertBNEqual(exposureDenominator, exposureDenominatorValue);

    const blockConfirmerHashValue = await parameters.BLOCK_CONFIRMER_ROLE();
    assertBNEqual(blockConfirmerHash, blockConfirmerHashValue);

    const defaultAdminHashValue = await parameters.DEFAULT_ADMIN_ROLE();
    assertBNEqual(DEFAULT_ADMIN_ROLE_HASH, defaultAdminHashValue);

    const assetConfirmerHashValue = await parameters.ASSET_CONFIRMER_ROLE();
    assertBNEqual(assetConfirmerHash, assetConfirmerHashValue);

    const stakerActivityUpdaterHashValue = await parameters.STAKER_ACTIVITY_UPDATER_ROLE();
    assertBNEqual(stakerActivityUpdaterHash, stakerActivityUpdaterHashValue);

    const stakeModifierHashValue = await parameters.STAKE_MODIFIER_ROLE();
    assertBNEqual(stakeModifierHash, stakeModifierHashValue);

    const assetModifierHashValue = await parameters.ASSET_MODIFIER_ROLE();
    assertBNEqual(assetModifierHash, assetModifierHashValue);

    const delegatorModifierHashValue = await parameters.DELEGATOR_MODIFIER_ROLE();
    assertBNEqual(delegatorModifierHash, delegatorModifierHashValue);

    const gracePeriodValue = await parameters.gracePeriod();
    assertBNEqual(gracePeriod, gracePeriodValue);
  });
});
