const { deployContract } = require('../migrationHelpers');

const deployAssetManager = async () => {
  await deployContract('AssetManager');
};

module.exports = async () => {
  await deployAssetManager();
};
