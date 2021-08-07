const { BigNumber } = ethers;
const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));
const {
  BLOCK_CONFIRMER_ROLE,
  STAKER_ACTIVITY_UPDATER_ROLE,
  STAKE_MODIFIER_ROLE,
  REWARD_MODIFIER_ROLE,
  ASSET_CONFIRMER_ROLE,
} = require('./constants');

const setupContracts = async () => {
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
  const RAZOR = await ethers.getContractFactory('RAZOR');
  const StakeManager = await ethers.getContractFactory('StakeManager');
  const RewardManager = await ethers.getContractFactory('RewardManager');
  const VoteManager = await ethers.getContractFactory('VoteManager');

  const parameters = await Parameters.deploy();
  const blockManager = await BlockManager.deploy();
  const stakedToken = await ethers.getContractFactory('StakedToken');
  const delegator = await Delegator.deploy();
  const assetManager = await AssetManager.deploy(parameters.address);
  const stakeManager = await StakeManager.deploy();
  const rewardManager = await RewardManager.deploy();
  const voteManager = await VoteManager.deploy();
  const razor = await RAZOR.deploy(initialSupply);
  const faucet = await Faucet.deploy(razor.address);

  await parameters.deployed();
  await blockManager.deployed();
  await delegator.deployed();
  await faucet.deployed();
  await assetManager.deployed();
  await razor.deployed();
  await stakeManager.deployed();
  await rewardManager.deployed();
  await voteManager.deployed();

  const initializeContracts = async () => [
    blockManager.initialize(stakeManager.address, rewardManager.address, voteManager.address, assetManager.address, parameters.address),
    voteManager.initialize(stakeManager.address, rewardManager.address, blockManager.address, parameters.address),
    stakeManager.initialize(razor.address, rewardManager.address, voteManager.address, parameters.address),
    rewardManager.initialize(stakeManager.address, voteManager.address, blockManager.address, parameters.address),
    assetManager.grantRole(ASSET_CONFIRMER_ROLE, blockManager.address),
    blockManager.grantRole(BLOCK_CONFIRMER_ROLE, voteManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, blockManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, voteManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, stakeManager.address),
    stakeManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, voteManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, rewardManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, blockManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, voteManager.address),

    delegator.upgradeDelegate(assetManager.address),
  ];

  return {
    blockManager,
    parameters,
    delegator,
    faucet,
    assetManager,
    random,
    razor,
    stakeManager,
    rewardManager,
    voteManager,
    initializeContracts,
    stakedToken,
  };
};

module.exports = {
  setupContracts,
};
