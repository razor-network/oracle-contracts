const { assert } = require('chai');
const {
  DEFAULT_ADMIN_ROLE_HASH,
  BLOCK_CONFIRMER_ROLE,
  COLLECTION_CONFIRMER_ROLE,
  STAKER_ACTIVITY_UPDATER_ROLE,
  STAKE_MODIFIER_ROLE,
  REWARD_MODIFIER_ROLE,
  COLLECTION_MODIFIER_ROLE,
  ZERO_ADDRESS,
  GOVERNER_ROLE,
  STOKEN_ROLE,
} = require('./helpers/constants');
const {
  assertRevert, restoreSnapshot, takeSnapshot, waitNBlocks, mineToNextState, mineToNextEpoch,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  getEpoch, tokenAmount,
} = require('./helpers/utils');

describe('Access Control Test', async () => {
  let signers;
  let snapShotId;
  let blockManager;
  let governance;
  let collectionManager;
  let stakeManager;
  let rewardManager;
  let initializeContracts;
  let delegator;
  const expectedRevertMessage = 'AccessControl';

  before(async () => {
    ({
      blockManager, governance, collectionManager, stakeManager, rewardManager, initializeContracts, delegator,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
    await Promise.all(await initializeContracts());
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
  });

  it('admin role should be granted', async () => {
    const isAdminRoleGranted = await blockManager.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
    assert(isAdminRoleGranted === true, 'Admin role was not Granted');
  });

  it('confirmPreviousEpochBlock() should not be accessable by anyone besides BlockConfirmer', async () => {
    // Checking if Anyone can access it
    const epoch = getEpoch();
    await assertRevert(blockManager.confirmPreviousEpochBlock(epoch), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await blockManager.grantRole(COLLECTION_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(blockManager.confirmPreviousEpochBlock(epoch), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await blockManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await assertRevert(blockManager.confirmPreviousEpochBlock(epoch), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await blockManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(blockManager.confirmPreviousEpochBlock(epoch), expectedRevertMessage);
  });

  it('confirmPreviousEpochBlock() should be accessable by BlockConfirmer', async () => {
    // Wait for 600 blocks, as epoch should be greater than 300, for confirmPreviousEpochBlock method to work.
    await waitNBlocks(600);
    const epoch = getEpoch();

    await blockManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await blockManager.confirmPreviousEpochBlock(epoch);
    await blockManager.revokeRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(blockManager.confirmPreviousEpochBlock(epoch), expectedRevertMessage);
  });

  it('slash() should not be accessable by anyone besides StakeModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(stakeManager.slash(1, 1, signers[2].address), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await rewardManager.grantRole(COLLECTION_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(stakeManager.slash(1, 1, signers[2].address), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await rewardManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(stakeManager.slash(1, 1, signers[2].address), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await rewardManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(stakeManager.slash(1, 1, signers[2].address), expectedRevertMessage);
  });

  it('slash() should be accessable by StakeModifier', async () => {
    await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await stakeManager.slash(1, 1, signers[2].address);
    // await stakeManager.revokeRole(STAKE_MODIFIER_ROLE, signers[0].address);
    // await assertRevert(stakeManager.slash(1, signers[2].address, 1), expectedRevertMessage);
  });

  it('giveBlockReward() should not be accessable by anyone besides RewardModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(rewardManager.giveBlockReward(1, 1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await rewardManager.grantRole(await COLLECTION_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(rewardManager.giveBlockReward(1, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await rewardManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(rewardManager.giveBlockReward(1, 1), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await rewardManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(rewardManager.giveBlockReward(1, 1), expectedRevertMessage);
  });

  it('giveBlockReward() should be accessable by RewardModifier', async () => {
    await rewardManager.grantRole(REWARD_MODIFIER_ROLE, signers[0].address);
    await rewardManager.giveBlockReward(1, 1);
    await rewardManager.revokeRole(REWARD_MODIFIER_ROLE, signers[0].address);
    await assertRevert(rewardManager.giveBlockReward(1, 1), expectedRevertMessage);
  });

  // it('giveRewards() should not be accessable by anyone besides RewardModifier', async () => {
  //   // Checking if Anyone can access it
  //   await assertRevert(rewardManager.giveRewards(1, 1), expectedRevertMessage);
  //
  //   // Checking if AssetConfirmer can access it
  //   await rewardManager.grantRole(await COLLECTION_CONFIRMER_ROLE, signers[0].address);
  //   await assertRevert(rewardManager.giveRewards(1, 1), expectedRevertMessage);
  //
  //   // Checking if BlockConfirmer can access it
  //   await rewardManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
  //   await assertRevert(rewardManager.giveRewards(1, 1), expectedRevertMessage);
  //
  //   // Checking if StakerActivityUpdater can access it
  //   await rewardManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
  //   await assertRevert(rewardManager.giveRewards(1, 1), expectedRevertMessage);
  // });
  //
  // it('giveRewards() should be accessable by RewardModifier', async () => {
  //   await rewardManager.grantRole(REWARD_MODIFIER_ROLE, signers[0].address);
  //   await rewardManager.giveRewards(1, 1);
  //   await rewardManager.revokeRole(REWARD_MODIFIER_ROLE, signers[0].address);
  //   await assertRevert(rewardManager.giveRewards(1, 1), expectedRevertMessage);
  // });

  it('givePenalties() should not be accessable by anyone besides RewardModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(rewardManager.givePenalties(1, 1), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await rewardManager.grantRole(await COLLECTION_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(rewardManager.givePenalties(1, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await rewardManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(rewardManager.givePenalties(1, 1), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await rewardManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(rewardManager.givePenalties(1, 1), expectedRevertMessage);
  });

  it('givePenalties() should be accessable by RewardModifier', async () => {
    await rewardManager.grantRole(REWARD_MODIFIER_ROLE, signers[0].address);
    await rewardManager.givePenalties(1, 1);
    await rewardManager.revokeRole(REWARD_MODIFIER_ROLE, signers[0].address);
    await assertRevert(rewardManager.givePenalties(1, 1), expectedRevertMessage);
  });

  it('setStakerStake() should not be accessable by anyone besides StakeModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(stakeManager.setStakerStake(1, 1, 1, 10, 10), expectedRevertMessage);

    // Checking if AssetConfirmer can access it
    await stakeManager.grantRole(await COLLECTION_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(stakeManager.setStakerStake(1, 1, 1, 10, 10), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await stakeManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(stakeManager.setStakerStake(1, 1, 1, 10, 10), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await stakeManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(stakeManager.setStakerStake(1, 1, 1, 10, 10), expectedRevertMessage);

    // Checking if RewardModifier can access it
    await stakeManager.grantRole(REWARD_MODIFIER_ROLE, signers[0].address);
    await assertRevert(stakeManager.setStakerStake(1, 1, 1, 10, 10), expectedRevertMessage);
  });

  it('setStakerStake() should be accessable by StakeModifier', async () => {
    await stakeManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    stakeManager.setStakerStake(1, 1, 1, 10, 10);
    await stakeManager.revokeRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await assertRevert(stakeManager.setStakerStake(1, 1, 1, 10, 10), expectedRevertMessage);
  });

  it('createJob() should not be accessable by anyone besides AssetCreator', async () => {
    // Checking if Anyone can access it
    await assertRevert(collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1'), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await collectionManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1'), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await collectionManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await assertRevert(collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1'), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await collectionManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1'), expectedRevertMessage);
  });

  it('createJob() should be accessable by only AssetCreator', async () => {
    const assetCreatorHash = COLLECTION_MODIFIER_ROLE;
    await collectionManager.grantRole(assetCreatorHash, signers[0].address);
    await collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1');
    await collectionManager.revokeRole(assetCreatorHash, signers[0].address);
    await assertRevert(collectionManager.createJob(25, 0, 0, 'http://testurl.com/2', 'selector/2', 'test2'), expectedRevertMessage);
  });

  it('updateJob() should not be accessable by anyone besides AssetCreator', async () => {
    // Checking if Anyone can access it
    await assertRevert(collectionManager.updateJob(1, 25, 2, 0, 'http://testurl.com/2', 'selector/2'), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await collectionManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(collectionManager.updateJob(1, 25, 2, 0, 'http://testurl.com/2', 'selector/2'), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await collectionManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await assertRevert(collectionManager.updateJob(1, 25, 2, 0, 'http://testurl.com/2', 'selector/2'), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await collectionManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(collectionManager.updateJob(1, 25, 2, 0, 'http://testurl.com/2', 'selector/2'), expectedRevertMessage);
  });

  it('updateJob() should be accessable by only AssetCreator', async () => {
    const assetCreatorHash = COLLECTION_MODIFIER_ROLE;
    await collectionManager.grantRole(assetCreatorHash, signers[0].address);
    await collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1');
    await mineToNextState();
    await collectionManager.updateJob(1, 25, 2, 0, 'http://testurl.com/2', 'selector/2');
    await collectionManager.revokeRole(assetCreatorHash, signers[0].address);
    await assertRevert(collectionManager.updateJob(1, 25, 2, 0, 'http://testurl.com/2', 'selector/2'), expectedRevertMessage);
  });

  it('setCollectionStatus() should not be accessable by anyone besides AssetCreator', async () => {
    // Checking if Anyone can access it
    await assertRevert(collectionManager.setCollectionStatus(true, 1), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await collectionManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(collectionManager.setCollectionStatus(true, 1), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await collectionManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await assertRevert(collectionManager.setCollectionStatus(true, 1), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await collectionManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(collectionManager.setCollectionStatus(true, 1), expectedRevertMessage);
  });

  it('setCollectionStatus() should be accessable by only AssetCreator', async () => {
    const assetCreatorHash = COLLECTION_MODIFIER_ROLE;
    await collectionManager.grantRole(assetCreatorHash, signers[0].address);
    await collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1');
    const collectionName = 'Test Collection2';
    await mineToNextState();
    await mineToNextState();
    await mineToNextState();
    await mineToNextState();
    await collectionManager.createCollection(500, 0, 1, [1], collectionName);
    await collectionManager.setCollectionStatus(true, 1);
    await collectionManager.revokeRole(assetCreatorHash, signers[0].address);
    await assertRevert(collectionManager.setCollectionStatus(true, 1), expectedRevertMessage);
  });

  it('createCollection() should not be accessable by anyone besides AssetCreator', async () => {
    // Checking if Anyone can access it
    await assertRevert(collectionManager.createCollection(500, 1, 1, [1, 2], 'test'), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await collectionManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(collectionManager.createCollection(500, 1, 1, [1, 2], 'test'), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await collectionManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await assertRevert(collectionManager.createCollection(500, 1, 1, [1, 2], 'test'), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await collectionManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(collectionManager.createCollection(500, 1, 1, [1, 2], 'test'), expectedRevertMessage);
  });

  it('createCollection() should be accessable by only AssetCreator', async () => {
    await mineToNextEpoch();
    const assetCreatorHash = COLLECTION_MODIFIER_ROLE;
    await collectionManager.grantRole(assetCreatorHash, signers[0].address);
    await collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1');
    await collectionManager.createJob(25, 0, 0, 'http://testurl.com/2', 'selector/2', 'test2');
    await mineToNextState();// reveal
    await mineToNextState();// propose
    await mineToNextState();// dispute
    await mineToNextState();// confirm
    await collectionManager.createCollection(500, 1, 1, [1, 2], 'test');
    await collectionManager.revokeRole(assetCreatorHash, signers[0].address);
    await assertRevert(collectionManager.createCollection(500, 1, 1, [1, 2], 'test'), expectedRevertMessage);
  });

  it('updateCollection() should not be accessable by anyone besides AssetModifier', async () => {
    // Checking if Anyone can access it
    await assertRevert(collectionManager.updateCollection(3, 500, 2, -2, [1, 2]), expectedRevertMessage);

    // Checking if BlockConfirmer can access it
    await collectionManager.grantRole(BLOCK_CONFIRMER_ROLE, signers[0].address);
    await assertRevert(collectionManager.updateCollection(3, 500, 2, -2, [1, 2]), expectedRevertMessage);

    // Checking if StakeModifier can access it
    await collectionManager.grantRole(STAKE_MODIFIER_ROLE, signers[0].address);
    await assertRevert(collectionManager.updateCollection(3, 500, 2, -2, [1, 2]), expectedRevertMessage);

    // Checking if StakerActivityUpdater can access it
    await collectionManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
    await assertRevert(collectionManager.updateCollection(3, 500, 2, -2, [1, 2]), expectedRevertMessage);
  });

  it('updateCollection() should be accessable by only AssetModifier', async () => {
    const assetModifierHash = COLLECTION_MODIFIER_ROLE;
    await collectionManager.grantRole(assetModifierHash, signers[0].address);

    await collectionManager.createJob(25, 0, 0, 'http://testurl.com/1', 'selector/1', 'test1');
    await collectionManager.createJob(25, 0, 0, 'http://testurl.com/2', 'selector/2', 'test2');
    await mineToNextState();// propose
    await mineToNextState();// dispute
    await mineToNextState();// confirm
    await collectionManager.createCollection(500, 1, 1, [1, 2], 'test');

    await collectionManager.updateCollection(1, 500, 2, -2, [1, 2]);
    await collectionManager.revokeRole(assetModifierHash, signers[0].address);
    await assertRevert(collectionManager.updateCollection(1, 500, 2, -2, [1, 2]), expectedRevertMessage);
  });

  it('Only Governer should able to update Block Reward', async () => {
    await assertRevert(governance.connect(signers[1]).setBlockReward(5500), expectedRevertMessage);
    await governance.grantRole(GOVERNER_ROLE, signers[0].address);
    assert(await governance.setBlockReward(5500), 'Admin not able to update BlockReward');
  });

  it('Default Admin should able to change, New admin should able to grant/revoke', async () => {
    // Old admin should be able to grant admin role to another account
    await stakeManager.grantRole(DEFAULT_ADMIN_ROLE_HASH, signers[1].address);

    // New admin should be able to revoke admin access from old admin
    await stakeManager.connect(signers[1]).revokeRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);

    // Old admin should not able to assign roles anymore
    await assertRevert(stakeManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address), expectedRevertMessage);

    // New admin should be able to assign roles
    await stakeManager.connect(signers[1]).grantRole(STAKER_ACTIVITY_UPDATER_ROLE, signers[0].address);
  });
  it('Only Admin should be able to call updateAddress in Delegator', async () => {
    assert(await delegator.connect(signers[0]).updateAddress(signers[2].address, signers[2].address));
    await assertRevert(delegator.connect(signers[1]).updateAddress(signers[2].address, signers[2].address), expectedRevertMessage);
  });
  it('Delegator initializer should not accept zero Address', async function () {
    await assertRevert(delegator.connect(signers[0]).updateAddress(ZERO_ADDRESS, signers[2].address), 'Zero Address check');
    await assertRevert(delegator.connect(signers[0]).updateAddress(signers[2].address, ZERO_ADDRESS), 'Zero Address check');
  });
  it('Only Admin should be able to call upgradeDelegator in collectionManager', async () => {
    assert(await collectionManager.connect(signers[0]).upgradeDelegator(signers[2].address));
    await assertRevert(collectionManager.connect(signers[1]).upgradeDelegator(signers[2].address), expectedRevertMessage);
  });
  it('upgradeDelegator should not accept zero Address', async function () {
    await assertRevert(collectionManager.connect(signers[0]).upgradeDelegator(ZERO_ADDRESS), 'Zero Address check');
  });
  it('only sToken Address should be able to call the srzrTransfer Method', async function () {
    await assertRevert(stakeManager.connect(signers[0]).srzrTransfer(signers[0].address, signers[1].address, tokenAmount('100'), 1), expectedRevertMessage);
    await stakeManager.connect(signers[0]).grantRole(STOKEN_ROLE, signers[2].address);
    assert(await stakeManager.connect(signers[2]).srzrTransfer(signers[0].address, signers[1].address, tokenAmount('100'), 1), 'STOKEN_ROLE not granted');
  });
});
