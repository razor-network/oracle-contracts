/* eslint-disable no-console */
const librariesMigration = require('./src/1_deploy_libraries');
const blockManagerMigration = require('./src/2_deploy_block_manager');
const jobManagerMigration = require('./src/3_deploy_job_manager');
const stakeManagerMigration = require('./src/4_deploy_stake_manager');
const stateManagerMigration = require('./src/5_deploy_state_manager');
const voteManagerMigration = require('./src/6_deploy_vote_manager');
const delegatorMigration = require('./src/7_deploy_delegator');
const faucetMigration = require('./src/8_delpoy_faucet');
const postDeploymentSetup = require('./src/postDeploymentSetup');

async function main() {
  // Deploy smart contracts
  await librariesMigration();
  await blockManagerMigration();
  await jobManagerMigration();
  await stakeManagerMigration();
  await stateManagerMigration();
  await voteManagerMigration();
  await delegatorMigration();
  await faucetMigration();
  await postDeploymentSetup();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
