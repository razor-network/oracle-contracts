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
  const AssetManager = await ethers.getContractFactory('AssetManager');
  const SchellingCoin = await ethers.getContractFactory('SchellingCoin');
  const StakeManager = await ethers.getContractFactory('StakeManager');
  const StakeRegulator = await ethers.getContractFactory('StakeRegulator');
  const VoteManager = await ethers.getContractFactory('VoteManager');

  const parameters = await Parameters.deploy();
  const blockManager = await BlockManager.deploy();
  const stakedToken = await ethers.getContractFactory('StakedToken');
  const delegator = await Delegator.deploy();
  const assetManager = await AssetManager.deploy(parameters.address);
  const stakeManager = await StakeManager.deploy();
  const stakeRegulator = await StakeRegulator.deploy(BLOCK_REWARD.toHexString());
  const voteManager = await VoteManager.deploy();
  const schellingCoin = await SchellingCoin.deploy();
  const faucet = await Faucet.deploy(schellingCoin.address);

  await parameters.deployed();
  await blockManager.deployed();
  await delegator.deployed();
  await faucet.deployed();
  await assetManager.deployed();
  await schellingCoin.deployed();
  await stakeManager.deployed();
  await stakeRegulator.deployed();
  await voteManager.deployed();

  const initializeContracts = async () => [
    blockManager.initialize(stakeManager.address, stakeRegulator.address, voteManager.address, assetManager.address, parameters.address),
    voteManager.initialize(stakeManager.address, stakeRegulator.address, blockManager.address, parameters.address),
    stakeManager.initialize(schellingCoin.address, stakeRegulator.address, voteManager.address, parameters.address),
    stakeRegulator.initialize(stakeManager.address, voteManager.address, blockManager.address, parameters.address),

    assetManager.grantRole(await parameters.getAssetConfirmerHash(), blockManager.address),
    blockManager.grantRole(await parameters.getBlockConfirmerHash(), voteManager.address),
    stakeRegulator.grantRole(await parameters.getStakeModifierHash(), blockManager.address),
    stakeRegulator.grantRole(await parameters.getStakeModifierHash(), voteManager.address),
    stakeRegulator.grantRole(await parameters.getRewardPoolModifierHash(), stakeManager.address),
    stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), voteManager.address),
    stakeManager.grantRole(await parameters.getStakeRegulatorHash(), stakeRegulator.address),

    delegator.upgradeDelegate(assetManager.address),
  ];

  return {
    blockManager,
    parameters,
    delegator,
    faucet,
    assetManager,
    random,
    schellingCoin,
    stakeManager,
    stakeRegulator,
    structs,
    voteManager,
    initializeContracts,
    stakedToken,
  };
};

module.exports = {
  setupContracts,
};
