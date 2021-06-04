const {
  getdeployedContractInstance,
  readDeploymentFile,
} = require('../migrationHelpers');

const { BigNumber } = ethers;
const {
  NETWORK,
  SCHELLING_COIN_ADDRESS,
  SEED_AMOUNT,
  STAKER_ADDRESSES,
} = process.env;

module.exports = async () => {
  const signers = await ethers.getSigners();

  const {
    Random: randomAddress,
    Parameters: parametersAddress,
    BlockManager: blockManagerAddress,
    JobManager: jobManagerAddress,
    StakeManager: stakeManagerAddress,
    VoteManager: voteManagerAddress,
    Delegator: delegatorAddress,
    SchellingCoin: schellingCoinAddress,
    Faucet: faucetAddress,
  } = await readDeploymentFile();

  const randomLibraryDependency = { Random: randomAddress };

  const { contractInstance: parameters } = await getdeployedContractInstance('Parameters', parametersAddress);
  const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress, randomLibraryDependency);
  const { contractInstance: jobManager } = await getdeployedContractInstance('JobManager', jobManagerAddress);
  const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress);
  const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress);
  const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
  const { contractInstance: schellingCoin } = await getdeployedContractInstance('SchellingCoin', schellingCoinAddress);

  const pendingTransactions = [];
  const stakerAddressList = STAKER_ADDRESSES.split(',');

  // Only transfer tokens in testnets
  if (NETWORK !== 'mainnet') {
    // Add new instance of StakeManager contract & Deployer address as Minter

    const initialSupply = await schellingCoin.INITIAL_SUPPLY();

    const mintableSupply = (BigNumber.from(10).pow(BigNumber.from(26))).mul(BigNumber.from(6));
    const deployerBalance = BigNumber.from(await schellingCoin.balanceOf(signers[0].address));
    const deployerSupply = BigNumber.from(initialSupply).sub(BigNumber.from(deployerBalance));

    if (SCHELLING_COIN_ADDRESS !== '') {
      // if previous instances of Schelling Coin is reused again and again,
      // then initial balance will get depleted, thus intial tokens minting is needed,
      // each time Schelling Coin instance is reused
      await schellingCoin.addMinter(signers[0].address);

      await schellingCoin.mint(signers[0].address, (deployerSupply));

      // Remove previous instance of  Deployer address from Minter
      await schellingCoin.removeMinter(signers[0].address);
    }
    await schellingCoin.transfer(stakeManagerAddress, mintableSupply);

    for (let i = 0; i < stakerAddressList.length; i++) {
      const tx = await schellingCoin.transfer(stakerAddressList[i], SEED_AMOUNT);
      pendingTransactions.push(tx);
    }
    pendingTransactions.push(await schellingCoin.transfer(faucetAddress, SEED_AMOUNT));
  }

  pendingTransactions.push(await blockManager.initialize(stakeManagerAddress, voteManagerAddress, jobManagerAddress, parametersAddress));
  pendingTransactions.push(await voteManager.initialize(stakeManagerAddress, blockManagerAddress, parametersAddress));
  pendingTransactions.push(await stakeManager.initialize(schellingCoinAddress, voteManagerAddress, blockManagerAddress, parametersAddress));

  pendingTransactions.push(await jobManager.grantRole(await parameters.getJobConfirmerHash(), blockManagerAddress));
  pendingTransactions.push(await blockManager.grantRole(await parameters.getBlockConfirmerHash(), voteManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(await parameters.getStakeModifierHash(), blockManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(await parameters.getStakeModifierHash(), voteManagerAddress));
  pendingTransactions.push(await stakeManager.grantRole(await parameters.getStakerActivityUpdaterHash(), voteManagerAddress));

  pendingTransactions.push(await delegator.upgradeDelegate(jobManagerAddress));

  // eslint-disable-next-line no-console
  console.log('Waiting for post-deployment setup transactions to get confirmed');
  for (let i = 0; i < pendingTransactions.length; i++) {
    pendingTransactions[i].wait();
  }

  // eslint-disable-next-line no-console
  console.log('Contracts deployed successfully & initial setup is done');
};
