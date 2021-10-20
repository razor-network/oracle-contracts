const { deployContract, readDeploymentFile } = require('../migrationHelpers');

const deployAssetManager = async () => {
  const { Parameters } = await readDeploymentFile();
  await deployContract('AssetManager', [], [Parameters]);
};

module.exports = async () => {
  await deployAssetManager();
};
