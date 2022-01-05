const { assert } = require('chai');
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
  let assetManager;
  let blockManager;
  let stakeManager;
  let rewardManager;
  let voteManager;
  let randomNoManager;
  let delegator;
  let initializeContracts;

  const expectedRevertMessage = 'AccessControl';

  const penaltyNotRevealNumerator = toBigNumber('1');

  const withdrawLockPeriod = toBigNumber('1');
  const maxAltBlocks = toBigNumber('5');
  const epochLength = toBigNumber('300');
  const gracePeriod = toBigNumber('8');
  const minimumStake = tokenAmount('1000');
  const blockReward = tokenAmount('100');
  const withdrawReleasePeriod = toBigNumber('5');
  const extendLockPenalty = toBigNumber('1');
  const maxAge = toBigNumber('1000000');
  const maxTolerance = toBigNumber('1000');
  const maxCommission = toBigNumber('20');
  const deltaCommission = toBigNumber('3');
  const epochLimitForUpdateCommission = toBigNumber('100');

  before(async () => {
    ({
      governance, assetManager, blockManager, stakeManager, voteManager,
      rewardManager, randomNoManager, delegator, initializeContracts,
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

    tx = governance.connect(signers[0]).setSlashParams(toBigNumber('1'), toBigNumber('1'), toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setWithdrawLockPeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setWithdrawReleasePeriod(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setExtendLockPenalty(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMaxAltBlocks(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setEpochLength(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setMinStake(toBigNumber('1'));
    await assertRevert(tx, expectedRevertMessage);

    tx = governance.connect(signers[0]).setGracePeriod(toBigNumber('1'));
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
  });

  it('parameters should be able to modify with governer role access', async () => {
    await governance.grantRole(GOVERNER_ROLE, signers[0].address);
    await governance.setPenaltyNotRevealNum(toBigNumber('5'));
    const penaltyNotRevealNum = await rewardManager.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNum, toBigNumber('5'));

    await governance.setMinStake(toBigNumber('8'));
    const minStake = await stakeManager.minStake();
    const minStake1 = await voteManager.minStake();
    const minStake2 = await blockManager.minStake();
    assertBNEqual(minStake, toBigNumber('8'));
    assertBNEqual(minStake1, toBigNumber('8'));
    assertBNEqual(minStake2, toBigNumber('8'));

    await governance.setWithdrawLockPeriod(toBigNumber('9'));
    const withdrawLockPeriod = await stakeManager.withdrawLockPeriod();
    assertBNEqual(withdrawLockPeriod, toBigNumber('9'));

    await governance.setMaxAltBlocks(toBigNumber('10'));
    const maxAltBlocks = await blockManager.maxAltBlocks();
    assertBNEqual(maxAltBlocks, toBigNumber('10'));

    await governance.setEpochLength(toBigNumber('11'));
    const epochLength = await assetManager.epochLength();
    const epochLength1 = await blockManager.epochLength();
    const epochLength2 = await stakeManager.epochLength();
    const epochLength3 = await rewardManager.epochLength();
    const epochLength4 = await voteManager.epochLength();
    const epochLength5 = await randomNoManager.epochLength();
    const epochLength6 = await delegator.epochLength();
    assertBNEqual(epochLength, toBigNumber('11'));
    assertBNEqual(epochLength1, toBigNumber('11'));
    assertBNEqual(epochLength2, toBigNumber('11'));
    assertBNEqual(epochLength3, toBigNumber('11'));
    assertBNEqual(epochLength4, toBigNumber('11'));
    assertBNEqual(epochLength5, toBigNumber('11'));
    assertBNEqual(epochLength6, toBigNumber('11'));

    await governance.setGracePeriod(toBigNumber('14'));
    const gracePeriod = await rewardManager.gracePeriod();
    const gracePeriod1 = await stakeManager.gracePeriod();
    assertBNEqual(gracePeriod, toBigNumber('14'));
    assertBNEqual(gracePeriod1, toBigNumber('14'));

    await governance.setMaxTolerance(toBigNumber('15'));
    const maxTolerance = await rewardManager.maxTolerance();
    const maxTolerance1 = await assetManager.maxTolerance();
    assertBNEqual(maxTolerance, toBigNumber('15'));
    assertBNEqual(maxTolerance1, toBigNumber('15'));

    await governance.setWithdrawReleasePeriod(toBigNumber('16'));
    const withdrawReleasePeriod = await stakeManager.withdrawReleasePeriod();
    assertBNEqual(withdrawReleasePeriod, toBigNumber('16'));

    await governance.setExtendLockPenalty(toBigNumber('17'));
    const extendLockPenalty = await stakeManager.extendLockPenalty();
    assertBNEqual(extendLockPenalty, toBigNumber('17'));

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

    const tx = governance.setMaxCommission(toBigNumber('101'));
    await assertRevert(tx, 'Invalid Max Commission Update');
  });

  it('parameters values should be initialized correctly', async () => {
    const penaltyNotRevealNumValue = await rewardManager.penaltyNotRevealNum();
    assertBNEqual(penaltyNotRevealNumerator, penaltyNotRevealNumValue);

    const slashParams = await stakeManager.slashNums();
    assertBNEqual(slashParams[0], toBigNumber('500'));
    assertBNEqual(slashParams[1], toBigNumber('9500'));
    assertBNEqual(slashParams[2], toBigNumber('0'));

    const minStakeValue = await stakeManager.minStake();
    assertBNEqual(minimumStake, minStakeValue);

    const blockRewardValue = await blockManager.blockReward();
    assertBNEqual(blockReward, blockRewardValue);

    const withdrawLockPeriodValue = await stakeManager.withdrawLockPeriod();
    assertBNEqual(withdrawLockPeriod, withdrawLockPeriodValue);

    const withdrawReleasePeriodValue = await stakeManager.withdrawReleasePeriod();
    assertBNEqual(withdrawReleasePeriod, withdrawReleasePeriodValue);

    const extendLockPenaltyValue = await stakeManager.extendLockPenalty();
    assertBNEqual(extendLockPenalty, extendLockPenaltyValue);

    const maxAltBlocksValue = await blockManager.maxAltBlocks();
    assertBNEqual(maxAltBlocks, maxAltBlocksValue);

    const epochLengthValue = await assetManager.epochLength();
    assertBNEqual(epochLength, epochLengthValue);

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

    const gracePeriodValue = await rewardManager.gracePeriod();
    assertBNEqual(gracePeriod, gracePeriodValue);
  });
});
