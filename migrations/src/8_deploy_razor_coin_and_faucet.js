const { NETWORK, SCHELLING_COIN_ADDRESS } = process.env;
const {
  deployContract,
  appendDeploymentFile,
  readOldDeploymentFile,
} = require('../migrationHelpers');

const deployRAZORAndFaucet = async () => {
  if (NETWORK !== 'mainnet' && SCHELLING_COIN_ADDRESS === '') {
    const RAZOR = await deployContract('RAZOR', [], []);
    await deployContract('Faucet', [], [RAZOR.address]);
  } else {
    const { Faucet, RAZOR } = await readOldDeploymentFile();

    if (RAZOR !== SCHELLING_COIN_ADDRESS) {
      throw Error('Razor instance address is different than that is deployed previously');
    }

    // eslint-disable-next-line no-console
    console.log('Re-using Razor instance deployed at', RAZOR);
    // eslint-disable-next-line no-console
    console.log('Re-using Faucet instance deployed at', Faucet);

    await appendDeploymentFile({ RAZOR });
    await appendDeploymentFile({ Faucet });
  }
};

module.exports = async () => {
  await deployRAZORAndFaucet();
};
