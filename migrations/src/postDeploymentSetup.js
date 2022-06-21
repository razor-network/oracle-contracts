/* eslint-disable no-console */
const { ESCAPE_HATCH_ROLE } = require('../../test/helpers/constants');
const {
  getdeployedContractInstance,
  readDeploymentFile,
  getJobs,
  getCollections,
  waitForConfirmState,
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
  const signers = await ethers.getSigners();

  const {
    Governance: governanceAddress,
    BlockManager: blockManagerAddress,
    CollectionManager: collectionManagerAddress,
    StakeManager: stakeManagerAddress,
    RewardManager: rewardManagerAddress,
    VoteManager: voteManagerAddress,
    Delegator: delegatorAddress,
    RAZOR: RAZORAddress,
    StakedTokenFactory: stakedTokenFactoryAddress,
    RandomNoManager: randomNoManagerAddress,
  } = await readDeploymentFile();

  // keccak256("BLOCK_CONFIRMER_ROLE")
  const BLOCK_CONFIRMER_ROLE = '0x18797bc7973e1dadee1895be2f1003818e30eae3b0e7a01eb9b2e66f3ea2771f';

  // keccak256("STAKE_MODIFIER_ROLE")
  const STAKE_MODIFIER_ROLE = '0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804';

  // keccak256("REWARD_MODIFIER_ROLE")
  const REWARD_MODIFIER_ROLE = '0xcabcaf259dd9a27f23bd8a92bacd65983c2ebf027c853f89f941715905271a8d';

  // keccak256("COLLECTION_MODIFIER_ROLE")
  const COLLECTION_MODIFIER_ROLE = '0xa3a75e7cd2b78fcc3ae2046ab93bfa4ac0b87ed7ea56646a312cbcb73eabd294';

  // keccak256("REGISTRY_MODIFIER_ROLE")
  const REGISTRY_MODIFIER_ROLE = '0xca51085219bef34771da292cb24ee4fcf0ae6bdba1a62c17d1fb7d58be802883';

  // keccak256("GOVERNER_ROLE")
  const GOVERNER_ROLE = '0x704c992d358ec8f6051d88e5bd9f92457afedcbc3e2d110fcd019b5eda48e52e';

  // keccak256("GOVERNANCE_ROLE")
  const GOVERNANCE_ROLE = '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1';

  // keccak256("PAUSE_ROLE")
  const PAUSE_ROLE = '0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d';

  // keccak256("SALT_MODIFER_ROLE")
  const SALT_MODIFIER_ROLE = '0xf31dda80d37c96a1a0852ace387dda52a75487d7d4eb74895e749ede3e0987b4';

  // keccak256("DEPTH_MODIFIER_ROLE")
  const DEPTH_MODIFIER_ROLE = '0xdec504361dd78243e1ec4f53c4c0ff2daf8da88c57ec66ea0107a0cb80d8bc17';

  const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress);
  const { contractInstance: collectionManager } = await getdeployedContractInstance('CollectionManager', collectionManagerAddress);
  const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress);
  const { contractInstance: rewardManager } = await getdeployedContractInstance('RewardManager', rewardManagerAddress);
  const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress);
  const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
  const { contractInstance: RAZOR } = await getdeployedContractInstance('RAZOR', RAZORAddress);
  const { contractInstance: governance } = await getdeployedContractInstance('Governance', governanceAddress);
  const { contractInstance: randomNoManager } = await getdeployedContractInstance('RandomNoManager', randomNoManagerAddress);

  const pendingTransactions = [];
  const stakerAddressList = STAKER_ADDRESSES.split(',');

  // Only transfer tokens in testnets
  if (NETWORK_TYPE === 'TESTNET') {
    // Add new instance of StakeManager contract & Deployer address as Minter

    const supply = (BigNumber.from(10).pow(BigNumber.from(23))).mul(BigNumber.from(5));

    await RAZOR.transfer(stakeManagerAddress, supply);

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

  pendingTransactions.push(await blockManager.initialize(stakeManagerAddress, rewardManagerAddress, voteManagerAddress,
    collectionManagerAddress, randomNoManagerAddress));
  pendingTransactions.push(await voteManager.initialize(stakeManagerAddress, rewardManagerAddress, blockManagerAddress, collectionManagerAddress));
  pendingTransactions.push(await stakeManager.initialize(RAZORAddress, rewardManagerAddress, voteManagerAddress, stakedTokenFactoryAddress));
  pendingTransactions.push(await rewardManager.initialize(stakeManagerAddress, voteManagerAddress, blockManagerAddress, collectionManagerAddress));
  pendingTransactions.push(await delegator.updateAddress(collectionManagerAddress));
  pendingTransactions.push(await randomNoManager.initialize(blockManagerAddress));
  pendingTransactions.push(await governance.initialize(blockManagerAddress, rewardManagerAddress, stakeManagerAddress,
    voteManagerAddress, collectionManagerAddress, randomNoManagerAddress));
  pendingTransactions.push(await collectionManager.initialize(voteManagerAddress, blockManagerAddress));

  pendingTransactions.push(await collectionManager.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await blockManager.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await rewardManager.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await stakeManager.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await voteManager.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await delegator.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await randomNoManager.grantRole(GOVERNANCE_ROLE, governanceAddress));

  pendingTransactions.push(await blockManager.grantRole(BLOCK_CONFIRMER_ROLE, voteManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, voteManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, stakeManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, rewardManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, voteManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(ESCAPE_HATCH_ROLE, signers[0].address));
  pendingTransactions.push(await collectionManager.grantRole(REGISTRY_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address));
  pendingTransactions.push(await stakeManager.grantRole(PAUSE_ROLE, signers[0].address));
  pendingTransactions.push(await governance.grantRole(GOVERNER_ROLE, signers[0].address));
  pendingTransactions.push(await voteManager.grantRole(SALT_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await voteManager.grantRole(DEPTH_MODIFIER_ROLE, collectionManagerAddress));

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
