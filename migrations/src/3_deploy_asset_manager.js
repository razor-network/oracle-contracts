const { deployContract, readDeploymentFile } = require('../migrationHelpers');

const deployAssetManager = async () => {
  const { StateManager } = await readDeploymentFile();
  await deployContract('AssetManager', ['Constants'], [StateManager]);
};

module.exports = async () => {
  await deployAssetManager();
};
