const { deployContractHH, readOldDeploymentFile, appendDeploymentFile } = require('../migrations/migrationHelpers');

const { NETWORK, RAZOR_ADDRESS } = process.env;
const { BigNumber } = ethers;
const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));

const deployRAZOR = async () => {
  if (NETWORK !== 'mainnet' && RAZOR_ADDRESS === '') {
    await deployContractHH('RAZOR', [initialSupply]);
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

module.exports = async () => {
  await deployRAZOR();
};
module.exports.tags = ['RAZOR'];
