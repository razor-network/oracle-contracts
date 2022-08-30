/* eslint-disable no-console */
const jsonfile = require('jsonfile');
const hre = require('hardhat');
const axios = require('axios');
const {
  ESCAPE_HATCH_ROLE, BLOCK_CONFIRMER_ROLE, STAKE_MODIFIER_ROLE, REWARD_MODIFIER_ROLE, COLLECTION_MODIFIER_ROLE,
  REGISTRY_MODIFIER_ROLE, GOVERNER_ROLE, GOVERNANCE_ROLE, PAUSE_ROLE, SALT_MODIFIER_ROLE, DEPTH_MODIFIER_ROLE,
  COLLECTION_CONFIRMER_ROLE, OCCURRENCE_MODIFIER_ROLE, RESET_DATABOND_ROLE,
} = require('../test/helpers/constants');

const {
  NETWORK,
} = process.env;
const { BigNumber } = ethers;
const DEPLOYMENT_FILE = `${__dirname}/../.contract-deployment.tmp.json`;
const OLD_DEPLOYMENT_FILE = `${__dirname}/../.previous-deployment-addresses`;

const POST_DEPLOYMENT_TEST_FILE = `${__dirname}/../.post-deployment-test.tmp.json`;

const readDeploymentFile = async () => jsonfile.readFile(DEPLOYMENT_FILE);

const readPostDeploymentTestFile = async () => jsonfile.readFile(POST_DEPLOYMENT_TEST_FILE);

const readOldDeploymentFile = async () => jsonfile.readFile(OLD_DEPLOYMENT_FILE);

const writeDeploymentFile = async (data) => jsonfile.writeFile(DEPLOYMENT_FILE, data);

const appendDeploymentFile = async (data, type) => {
  let deployments = {};
  if (type === 'deploy') {
    try {
      deployments = await readDeploymentFile();
    } catch (e) {
      console.log("Deployment file doesn't exist, generating it...");
    }

    await jsonfile.writeFile(DEPLOYMENT_FILE, { ...deployments, ...data });
  } else {
    // This is used for testing the post deployment script
    try {
      deployments = await readPostDeploymentTestFile();
    } catch (e) {
      console.log("Deployment file doesn't exist, generating it...");
    }

    await jsonfile.writeFile(POST_DEPLOYMENT_TEST_FILE, { ...deployments, ...data });
  }
};

const updateDeploymentFile = async (contractName, type) => {
  const { deployments } = hre;
  const { get } = deployments;
  const contract = await get(contractName);
  await appendDeploymentFile({ [contractName]: contract.address }, type);
};

const verifyDeployedContracts = async (contractName, constructorParams = []) => {
  const { deployments } = hre;
  const { get } = deployments;
  const contract = await get(contractName);
  // Tenderly and hh verification
  try {
    await hre.tenderly.persistArtifacts({
      name: contractName,
      address: contract.address,
    });

    await hre.tenderly.push({
      name: contractName,
      address: contract.address,
    });

    await hre.tenderly.verify({
      name: contractName,
      address: contract.address,
    });
  } catch (err) {
    console.log('Error pushing to tenderly:', err);
  }

  const config = {
    address: contract.address,
    constructorArguments: [...constructorParams],
  };

  // We need to set explicitly for these as it was causing conflicts with OpenZeplin
  if (contractName === 'Structs') {
    config.contract = 'contracts/lib/Structs.sol:Structs';
  }

  if (contractName === 'RAZOR') {
    config.contract = 'contracts/tokenization/RAZOR.sol:RAZOR';
  }

  try {
    await hre.run('verify:verify', config);
  } catch (err) {
    console.error('Etherscan verification failed', err);
  }
};

const deployContractHH = async (contractName, constructorParams = []) => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer } = namedAccounts;
  const Contract = await deploy(contractName, {
    from: deployer,
    args: [...constructorParams],
  });
  log(
    `${contractName} deployed at ${Contract.address} by owner ${deployer} 
    using ${Contract.receipt.gasUsed} gas with tx hash ${Contract.transactionHash}`
  );
  await updateDeploymentFile(contractName, 'deploy');
  await verifyDeployedContracts(contractName, constructorParams);
  return Contract;
};

const deployPostDeploymentTestContracts = async (contractName, constructorParams = []) => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer } = namedAccounts;
  const Contract = await deploy(contractName, {
    from: deployer,
    args: [...constructorParams],
  });
  log(
    `${contractName} deployed at ${Contract.address} by owner ${deployer} 
    using ${Contract.receipt.gasUsed} gas with tx hash ${Contract.transactionHash}`
  );
  await updateDeploymentFile(contractName, 'test');
  return Contract;
};

const deployContract = async (
  contractName,
  linkDependecies = [],
  constructorParams = []
) => {
  let Contract;

  if (linkDependecies.length !== 0) {
    const dependencies = {};
    const contractAddresses = await readDeploymentFile();

    for (let i = 0; i < linkDependecies.length; i++) {
      dependencies[linkDependecies[i]] = contractAddresses[linkDependecies[i]];
    }

    Contract = await ethers.getContractFactory(contractName, {
      libraries: {
        ...dependencies,
      },
    });
  } else {
    Contract = await ethers.getContractFactory(contractName);
  }
  const contract = await Contract.deploy(...constructorParams);

  console.log(
    `${contractName} deployment tx.hash = ${contract.deployTransaction.hash} ...`
  );

  await contract.deployed();

  try {
    await hre.tenderly.persistArtifacts({
      name: contractName,
      address: contract.address,
    });

    await hre.tenderly.push({
      name: contractName,
      address: contract.address,
    });

    await hre.tenderly.verify({
      name: contractName,
      address: contract.address,
    });
  } catch (err) {
    console.log('Error pushing to tenderly:', err);
  }

  await appendDeploymentFile({ [contractName]: contract.address });
  console.log(`${contractName} deployed to: ${contract.address}`);

  const config = {
    address: contract.address,
    constructorArguments: [...constructorParams],
  };

  // We need to set explicitly for these as it was causing conflicts with OpenZeplin
  if (contractName === 'Structs') {
    config.contract = 'contracts/lib/Structs.sol:Structs';
  }

  if (contractName === 'RAZOR') {
    config.contract = 'contracts/tokenization/RAZOR.sol:RAZOR';
  }

  try {
    await hre.run('verify:verify', config);
  } catch (err) {
    console.error('Etherscan verification failed', err);
  }

  return contract;
};

const getdeployedContractInstance = async (
  contractName,
  contractAddress,
  linkDependecies = {}
) => {
  let Contract;

  if (Object.keys(linkDependecies).length !== 0) {
    Contract = await ethers.getContractFactory(contractName, {
      libraries: {
        ...linkDependecies,
      },
    });
  } else {
    Contract = await ethers.getContractFactory(contractName);
  }

  const contractInstance = await Contract.attach(contractAddress);
  return { Contract, contractInstance };
};

const SOURCE = 'https://raw.githubusercontent.com/razor-network/datasources/master';

const getJobs = async () => {
  try {
    const jobs = await axios.get(`${SOURCE}/jobs.json`);
    return jobs.data;
  } catch (error) {
    console.log('Error while fetching jobs', error.response.body);
    return null;
  }
};

const getCollections = async () => {
  try {
    const collections = await axios.get(`${SOURCE}/collections.json`);
    return collections.data;
  } catch (error) {
    console.log('Error while fetching collections', error.response.body);
    return null;
  }
};

const currentState = async (numStates, stateLength) => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const getCurrentBlock = await ethers.provider.getBlock(Number(blockNumber));
  const timestamp = BigNumber.from(getCurrentBlock.timestamp);
  const state = timestamp.div(stateLength);
  const lowerLimit = 5;
  const upperLimit = stateLength - 5;
  if (timestamp % (stateLength) > upperLimit || timestamp % (stateLength) < lowerLimit) {
    return -1;
  } else {
    return Number(state.mod(numStates));
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const waitForConfirmState = async (numStates, stateLength) => {
  let state = await currentState(numStates, stateLength);
  while (state !== 4) {
    state = await currentState(numStates, stateLength);
    console.log('Current state', state);
    await sleep(10000);
  }
};

const fetchDeployedContractDetails = async (type) => {
  if (type === 'deploy') {
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
      BondManager: bondManagerAddress,
    } = await readDeploymentFile();
    const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress);
    const { contractInstance: collectionManager } = await getdeployedContractInstance('CollectionManager', collectionManagerAddress);
    const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress);
    const { contractInstance: rewardManager } = await getdeployedContractInstance('RewardManager', rewardManagerAddress);
    const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress);
    const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
    const { contractInstance: RAZOR } = await getdeployedContractInstance('RAZOR', RAZORAddress);
    const { contractInstance: governance } = await getdeployedContractInstance('Governance', governanceAddress);
    const { contractInstance: stakedTokenFactory } = await getdeployedContractInstance('StakedTokenFactory', stakedTokenFactoryAddress);
    const { contractInstance: randomNoManager } = await getdeployedContractInstance('RandomNoManager', randomNoManagerAddress);
    const { contractInstance: bondManager } = await getdeployedContractInstance('BondManager', bondManagerAddress);

    return {
      Governance: {
        governanceAddress,
        governance,
      },
      BlockManager: {
        blockManagerAddress,
        blockManager,
      },
      CollectionManager: {
        collectionManagerAddress,
        collectionManager,
      },
      StakeManager: {
        stakeManagerAddress,
        stakeManager,
      },
      RewardManager: {
        rewardManagerAddress,
        rewardManager,
      },
      VoteManager: {
        voteManagerAddress,
        voteManager,
      },
      Delegator: {
        delegatorAddress,
        delegator,
      },
      RAZOR: {
        RAZORAddress,
        RAZOR,
      },
      StakedTokenFactory: {
        stakedTokenFactoryAddress,
        stakedTokenFactory,
      },
      RandomNoManager: {
        randomNoManagerAddress,
        randomNoManager,
      },
      BondManager: {
        bondManagerAddress,
        bondManager,
      },
    };
  } else {
    // This is used for testing the post deployment script
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
      BondManager: bondManagerAddress,
    } = await readPostDeploymentTestFile();
    const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress);
    const { contractInstance: collectionManager } = await getdeployedContractInstance('CollectionManager', collectionManagerAddress);
    const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress);
    const { contractInstance: rewardManager } = await getdeployedContractInstance('RewardManager', rewardManagerAddress);
    const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress);
    const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
    const { contractInstance: RAZOR } = await getdeployedContractInstance('RAZOR', RAZORAddress);
    const { contractInstance: governance } = await getdeployedContractInstance('Governance', governanceAddress);
    const { contractInstance: stakedTokenFactory } = await getdeployedContractInstance('StakedTokenFactory', stakedTokenFactoryAddress);
    const { contractInstance: randomNoManager } = await getdeployedContractInstance('RandomNoManager', randomNoManagerAddress);
    const { contractInstance: bondManager } = await getdeployedContractInstance('BondManager', bondManagerAddress);

    return {
      Governance: {
        governanceAddress,
        governance,
      },
      BlockManager: {
        blockManagerAddress,
        blockManager,
      },
      CollectionManager: {
        collectionManagerAddress,
        collectionManager,
      },
      StakeManager: {
        stakeManagerAddress,
        stakeManager,
      },
      RewardManager: {
        rewardManagerAddress,
        rewardManager,
      },
      VoteManager: {
        voteManagerAddress,
        voteManager,
      },
      Delegator: {
        delegatorAddress,
        delegator,
      },
      RAZOR: {
        RAZORAddress,
        RAZOR,
      },
      StakedTokenFactory: {
        stakedTokenFactoryAddress,
        stakedTokenFactory,
      },
      RandomNoManager: {
        randomNoManagerAddress,
        randomNoManager,
      },
      BondManager: {
        bondManagerAddress,
        bondManager,
      },
    };
  }
};

const postDeploymentInitialiseContracts = async (type) => {
  const {
    Governance: {
      governance,
    },
    BlockManager: {
      blockManagerAddress,
      blockManager,
    },
    CollectionManager: {
      collectionManagerAddress,
      collectionManager,
    },
    StakeManager: {
      stakeManagerAddress,
      stakeManager,
    },
    RewardManager: {
      rewardManagerAddress,
      rewardManager,
    },
    VoteManager: {
      voteManagerAddress,
      voteManager,
    },
    Delegator: {
      delegator,
    },
    RAZOR: {
      RAZORAddress,
      RAZOR,
    },
    StakedTokenFactory: {
      stakedTokenFactoryAddress,
    },
    RandomNoManager: {
      randomNoManagerAddress,
      randomNoManager,
    },
    BondManager: {
      bondManager,
      bondManagerAddress,
    },
  } = await fetchDeployedContractDetails(type);

  const pendingTransactions = [];
  if (NETWORK !== 'mainnet') {
    // Add new instance of StakeManager contract & Deployer address as Minter
    const supply = (BigNumber.from(10).pow(BigNumber.from(23))).mul(BigNumber.from(5));
    await RAZOR.transfer(stakeManagerAddress, supply);
  }

  pendingTransactions.push(await blockManager.initialize(stakeManagerAddress, rewardManagerAddress, voteManagerAddress,
    collectionManagerAddress, randomNoManagerAddress).catch(() => {}));
  pendingTransactions.push(await voteManager.initialize(stakeManagerAddress, rewardManagerAddress,
    blockManagerAddress, collectionManagerAddress).catch(() => {}));
  pendingTransactions.push(await stakeManager.initialize(RAZORAddress, rewardManagerAddress, voteManagerAddress,
    stakedTokenFactoryAddress).catch(() => {}));
  pendingTransactions.push(await rewardManager.initialize(stakeManagerAddress, voteManagerAddress,
    blockManagerAddress, collectionManagerAddress).catch(() => {}));
  pendingTransactions.push(await delegator.updateAddress(collectionManagerAddress, randomNoManagerAddress).catch(() => {}));
  pendingTransactions.push(await randomNoManager.initialize(blockManagerAddress).catch(() => {}));
  pendingTransactions.push(await governance.initialize(blockManagerAddress, bondManagerAddress, rewardManagerAddress, stakeManagerAddress,
    voteManagerAddress, collectionManagerAddress, randomNoManagerAddress).catch(() => {}));
  pendingTransactions.push(await collectionManager.initialize(voteManagerAddress, bondManagerAddress).catch(() => {}));
  pendingTransactions.push(await bondManager.initialize(RAZORAddress, collectionManagerAddress).catch(() => {}));

  Promise.allSettled(pendingTransactions).then(() => console.log('Contracts Initialised'));
};

const postDeploymentGrantRoles = async (type) => {
  const signers = await ethers.getSigners();

  const {
    Governance: {
      governanceAddress,
      governance,
    },
    BlockManager: {
      blockManagerAddress,
      blockManager,
    },
    CollectionManager: {
      collectionManagerAddress,
      collectionManager,
    },
    StakeManager: {
      stakeManagerAddress,
      stakeManager,
    },
    RewardManager: {
      rewardManagerAddress,
      rewardManager,
    },
    VoteManager: {
      voteManagerAddress,
      voteManager,
    },
    Delegator: {
      delegator,
    },
    RandomNoManager: {
      randomNoManager,
    },
    BondManager: {
      bondManager,
    },
  } = await fetchDeployedContractDetails(type);

  const pendingTransactions = [];
  pendingTransactions.push(await collectionManager.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await blockManager.grantRole(GOVERNANCE_ROLE, governanceAddress));
  pendingTransactions.push(await bondManager.grantRole(RESET_DATABOND_ROLE, governance.address));
  pendingTransactions.push(await collectionManager.grantRole(COLLECTION_CONFIRMER_ROLE, blockManager.address));
  pendingTransactions.push(await collectionManager.grantRole(OCCURRENCE_MODIFIER_ROLE, bondManager.address));
  pendingTransactions.push(await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, bondManager.address));
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

  Promise.allSettled(pendingTransactions).then(() => console.log('Contract Roles Granted'));
};

module.exports = {
  updateDeploymentFile,
  fetchDeployedContractDetails,
  deployContract,
  deployContractHH,
  deployPostDeploymentTestContracts,
  getdeployedContractInstance,
  appendDeploymentFile,
  readDeploymentFile,
  readOldDeploymentFile,
  writeDeploymentFile,
  getJobs,
  getCollections,
  sleep,
  waitForConfirmState,
  postDeploymentInitialiseContracts,
  postDeploymentGrantRoles,
};
