const { assert } = require('chai');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const {
  assertBNEqual, assertRevert, restoreSnapshot, takeSnapshot,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  getEpoch, getState, toBigNumber, tokenAmount,
} = require('./helpers/utils');

const { utils } = ethers;

describe('Parameters contract Tests', async () => {
  let signers;
  let snapShotId;
  let parameters;
  const expectedRevertMessage = 'ACL: sender not authorized';

  // parameters as initiliazed in Parameters contract
  const commit = toBigNumber('0');
  const reveal = toBigNumber('1');
  const propose = toBigNumber('2');
  const dispute = toBigNumber('3');

  const penaltyNotRevealNumerator = toBigNumber('1');
  const penaltyNotRevealDenominator = toBigNumber('10000');

  const withdrawLockPeriod = toBigNumber('1');
  const maxAltBlocks = toBigNumber('5');
  const epochLength = toBigNumber('300');
  const totalStates = toBigNumber('4');
  const exposureDenominator = toBigNumber('1000');
  const gracePeriod = toBigNumber('8');
  const minimumStake = tokenAmount('100');
  const aggregationRange = toBigNumber('3');

  const blockConfirmerHash = utils.solidityKeccak256(['string'], ['BLOCK_CONFIRMER_ROLE']);
  const assetConfirmerHash = utils.solidityKeccak256(['string'], ['ASSET_CONFIRMER_ROLE']);
  const stakerActivityUpdaterHash = utils.solidityKeccak256(['string'], ['STAKER_ACTIVITY_UPDATER_ROLE']);
  const stakeModifierHash = utils.solidityKeccak256(['string'], ['STAKE_MODIFIER_ROLE']);

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

    tx = parameters.connect(signers[1]).setPenaltyNotRevealDeom(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setWithdrawLockPeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setMaxAltBlocks(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setEpochLength(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setNumStates(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setExposureDenominator(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setMinStake(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setGracePeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = parameters.connect(signers[1]).setAggregationRange(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);
  });

  it('parameters should be able to modify with admin role access', async () => {
    await parameters.setPenaltyNotRevealNum(toBigNumber('5'));
    const penaltyNotRevealNum = await parameters.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNum, toBigNumber('5'));

    await parameters.setPenaltyNotRevealDeom(toBigNumber('6'));
    const penaltyNotRevealDenom = await parameters.penaltyNotRevealDenom();
    assertBNEqual(penaltyNotRevealDenom, toBigNumber('6'));

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

    await parameters.setNumStates(toBigNumber('12'));
    const numStates = await parameters.numStates();
    assertBNEqual(numStates, toBigNumber('12'));

    await parameters.setExposureDenominator(toBigNumber('13'));
    const exposureDenominator = await parameters.exposureDenominator();
    assertBNEqual(exposureDenominator, toBigNumber('13'));

    await parameters.setGracePeriod(toBigNumber('14'));
    const gracePeriod = await parameters.gracePeriod();
    assertBNEqual(gracePeriod, toBigNumber('14'));

    await parameters.setAggregationRange(toBigNumber('15'));
    const aggregationRange = await parameters.aggregationRange();
    assertBNEqual(aggregationRange, toBigNumber('15'));
  });

  it('parameters values should be initialized correctly', async () => {
    const commitValue = await parameters.commit();
    assertBNEqual(commit, commitValue);

    const revealValue = await parameters.reveal();
    assertBNEqual(reveal, revealValue);

    const proposeValue = await parameters.propose();
    assertBNEqual(propose, proposeValue);

    const disputeValue = await parameters.dispute();
    assertBNEqual(dispute, disputeValue);

    const penaltyNotRevealNumValue = await parameters.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNumerator, penaltyNotRevealNumValue);

    const penaltyNotRevealDenomValue = await parameters.penaltyNotRevealDenom();
    assertBNEqual(penaltyNotRevealDenominator, penaltyNotRevealDenomValue);

    const minStakeValue = await parameters.minStake();
    assertBNEqual(minimumStake, minStakeValue);

    const withdrawLockPeriodValue = await parameters.withdrawLockPeriod();
    assertBNEqual(withdrawLockPeriod, withdrawLockPeriodValue);

    const maxAltBlocksValue = await parameters.maxAltBlocks();
    assertBNEqual(maxAltBlocks, maxAltBlocksValue);

    const epochLengthValue = await parameters.epochLength();
    assertBNEqual(epochLength, epochLengthValue);

    const numStatesValue = await parameters.numStates();
    assertBNEqual(totalStates, numStatesValue);

    const exposureDenominatorValue = await parameters.exposureDenominator();
    assertBNEqual(exposureDenominator, exposureDenominatorValue);

    const blockConfirmerHashValue = await parameters.getBlockConfirmerHash();
    assertBNEqual(blockConfirmerHash, blockConfirmerHashValue);

    const defaultAdminHashValue = await parameters.getDefaultAdminHash();
    assertBNEqual(DEFAULT_ADMIN_ROLE_HASH, defaultAdminHashValue);

    const assetConfirmerHashValue = await parameters.getAssetConfirmerHash();
    assertBNEqual(assetConfirmerHash, assetConfirmerHashValue);

    const stakerActivityUpdaterHashValue = await parameters.getStakerActivityUpdaterHash();
    assertBNEqual(stakerActivityUpdaterHash, stakerActivityUpdaterHashValue);

    const stakeModifierHashValue = await parameters.getStakeModifierHash();
    assertBNEqual(stakeModifierHash, stakeModifierHashValue);

    const gracePeriodValue = await parameters.gracePeriod();
    assertBNEqual(gracePeriod, gracePeriodValue);

    const aggregationRangeValue = await parameters.aggregationRange();
    assertBNEqual(aggregationRange, aggregationRangeValue);
  });
});
