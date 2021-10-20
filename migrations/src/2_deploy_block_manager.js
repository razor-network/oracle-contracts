const { deployContract } = require('../migrationHelpers');

const deployBlockManager = async () => {
  await deployContract('BlockManager');
};

module.exports = async () => {
  await deployBlockManager();
};
