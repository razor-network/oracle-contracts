const { BLOCK_REWARD } = require('./constants');

const setupContracts = async () => {
  const Structs = await ethers.getContractFactory('Structs');
  const structs = await Structs.deploy();
  await structs.deployed();

  const Random = await ethers.getContractFactory('Random');
  const random = await Random.deploy();
  await random.deployed();

  const BlockManager = await ethers.getContractFactory('BlockManager', {
    libraries: {
      Random: random.address,
    },
  });

  const Parameters = await ethers.getContractFactory('Parameters');
  const Delegator = await ethers.getContractFactory('Delegator');
  const Faucet = await ethers.getContractFactory('Faucet');
  const JobManager = await ethers.getContractFactory('JobManager');
  const SchellingCoin = await ethers.getContractFactory('SchellingCoin');
  const StakeManager = await ethers.getContractFactory('StakeManager');
  const VoteManager = await ethers.getContractFactory('VoteManager');

  const parameters = await Parameters.deploy();
  const blockManager = await BlockManager.deploy();
  const delegator = await Delegator.deploy();
  const jobManager = await JobManager.deploy(parameters.address);
  const stakeManager = await StakeManager.deploy(BLOCK_REWARD.toHexString());
  const voteManager = await VoteManager.deploy();
  const schellingCoin = await SchellingCoin.deploy();
  const faucet = await Faucet.deploy(schellingCoin.address);

  await parameters.deployed();
  await blockManager.deployed();
  await delegator.deployed();
  await faucet.deployed();
  await jobManager.deployed();
  await schellingCoin.deployed();
  await stakeManager.deployed();
  await voteManager.deployed();

  const initializeContracts = async () => [
    blockManager.initialize(stakeManager.address, voteManager.address, jobManager.address, parameters.address),
    voteManager.initialize(stakeManager.address, blockManager.address, parameters.address),
    stakeManager.initialize(schellingCoin.address, voteManager.address, blockManager.address, parameters.address),

    jobManager.grantRole(await parameters.getJobConfirmerHash(), blockManager.address),
    blockManager.grantRole(await parameters.getBlockConfirmerHash(), voteManager.address),
    stakeManager.grantRole(await parameters.getStakeModifierHash(), blockManager.address),
    stakeManager.grantRole(await parameters.getStakeModifierHash(), voteManager.address),
    stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), voteManager.address),

    delegator.upgradeDelegate(jobManager.address),
  ];

  return {
    blockManager,
    parameters,
    delegator,
    faucet,
    jobManager,
    random,
    schellingCoin,
    stakeManager,
    structs,
    voteManager,
    initializeContracts,
  };
};

module.exports = {
  setupContracts,
};
