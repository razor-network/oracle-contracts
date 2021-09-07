const { deployContract } = require('../migrationHelpers');

const deployRandaoManager = async () => {
  await deployContract('RandaoManager', ['Random']);
};

module.exports = async () => {
  await deployRandaoManager();
};
