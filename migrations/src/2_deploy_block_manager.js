const { deployContract } = require('../migrationHelpers');

const deployBlockManager = async () => {
  await deployContract('BlockManager', ['Constants', 'Random']);
};

module.exports = async () => {
  await deployBlockManager();
};
