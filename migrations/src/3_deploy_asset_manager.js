const { deployContract } = require('../migrationHelpers');

const deployAssetManager = async () => {
  await deployContract('AssetManager', ['Constants']);
};

module.exports = async () => {
  await deployAssetManager();
};
