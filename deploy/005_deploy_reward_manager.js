const hre = require('hardhat');
const { updateDeploymentFile } = require('../migrations/migrationHelpers');

module.exports = async () => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer } = namedAccounts;
  const deployResult = await deploy('RewardManager', {
    from: deployer,
  });
  log(
    `RewardManager deployed at ${deployResult.address} by owner ${deployer} 
    using ${deployResult.receipt.gasUsed} gas with tx hash ${deployResult.transactionHash}`
  );
  await updateDeploymentFile('RewardManager');
};
module.exports.tags = ['RewardManager'];
