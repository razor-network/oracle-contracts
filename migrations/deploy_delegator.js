/* eslint-disable no-console */

const { ethers } = require('hardhat');
const { readDeploymentFile, getdeployedContractInstance } = require('./migrationHelpers');
const delegatorMigration = require('./src/7_deploy_delegator');

async function main() {
  const signers = await ethers.getSigners();
  // Deploy smart contracts
  await delegatorMigration();

  const {
    Delegator: delegatorAddress,
  } = await readDeploymentFile();
    // keccak256("PAUSE_ROLE")
  const PAUSE_ROLE = '0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d';
  const { contractInstance: delegatorv2 } = await getdeployedContractInstance('Delegator', delegatorAddress);
  const pendingTransactions = [];
  pendingTransactions.push(await delegatorv2.grantRole(PAUSE_ROLE, signers[0].address));
  pendingTransactions.push(await delegatorv2.updateAddress('0xbF5c5AD799b2245BA36562BebfcbAbc5D508Eb84', '0xC2d1F555168021d107bDB85380890281b3947493'));

  console.log('Waiting for post-deployment setup transactions to get confirmed');
  for (let i = 0; i < pendingTransactions.length; i++) {
    pendingTransactions[i].wait();
  }
  console.log('post deployment tx are complete', pendingTransactions);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
