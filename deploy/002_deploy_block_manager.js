const { deployContractHH } = require('../migrations/migrationHelpers');

const deployBlockManager = async () => {
  await deployContractHH('BlockManager');
};

module.exports = async () => {
  await deployBlockManager();
};
module.exports.tags = ['BlockManager'];
