const hre = require('hardhat');
const { updateDeploymentFile, readOldDeploymentFile, appendDeploymentFile } = require('../migrations/migrationHelpers');

const { DELEGATOR_ADDRESS } = process.env;

module.exports = async () => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const namedAccounts = await getNamedAccounts();

  if (DELEGATOR_ADDRESS === '' || !DELEGATOR_ADDRESS) {
    const { deployer } = namedAccounts;
    const deployResult = await deploy('Delegator', {
      from: deployer,
    });
    log(
      `Delegator deployed at ${deployResult.address} by owner ${deployer} 
      using ${deployResult.receipt.gasUsed} gas with tx hash ${deployResult.transactionHash}`
    );
    updateDeploymentFile('Delegator');
  } else {
    const { Delegator } = await readOldDeploymentFile();

    if (DELEGATOR_ADDRESS !== Delegator) {
      throw Error('Delegator instance address is different than what was deployed previously');
    }
    // eslint-disable-next-line no-console
    console.log('Re-using Delegator instance deployed at', Delegator);
    await appendDeploymentFile({ Delegator });
  }
};
module.exports.tags = ['Delegator'];
