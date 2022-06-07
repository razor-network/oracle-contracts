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
  if (NETWORK !== 'mainnet') {
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
  await postDeploymentInitialiseContracts();
  await postDeploymentGrantRoles();

  console.log('Waiting for post-deployment setup transactions to get confirmed');
  for (let i = 0; i < pendingTransactions.length; i++) {
    pendingTransactions[i].wait();
  }

  const jobs = await getJobs();
  const collections = await getCollections();
  console.log('Creating Jobs');

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    await collectionManager.createJob(job.weight, job.power, job.selectorType, job.name, job.selector, job.url);
    console.log(`Job Created :  ${job.name}`);
  }

  console.log('Creating Collections');
  console.log('Waiting for Confirm state : 4.......');
  const numStates = await stakeManager.NUM_STATES();
  const stateLength = (BigNumber.from(await stakeManager.EPOCH_LENGTH())).div(numStates);

  for (let i = 0; i < collections.length; i++) {
    await waitForConfirmState(numStates, stateLength);
    const collection = collections[i];
    await collectionManager.createCollection(collection.tolerance, collection.power, collection.aggregationMethod, collection.jobIDs, collection.name);
    console.log(`Collection Created :  ${collection.name}`);
  }
  console.log('Contracts deployed successfully & initial setup is done');
};
