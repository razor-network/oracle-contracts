const { getdeployedContractInstance, readDeploymentFile } = require('../migrationHelpers');

const { SEED_AMOUNT, STAKER_ADDRESSES } = process.env
module.exports = async () => {

  const {
    Constants: constantsAddress,
    Random: randomAddress,
    BlockManager: blockManagerAddress,
    JobManager: jobManagerAddress,
    StakeManager: stakeManagerAddress,
    StateManager: stateManagerAddress,
    VoteManager: voteManagerAddress,
    Delegator: delegatorAddress,
    SchellingCoin: schellingCoinAddress,
    Faucet: faucetAddress,
  } = await readDeploymentFile();

  const constantsDependency = { Constants: constantsAddress };
  const constantsAndRandomDependency = { Constants: constantsAddress, Random: randomAddress };

  const { contractInstance: constants } = await getdeployedContractInstance('Constants', constantsAddress);
  const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress, constantsAndRandomDependency);
  const { contractInstance: jobManager } = await getdeployedContractInstance('JobManager', jobManagerAddress, constantsDependency);
  const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress, constantsDependency);
  const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress, constantsDependency);
  const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
  const { contractInstance: faucet } = await getdeployedContractInstance('Faucet', faucetAddress);
  const { contractInstance: schellingCoin } = await getdeployedContractInstance('SchellingCoin', schellingCoinAddress);

  const promises = [];
  const stakerAddressList = STAKER_ADDRESSES.split(',');

  stakerAddressList.forEach( stakerAddress => {
    promises.push(schellingCoin.transfer(stakerAddress, SEED_AMOUNT));
  })

  promises.push(blockManager.init(stakeManagerAddress, stateManagerAddress, voteManagerAddress, jobManagerAddress));
  promises.push(voteManager.init(stakeManagerAddress, stateManagerAddress, blockManagerAddress));
  promises.push(stakeManager.init(schellingCoinAddress, voteManagerAddress, blockManagerAddress, stateManagerAddress));
  promises.push(jobManager.init(stateManagerAddress));
  promises.push(faucet.init(schellingCoinAddress));

  promises.push(jobManager.grantRole(await constants.getJobConfirmerHash(), blockManagerAddress));
  promises.push(blockManager.grantRole(await constants.getBlockConfirmerHash(), voteManagerAddress));
  promises.push(stakeManager.grantRole(await constants.getStakeModifierHash(), blockManagerAddress));
  promises.push(stakeManager.grantRole(await constants.getStakeModifierHash(), voteManagerAddress));
  promises.push(stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), voteManagerAddress));

  promises.push(delegator.upgradeDelegate(jobManagerAddress));
  promises.push(schellingCoin.transfer(faucetAddress, SEED_AMOUNT));
  
  await Promise.all(promises);
};
