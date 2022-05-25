const { deployContractHH } = require('../migrations/migrationHelpers');

const deployStakeManager = async () => {
  await deployContractHH('StakeManager');
};

module.exports = async () => {
  await deployStakeManager();
};
module.exports.tags = ['StakeManager'];
