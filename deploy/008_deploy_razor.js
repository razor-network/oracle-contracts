const hre = require('hardhat');
const { updateDeploymentFile, readOldDeploymentFile, appendDeploymentFile } = require('../migrations/migrationHelpers');

const { NETWORK, RAZOR_ADDRESS } = process.env;
const { BigNumber } = ethers;
const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));

module.exports = async () => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const namedAccounts = await getNamedAccounts();

  if (NETWORK !== 'mainnet' && RAZOR_ADDRESS === '') {
    const { deployer } = namedAccounts;
    const deployResult = await deploy('RAZOR', {
      from: deployer,
      args: [initialSupply],
    });
    log(
      `RAZOR deployed at ${deployResult.address} by owner ${deployer} 
      using ${deployResult.receipt.gasUsed} gas with tx hash ${deployResult.transactionHash}`
    );
    updateDeploymentFile('RAZOR');
  } else {
    const { RAZOR } = await readOldDeploymentFile();

    if (RAZOR !== RAZOR_ADDRESS) {
      throw Error('Razor instance address is different than that is deployed previously');
    }

    // eslint-disable-next-line no-console
    console.log('Re-using Razor instance deployed at', RAZOR);
    await appendDeploymentFile({ RAZOR });
  }
};
module.exports.tags = ['RAZOR'];
