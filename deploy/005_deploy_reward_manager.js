const { deployHHContract } = require('../migrations/migrationHelpers');

const deployRewardManager = async () => {
  await deployHHContract('RewardManager');
};

module.exports = async () => {
  await deployRewardManager();
};
module.exports.tags = ['RewardManager'];
