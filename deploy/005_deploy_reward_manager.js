const { deployContractHH } = require('../migrations/migrationHelpers');

const deployRewardManager = async () => {
  await deployContractHH('RewardManager');
};

module.exports = async () => {
  await deployRewardManager();
};
module.exports.tags = ['RewardManager'];
