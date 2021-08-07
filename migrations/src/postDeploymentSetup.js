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
    Faucet: faucetAddress,
  } = await readDeploymentFile();

  const randomLibraryDependency = { Random: randomAddress };

  const { contractInstance: parameters } = await getdeployedContractInstance('Parameters', parametersAddress);
  const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress, randomLibraryDependency);
  const { contractInstance: assetManager } = await getdeployedContractInstance('AssetManager', assetManagerAddress);
  const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress);
  const { contractInstance: rewardManager } = await getdeployedContractInstance('RewardManager', rewardManagerAddress);
  const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress);
  const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
  const { contractInstance: RAZOR } = await getdeployedContractInstance('RAZOR', RAZORAddress);

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
    pendingTransactions.push(await RAZOR.transfer(faucetAddress, SEED_AMOUNT));
  }

  pendingTransactions.push(await blockManager.initialize(stakeManagerAddress, rewardManagerAddress, voteManagerAddress,
    assetManagerAddress, parametersAddress));
  pendingTransactions.push(await voteManager.initialize(stakeManagerAddress, rewardManagerAddress, blockManagerAddress, parametersAddress));
  pendingTransactions.push(await stakeManager.initialize(RAZORAddress, rewardManagerAddress, voteManagerAddress, parametersAddress));
  pendingTransactions.push(await rewardManager.initialize(stakeManagerAddress, voteManagerAddress, blockManagerAddress, parametersAddress));

  pendingTransactions.push(await assetManager.grantRole(await constants.ASSET_CONFIRMER_ROLE(), blockManagerAddress));
  pendingTransactions.push(await blockManager.grantRole(BLOCK_CONFIRMER_ROLE, voteManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, voteManagerAddress));
  pendingTransactions.push(await rewardManager.grantRole(REWARD_MODIFIER_ROLE, stakeManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKER_ACTIVITY_UPDATER_ROLE, voteManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, rewardManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, blockManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(STAKE_MODIFIER_ROLE, voteManagerAddress));
  pendingTransactions.push(await voteManager.grantRole(await parameters.getVoteModifierHash(), blockManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(ASSET_MODIFIER_ROLE, signers[0].address));
  pendingTransactions.push(await delegator.upgradeDelegate(assetManagerAddress));

  // eslint-disable-next-line no-console
  console.log('Waiting for post-deployment setup transactions to get confirmed');
  for (let i = 0; i < pendingTransactions.length; i++) {
    pendingTransactions[i].wait();
  }

  // eslint-disable-next-line no-console
  console.log('Contracts deployed successfully & initial setup is done');
};
