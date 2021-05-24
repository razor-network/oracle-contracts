const { deployContract } = require('../migrationHelpers');

const deployStateManager = async () => {
  await deployContract('StateManager', ['Constants']);
};

module.exports = async () => {
  await deployStateManager();
};
