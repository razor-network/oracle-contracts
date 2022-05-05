const hre = require('hardhat');
const { updateDeploymentFile } = require('../migrations/migrationHelpers');

module.exports = async () => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer } = namedAccounts;
  const deployResult = await deploy('RandomNoManager', {
    from: deployer,
    skipIfAlreadyDeployed: false,
  });
  log(
    `RandomNoManager deployed at ${deployResult.address} by owner ${deployer} 
    using ${deployResult.receipt.gasUsed} gas with tx hash ${deployResult.transactionHash} deployResult.newlyDeployed: ${deployResult.newlyDeployed}`
  );
  await updateDeploymentFile('RandomNoManager');
};
module.exports.tags = ['RandomNoManager'];
