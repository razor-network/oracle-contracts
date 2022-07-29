/* eslint-disable no-console */
const {
  getdeployedContractInstance,
  readDeploymentFile,
  getJobs,
  getCollections,
  waitForConfirmState,
  postDeploymentInitialiseContracts,
  postDeploymentGrantRoles,
} = require('../migrationHelpers');

const { BigNumber } = ethers;
const {
  NETWORK,
  NETWORK_TYPE,
  SEED_AMOUNT,
  STAKER_ADDRESSES,
} = process.env;

module.exports = async () => {
  const MINING_INTERVAL = 2000;

  const {
    CollectionManager: collectionManagerAddress,
    StakeManager: stakeManagerAddress,
    RAZOR: RAZORAddress,
  } = await readDeploymentFile();

  const { contractInstance: collectionManager } = await getdeployedContractInstance('CollectionManager', collectionManagerAddress);
  const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress);
  const { contractInstance: RAZOR } = await getdeployedContractInstance('RAZOR', RAZORAddress);

  const pendingTransactions = [];
  const stakerAddressList = STAKER_ADDRESSES.split(',');

  // Only transfer tokens in testnets
  if (NETWORK_TYPE === 'TESTNET') {
    // Add new instance of StakeManager contract & Deployer address as Minter

    for (let i = 0; i < stakerAddressList.length; i++) {
      const tx = await RAZOR.transfer(stakerAddressList[i], SEED_AMOUNT);
      pendingTransactions.push(tx);
    }
  }

  if (NETWORK === 'local' || NETWORK === 'hardhat') {
    // Set interval mining to 2 seconds. This is to enable using razor-go with interval mining without affecting hardhat config.
    await ethers.provider.send('evm_setAutomine', [false]);
    await ethers.provider.send('evm_setIntervalMining', [MINING_INTERVAL]);
  }

  // Initialise Contracts and Grant Roles
  await postDeploymentInitialiseContracts('deploy');
  await postDeploymentGrantRoles('deploy');

  console.log('Waiting for post-deployment setup transactions to get confirmed');
  for (let i = 0; i < pendingTransactions.length; i++) {
    pendingTransactions[i].wait();
  }

  const jobs = await getJobs();
  const jobsOverride = [];
  const collections = await getCollections();
  for (let i = 0; i < jobs.length; i++) {
    jobsOverride.push({
      id: 0,
      selectorType: jobs[i].selectorType,
      weight: jobs[i].weight,
      power: jobs[i].power,
      name: jobs[i].name,
      selector: jobs[i].selector,
      url: jobs[i].url,
    });
  }
  console.log('Creating Jobs');
  await collectionManager.createMulJob(jobsOverride);

  console.log('Creating Collections');
  console.log('Waiting for Confirm state : 4.......');
  const numStates = await stakeManager.NUM_STATES();
  const stateLength = (BigNumber.from(await stakeManager.EPOCH_LENGTH())).div(numStates);

  for (let i = 0; i < collections.length; i++) {
    await waitForConfirmState(numStates, stateLength);
    collections[i].occurrence = 1;
    await collectionManager.createCollection(
      collections[i].tolerance,
      collections[i].power,
      collections[i].occurrence,
      collections[i].aggregationMethod,
      collections[i].jobIDs,
      collections[i].name
    );
    console.log(`Collection Created :  ${collections[i].name}`);
  }
  console.log('Contracts deployed successfully & initial setup is done');
};
