const { deployHHContract } = require('../migrations/migrationHelpers');

const deployStakeManager = async () => {
  await deployHHContract('StakeManager');
};

module.exports = async () => {
  await deployStakeManager();
};
module.exports.tags = ['StakeManager'];
