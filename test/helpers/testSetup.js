const { BLOCK_REWARD } = require('./constants');

const setupContracts = async () => {
  const Constants = await ethers.getContractFactory('Constants');
  const constants = await Constants.deploy();
  await constants.deployed();

  const Structs = await ethers.getContractFactory('Structs');
  const structs = await Structs.deploy();
  await structs.deployed();

  const Random = await ethers.getContractFactory('Random', {
    libraries: {
      Constants: constants.address,
    },
  });
  const random = await Random.deploy();
  await random.deployed();

  const BlockManager = await ethers.getContractFactory('BlockManager', {
    libraries: {
      Constants: constants.address,
      Random: random.address,
    },
  });
  const Delegator = await ethers.getContractFactory('Delegator');
  const Faucet = await ethers.getContractFactory('Faucet');
  const JobManager = await ethers.getContractFactory('JobManager', {
    libraries: {
      Constants: constants.address,
    },
  });
  const SchellingCoin = await ethers.getContractFactory('SchellingCoin');
  const StakeManager = await ethers.getContractFactory('StakeManager', {
    libraries: {
      Constants: constants.address,
    },
  });
  const StateManager = await ethers.getContractFactory('StateManager', {
    libraries: {
      Constants: constants.address,
    },
  });
  const VoteManager = await ethers.getContractFactory('VoteManager', {
    libraries: {
      Constants: constants.address,
    },
  });

  const blockManager = await BlockManager.deploy();

  const delegator = await Delegator.deploy();
  const jobManager = await JobManager.deploy();
  const stakeManager = await StakeManager.deploy(BLOCK_REWARD.toHexString());
  const stateManager = await StateManager.deploy();
  const voteManager = await VoteManager.deploy();
  const schellingCoin = await SchellingCoin.deploy(stakeManager.address);
  const faucet = await Faucet.deploy(schellingCoin.address);

  await blockManager.deployed();

  await delegator.deployed();
  await faucet.deployed();
  await jobManager.deployed();
  await schellingCoin.deployed();
  await stakeManager.deployed();
  await stateManager.deployed();
  await voteManager.deployed();

  await Promise.all([
    blockManager.init(stakeManager.address, stateManager.address, voteManager.address, jobManager.address),
    voteManager.init(stakeManager.address, stateManager.address, blockManager.address),
    stakeManager.init(schellingCoin.address, voteManager.address, blockManager.address, stateManager.address),
    jobManager.init(stateManager.address),

    jobManager.grantRole(await constants.getJobConfirmerHash(), blockManager.address),
    blockManager.grantRole(await constants.getBlockConfirmerHash(), voteManager.address),
    stakeManager.grantRole(await constants.getStakeModifierHash(), blockManager.address),
    stakeManager.grantRole(await constants.getStakeModifierHash(), voteManager.address),
    stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), voteManager.address),

    delegator.upgradeDelegate(jobManager.address),
  ]);

  return {
    blockManager,
    constants,
    delegator,
    faucet,
    jobManager,
    random,
    schellingCoin,
    stakeManager,
    stateManager,
    structs,
    voteManager,
  };
};

module.exports = {
  setupContracts,
};
