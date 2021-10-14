const { deployContract, readDeploymentFile } = require('../migrationHelpers');

const deployAssetManager = async () => {
  const { Governance } = await readDeploymentFile();
  await deployContract('AssetManager', [], [Governance]);
};

module.exports = async () => {
  await deployAssetManager();
};
