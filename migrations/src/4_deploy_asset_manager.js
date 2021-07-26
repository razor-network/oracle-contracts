const { deployContract, readDeploymentFile } = require('../migrationHelpers');

const deployAssetManager = async () => {
  const { Parameters, BlockManager } = await readDeploymentFile();
  await deployContract('AssetManager', [], [Parameters, BlockManager]);
};

module.exports = async () => {
  await deployAssetManager();
};
