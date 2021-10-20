/* eslint-disable no-console */
const governanceMigration = require('./src/1_deploy_governance');
const blockManagerMigration = require('./src/2_deploy_block_manager');
const assetManagerMigration = require('./src/3_deploy_asset_manager');
const stakeManagerMigration = require('./src/4_deploy_stake_manager');
const rewardManagerMigration = require('./src/5_deploy_reward_manager');
const voteManagerMigration = require('./src/6_deploy_vote_manager');
const delegatorMigration = require('./src/7_deploy_delegator');
const RAZORMigration = require('./src/8_deploy_razor');
const stakedTokenFactoryMigration = require('./src/9_deploy_staked_token_factory');
const randomNoManagerMigration = require('./src/10_deploy_random_no_manager');
const postDeploymentSetup = require('./src/postDeploymentSetup');

async function main() {
  // Deploy smart contracts
  await governanceMigration();
  await blockManagerMigration();
  await assetManagerMigration();
  await stakeManagerMigration();
  await rewardManagerMigration();
  await voteManagerMigration();
  await delegatorMigration();
  await RAZORMigration();
  await stakedTokenFactoryMigration();
  await randomNoManagerMigration();
  await postDeploymentSetup();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
