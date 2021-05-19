const { NETWORK, SCHELLING_COIN_ADDRESS } = process.env;
const {
  deployContract,
  appendDeploymentFile,
  readDeploymentFile,
  readOldDeploymentFile,
} = require('../migrationHelpers');

const deploySchellingCoinAndFaucet = async () => {
  if (NETWORK !== 'mainnet' && SCHELLING_COIN_ADDRESS === '') {
    const { StateManager } = await readDeploymentFile();
    const schellingCoin = await deployContract('SchellingCoin', [], [StateManager]);
    await deployContract('Faucet', [], [schellingCoin.address]);
  } else {
    const { Faucet, SchellingCoin } = await readOldDeploymentFile();

    if (SchellingCoin !== SCHELLING_COIN_ADDRESS) {
      throw Error('Schelling Coin instance address is different than that is deployed previously');
    }

    // eslint-disable-next-line no-console
    console.log('Re-using Schelling Coin instance deployed at', SchellingCoin);
    // eslint-disable-next-line no-console
    console.log('Re-using Faucet instance deployed at', Faucet);

    await appendDeploymentFile({ SchellingCoin });
    await appendDeploymentFile({ Faucet });
  }
};

module.exports = async () => {
  await deploySchellingCoinAndFaucet();
};
