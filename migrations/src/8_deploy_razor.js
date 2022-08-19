const { NETWORK, RAZOR_ADDRESS } = process.env;
const {
  deployContract,
  appendDeploymentFile,
  readOldDeploymentFile,
} = require('../migrationHelpers');

const { BigNumber } = ethers;
const initialSupply = (BigNumber.from(10).pow(BigNumber.from(27)));
const deployRAZOR = async () => {
  if (NETWORK !== 'mainnet' && RAZOR_ADDRESS === '') {
    await deployContract('RAZOR', [], [initialSupply]);
  } else {
    const RAZOR = RAZOR_ADDRESS;

    // eslint-disable-next-line no-console
    console.log('Re-using Razor instance deployed at', RAZOR);
    await appendDeploymentFile({ RAZOR });
  }
};

module.exports = async () => {
  await deployRAZOR();
};
