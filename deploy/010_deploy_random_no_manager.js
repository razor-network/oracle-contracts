const { deployContractHH } = require('../migrations/migrationHelpers');

const deployRandomNoManager = async () => {
  await deployContractHH('RandomNoManager');
};

module.exports = async () => {
  await deployRandomNoManager();
};
module.exports.tags = ['RandomNoManager'];
