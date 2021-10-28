const { BigNumber } = ethers;
const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));
const {
  BLOCK_CONFIRMER_ROLE,
  STAKER_ACTIVITY_UPDATER_ROLE,
  STAKE_MODIFIER_ROLE,
  REWARD_MODIFIER_ROLE,
  ASSET_CONFIRMER_ROLE,
  DELEGATOR_MODIFIER_ROLE,
  GOVERNANCE_ROLE,
} = require('./constants');

const setupContracts = async () => {
  const Governance = await ethers.getContractFactory('Governance');
  const BlockManager = await ethers.getContractFactory('BlockManager');
  const RandomNoManager = await ethers.getContractFactory('RandomNoManager');
  const Delegator = await ethers.getContractFactory('Delegator');
  const AssetManager = await ethers.getContractFactory('AssetManager');
  const RAZOR = await ethers.getContractFactory('RAZOR');
  const StakeManager = await ethers.getContractFactory('StakeManager');
  const RewardManager = await ethers.getContractFactory('RewardManager');
  const VoteManager = await ethers.getContractFactory('VoteManager');
  const StakedTokenFactory = await ethers.getContractFactory('StakedTokenFactory');

  const governance = await Governance.deploy();
  const blockManager = await BlockManager.deploy();
  const stakedToken = await ethers.getContractFactory('StakedToken');
  const delegator = await Delegator.deploy();
  const assetManager = await AssetManager.deploy();
  const stakeManager = await StakeManager.deploy();
  const rewardManager = await RewardManager.deploy();
  const voteManager = await VoteManager.deploy();
  const razor = await RAZOR.deploy(initialSupply);
  const stakedTokenFactory = await StakedTokenFactory.deploy();
  const randomNoManager = await RandomNoManager.deploy();

  await governance.deployed();
  await blockManager.deployed();
  await delegator.deployed();
  await assetManager.deployed();
  await razor.deployed();
  await stakedTokenFactory.deployed();
  await stakeManager.deployed();
  await rewardManager.deployed();
  await voteManager.deployed();
  await randomNoManager.deployed();

  const initializeContracts = async () => [
    blockManager.initialize(stakeManager.address, rewardManager.address, voteManager.address, assetManager.address,
      randomNoManager.address),
    voteManager.initialize(stakeManager.address, rewardManager.address, blockManager.address),
    stakeManager.initialize(razor.address, rewardManager.address, voteManager.address, stakedTokenFactory.address),
    rewardManager.initialize(stakeManager.address, voteManager.address, blockManager.address),
    delegator.updateAddress(assetManager.address, blockManager.address),
    assetManager.upgradeDelegator(delegator.address),
    randomNoManager.initialize(blockManager.address),
    governance.initialize(blockManager.address, rewardManager.address, stakeManager.address,
      voteManager.address, assetManager.address, delegator.address, randomNoManager.address),

    assetManager.grantRole(ASSET_CONFIRMER_ROLE, blockManager.address),
    blockManager.grantRole(BLOCK_CONFIRMER_ROLE, voteManager.address),
    delegator.grantRole(DELEGATOR_MODIFIER_ROLE, assetManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, blockManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, voteManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, stakeManager.address),
    stakeManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, voteManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, rewardManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, blockManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, voteManager.address),

    assetManager.grantRole(GOVERNANCE_ROLE, governance.address),
    blockManager.grantRole(GOVERNANCE_ROLE, governance.address),
    rewardManager.grantRole(GOVERNANCE_ROLE, governance.address),
    stakeManager.grantRole(GOVERNANCE_ROLE, governance.address),
    voteManager.grantRole(GOVERNANCE_ROLE, governance.address),
    delegator.grantRole(GOVERNANCE_ROLE, governance.address),
    randomNoManager.grantRole(GOVERNANCE_ROLE, governance.address),
  ];

  return {
    blockManager,
    governance,
    delegator,
    assetManager,
    razor,
    stakeManager,
    rewardManager,
    voteManager,
    initializeContracts,
    stakedToken,
    stakedTokenFactory,
    randomNoManager,
  };
};

module.exports = {
  setupContracts,
};
