const { BigNumber } = ethers;
const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));
const {
  BLOCK_CONFIRMER_ROLE,
  STAKE_MODIFIER_ROLE,
  REWARD_MODIFIER_ROLE,
  REGISTRY_MODIFIER_ROLE,
  GOVERNANCE_ROLE,
  PAUSE_ROLE,
  SALT_MODIFIER_ROLE,
  DEPTH_MODIFIER_ROLE,
  ESCAPE_HATCH_ROLE,
  RESET_DATABOND_ROLE,
  OCCURRENCE_MODIFIER_ROLE,
  COLLECTION_CONFIRMER_ROLE,
  COLLECTION_MODIFIER_ROLE,
} = require('./constants');

const setupContracts = async () => {
  const Governance = await ethers.getContractFactory('Governance');
  const BlockManager = await ethers.getContractFactory('BlockManager');
  const BondManager = await ethers.getContractFactory('BondManager');
  const RandomNoManager = await ethers.getContractFactory('RandomNoManager');
  const Delegator = await ethers.getContractFactory('Delegator');
  const CollectionManager = await ethers.getContractFactory('CollectionManager');
  const RAZOR = await ethers.getContractFactory('RAZOR');
  const StakeManager = await ethers.getContractFactory('StakeManager');
  const RewardManager = await ethers.getContractFactory('RewardManager');
  const VoteManager = await ethers.getContractFactory('VoteManager');
  const StakedTokenFactory = await ethers.getContractFactory('StakedTokenFactory');
  const signers = await ethers.getSigners();

  const governance = await Governance.deploy();
  const blockManager = await BlockManager.deploy();
  const bondManager = await BondManager.deploy();
  const stakedToken = await ethers.getContractFactory('StakedToken');
  const delegator = await Delegator.deploy();
  const collectionManager = await CollectionManager.deploy();
  const stakeManager = await StakeManager.deploy();
  const rewardManager = await RewardManager.deploy();
  const voteManager = await VoteManager.deploy();
  const razor = await RAZOR.deploy(initialSupply);
  const stakedTokenFactory = await StakedTokenFactory.deploy();
  const randomNoManager = await RandomNoManager.deploy();

  await governance.deployed();
  await blockManager.deployed();
  await bondManager.deployed();
  await delegator.deployed();
  await collectionManager.deployed();
  await razor.deployed();
  await stakedTokenFactory.deployed();
  await stakeManager.deployed();
  await rewardManager.deployed();
  await voteManager.deployed();
  await randomNoManager.deployed();

  const initializeContracts = async () => [
    blockManager.initialize(stakeManager.address, rewardManager.address, voteManager.address, collectionManager.address,
      randomNoManager.address),
    voteManager.initialize(stakeManager.address, rewardManager.address, blockManager.address, collectionManager.address),
    stakeManager.initialize(razor.address, rewardManager.address, voteManager.address, stakedTokenFactory.address),
    rewardManager.initialize(stakeManager.address, voteManager.address, blockManager.address, collectionManager.address),
    delegator.updateAddress(collectionManager.address, randomNoManager.address),
    collectionManager.initialize(voteManager.address, bondManager.address),
    randomNoManager.initialize(blockManager.address),
    governance.initialize(blockManager.address, bondManager.address, rewardManager.address, stakeManager.address,
      voteManager.address, collectionManager.address, randomNoManager.address),
    bondManager.initialize(razor.address, collectionManager.address),

    blockManager.grantRole(BLOCK_CONFIRMER_ROLE, voteManager.address),
    bondManager.grantRole(RESET_DATABOND_ROLE, governance.address),
    stakeManager.grantRole(PAUSE_ROLE, signers[0].address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, blockManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, voteManager.address),
    rewardManager.grantRole(REWARD_MODIFIER_ROLE, stakeManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, rewardManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, blockManager.address),
    stakeManager.grantRole(STAKE_MODIFIER_ROLE, voteManager.address),
    stakeManager.grantRole(ESCAPE_HATCH_ROLE, signers[0].address),

    collectionManager.grantRole(REGISTRY_MODIFIER_ROLE, blockManager.address),
    collectionManager.grantRole(COLLECTION_CONFIRMER_ROLE, blockManager.address),
    collectionManager.grantRole(OCCURRENCE_MODIFIER_ROLE, bondManager.address),
    collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, bondManager.address),

    collectionManager.grantRole(GOVERNANCE_ROLE, governance.address),
    blockManager.grantRole(GOVERNANCE_ROLE, governance.address),
    bondManager.grantRole(GOVERNANCE_ROLE, governance.address),
    rewardManager.grantRole(GOVERNANCE_ROLE, governance.address),
    stakeManager.grantRole(GOVERNANCE_ROLE, governance.address),
    voteManager.grantRole(GOVERNANCE_ROLE, governance.address),
    voteManager.grantRole(SALT_MODIFIER_ROLE, blockManager.address),
    voteManager.grantRole(DEPTH_MODIFIER_ROLE, collectionManager.address),
    delegator.grantRole(GOVERNANCE_ROLE, governance.address),
    randomNoManager.grantRole(GOVERNANCE_ROLE, governance.address),
  ];

  return {
    blockManager,
    bondManager,
    governance,
    delegator,
    collectionManager,
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
