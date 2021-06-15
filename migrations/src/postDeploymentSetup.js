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
  const {
    Random: randomAddress,
    Parameters: parametersAddress,
    BlockManager: blockManagerAddress,
    AssetManager: assetManagerAddress,
    StakeManager: stakeManagerAddress,
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
  const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress);
  const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
  const { contractInstance: RAZOR } = await getdeployedContractInstance('RAZOR', RAZORAddress);

  const pendingTransactions = [];
  const stakerAddressList = STAKER_ADDRESSES.split(',');

  // Only transfer tokens in testnets
  if (NETWORK !== 'mainnet') {
    // Add new instance of StakeManager contract & Deployer address as Minter

    const mintableSupply = (BigNumber.from(10).pow(BigNumber.from(26))).mul(BigNumber.from(6));

    await RAZOR.transfer(stakeManagerAddress, mintableSupply);

    for (let i = 0; i < stakerAddressList.length; i++) {
      const tx = await RAZOR.transfer(stakerAddressList[i], SEED_AMOUNT);
      pendingTransactions.push(tx);
    }
    pendingTransactions.push(await RAZOR.transfer(faucetAddress, SEED_AMOUNT));
  }

  pendingTransactions.push(await blockManager.initialize(stakeManagerAddress, voteManagerAddress, assetManagerAddress, parametersAddress));
  pendingTransactions.push(await voteManager.initialize(stakeManagerAddress, blockManagerAddress, parametersAddress));
  pendingTransactions.push(await stakeManager.initialize(RAZORAddress, voteManagerAddress, blockManagerAddress, parametersAddress));

  pendingTransactions.push(await assetManager.grantRole(await parameters.getAssetConfirmerHash(), blockManagerAddress));
  pendingTransactions.push(await blockManager.grantRole(await parameters.getBlockConfirmerHash(), voteManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(await parameters.getStakeModifierHash(), blockManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(await parameters.getStakeModifierHash(), voteManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), voteManagerAddress));

  pendingTransactions.push(await delegator.upgradeDelegate(assetManagerAddress));

  // eslint-disable-next-line no-console
  console.log('Waiting for post-deployment setup transactions to get confirmed');
  for (let i = 0; i < pendingTransactions.length; i++) {
    pendingTransactions[i].wait();
  }

  // eslint-disable-next-line no-console
  console.log('Contracts deployed successfully & initial setup is done');
};
