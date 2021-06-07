const { deployContract } = require('../migrationHelpers');

const deployBlockManager = async () => {
  await deployContract('BlockManager', ['Random']);
};

module.exports = async () => {
  await deployBlockManager();
};
