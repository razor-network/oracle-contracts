const { deployContract } = require('../migrationHelpers');

const deployJobManager = async () => {
  await deployContract('AssetManager', ['Constants']);
};

module.exports = async () => {
  await deployAssetManager();
};
