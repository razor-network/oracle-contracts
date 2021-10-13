/* eslint-disable no-console */
const jsonfile = require('jsonfile');
const hre = require('hardhat');

const DEPLOYMENT_FILE = `${__dirname}/../.contract-deployment.tmp.json`;
const OLD_DEPLOYMENT_FILE = `${__dirname}/../.previous-deployment-addresses`;

const readDeploymentFile = async () => jsonfile.readFile(DEPLOYMENT_FILE);

const readOldDeploymentFile = async () => jsonfile.readFile(OLD_DEPLOYMENT_FILE);

const writeDeploymentFile = async (data) => jsonfile.writeFile(DEPLOYMENT_FILE, data);

const appendDeploymentFile = async (data) => {
  let deployments = {};

  try {
    deployments = await readDeploymentFile();
  } catch (e) {
    console.log("Deployment file doesn't exist, generating it...");
  }

  await jsonfile.writeFile(DEPLOYMENT_FILE, { ...deployments, ...data });
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

  await hre.run('verify:verify', config);

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

module.exports = {
  deployContract,
  getdeployedContractInstance,
  appendDeploymentFile,
  readDeploymentFile,
  readOldDeploymentFile,
  writeDeploymentFile,
};
