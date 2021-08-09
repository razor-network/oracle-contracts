const { BigNumber } = ethers;
const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));
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
  const RAZOR = await ethers.getContractFactory('RAZOR');
  const StakeManager = await ethers.getContractFactory('StakeManager');
  const RewardManager = await ethers.getContractFactory('RewardManager');
  const VoteManager = await ethers.getContractFactory('VoteManager');
  const StakedTokenFactory = await ethers.getContractFactory('StakedTokenFactory');

  const parameters = await Parameters.deploy();
  const blockManager = await BlockManager.deploy();
  const stakedToken = await ethers.getContractFactory('StakedToken');
  const delegator = await Delegator.deploy();
  const assetManager = await AssetManager.deploy(parameters.address, blockManager.address);
  const stakeManager = await StakeManager.deploy();
  const rewardManager = await RewardManager.deploy();
  const voteManager = await VoteManager.deploy();
  const razor = await RAZOR.deploy(initialSupply);
  const stakedTokenFactory = await StakedTokenFactory.deploy();
  const faucet = await Faucet.deploy(razor.address);

  await parameters.deployed();
  await blockManager.deployed();
  await delegator.deployed();
  await faucet.deployed();
  await assetManager.deployed();
  await razor.deployed();
  await stakedTokenFactory.deployed();
  await stakeManager.deployed();
  await rewardManager.deployed();
  await voteManager.deployed();

  const initializeContracts = async () => [
    blockManager.initialize(stakeManager.address, rewardManager.address, voteManager.address, assetManager.address, parameters.address),
    voteManager.initialize(stakeManager.address, rewardManager.address, blockManager.address, parameters.address),
    stakeManager.initialize(razor.address, rewardManager.address, voteManager.address, parameters.address, stakedTokenFactory.address),
    rewardManager.initialize(stakeManager.address, voteManager.address, blockManager.address, parameters.address),

    assetManager.grantRole(await parameters.getAssetConfirmerHash(), blockManager.address),
    blockManager.grantRole(await parameters.getBlockConfirmerHash(), voteManager.address),
    rewardManager.grantRole(await parameters.getRewardModifierHash(), blockManager.address),
    rewardManager.grantRole(await parameters.getRewardModifierHash(), voteManager.address),
    rewardManager.grantRole(await parameters.getRewardModifierHash(), stakeManager.address),
    stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), voteManager.address),
    stakeManager.grantRole(await parameters.getStakeModifierHash(), rewardManager.address),
    stakeManager.grantRole(await parameters.getStakeModifierHash(), blockManager.address),
    stakeManager.grantRole(await parameters.getStakeModifierHash(), voteManager.address),

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
    structs,
    voteManager,
    initializeContracts,
    stakedToken,
    stakedTokenFactory,
  };
};

module.exports = {
  setupContracts,
};
