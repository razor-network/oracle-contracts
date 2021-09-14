const {
  getdeployedContractInstance,
  readDeploymentFile,
} = require('../migrationHelpers');

const { BigNumber } = ethers;
const {
  NETWORK,
  SEED_AMOUNT,
  STAKER_ADDRESSES,
} = process.env;

module.exports = async () => {
  const signers = await ethers.getSigners();

  const {
    Random: randomAddress,
    Parameters: parametersAddress,
    BlockManager: blockManagerAddress,
    AssetManager: assetManagerAddress,
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

  // keccak256("ASSET_CONFIRMER_ROLE")
  const ASSET_CONFIRMER_ROLE = '0xed202a1bc048f9b31cb3937bc52e7c8fe76413f0674b9146ff4bcc15612ccbc2';

  // keccak256("STAKER_ACTIVITY_UPDATER_ROLE")
  const STAKER_ACTIVITY_UPDATER_ROLE = '0x4cd3070aaa07d03ab33731cbabd0cb27eb9e074a9430ad006c96941d71b77ece';

  // keccak256("STAKE_MODIFIER_ROLE")
  const STAKE_MODIFIER_ROLE = '0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804';

  // keccak256("REWARD_MODIFIER_ROLE")
  const REWARD_MODIFIER_ROLE = '0xcabcaf259dd9a27f23bd8a92bacd65983c2ebf027c853f89f941715905271a8d';

  // keccak256("ASSET_MODIFIER_ROLE")
  const ASSET_MODIFIER_ROLE = '0xca0fffcc0404933256f3ec63d47233fbb05be25fc0eacc2cfb1a2853993fbbe4';

  // keccak256("VOTE_MODIFIER_ROLE")
  const VOTE_MODIFIER_ROLE = '0xca0fffcc0404933256f3ec63d47233fbb05be25fc0eacc2cfb1a2853993fbbe5';

  // keccak256("DELEGATOR_MODIFIER_ROLE")
  const DELEGATOR_MODIFIER_ROLE = '0x6b7da7a33355c6e035439beb2ac6a052f1558db73f08690b1c9ef5a4e8389597';

  const randomLibraryDependency = { Random: randomAddress };

  const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress, randomLibraryDependency);
  const { contractInstance: assetManager } = await getdeployedContractInstance('AssetManager', assetManagerAddress);
  const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress);
  const { contractInstance: rewardManager } = await getdeployedContractInstance('RewardManager', rewardManagerAddress);
  const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress);
  const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
  const { contractInstance: RAZOR } = await getdeployedContractInstance('RAZOR', RAZORAddress);
  const { contractInstance: randomNoManager } = await getdeployedContractInstance('RandomNoManager', randomNoManagerAddress, randomLibraryDependency);

  const pendingTransactions = [];
  const stakerAddressList = STAKER_ADDRESSES.split(',');

  // Only transfer tokens in testnets
  if (NETWORK !== 'mainnet') {
    // Add new instance of StakeManager contract & Deployer address as Minter

    const supply = (BigNumber.from(10).pow(BigNumber.from(23))).mul(BigNumber.from(5));

    await RAZOR.transfer(stakeManagerAddress, supply);

    for (let i = 0; i < stakerAddressList.length; i++) {
      const tx = await RAZOR.transfer(stakerAddressList[i], SEED_AMOUNT);
      pendingTransactions.push(tx);
    }
  }

  pendingTransactions.push(await blockManager.initialize(stakeManagerAddress, rewardManagerAddress, voteManagerAddress,
    assetManagerAddress, parametersAddress, randomNoManagerAddress));
  pendingTransactions.push(await voteManager.initialize(stakeManagerAddress, rewardManagerAddress, blockManagerAddress, parametersAddress));
  pendingTransactions.push(await stakeManager.initialize(RAZORAddress, rewardManagerAddress, voteManagerAddress, parametersAddress, stakedTokenFactoryAddress));
  pendingTransactions.push(await rewardManager.initialize(stakeManagerAddress, voteManagerAddress, blockManagerAddress, parametersAddress));
  pendingTransactions.push(await delegator.initialize(assetManagerAddress, blockManagerAddress, parametersAddress));
  pendingTransactions.push(await randomNoManager.initialize(blockManagerAddress, parametersAddress));

  pendingTransactions.push(await assetManager.grantRole(ASSET_CONFIRMER_ROLE, blockManagerAddress));
  pendingTransactions.push(await blockManager.grantRole(BLOCK_CONFIRMER_ROLE, voteManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, voteManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, stakeManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, voteManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, rewardManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, voteManagerAddress));
  pendingTransactions.push(await voteManager.grantRole(VOTE_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await assetManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address));
  pendingTransactions.push(await delegator.grantRole(DELEGATOR_MODIFIER_ROLE, assetManagerAddress));
  pendingTransactions.push(await assetManager.upgradeDelegator(delegatorAddress));

  // eslint-disable-next-line no-console
  console.log('Waiting for post-deployment setup transactions to get confirmed');
  for (let i = 0; i < pendingTransactions.length; i++) {
    pendingTransactions[i].wait();
  }

  // eslint-disable-next-line no-console
  console.log('Contracts deployed successfully & initial setup is done');
};
