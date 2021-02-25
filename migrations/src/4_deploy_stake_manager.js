const { deployContract } = require('../migrationHelpers');

const deployStakeManager = async () => {
  await deployContract('StakeManager', ['Constants']);
};

module.exports = async () => {
  await deployStakeManager();
};
