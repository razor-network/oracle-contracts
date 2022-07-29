const { deployContractHH } = require('../migrations/migrationHelpers');

const deployBondManager = async () => {
  await deployContractHH('BondManager');
};

module.exports = async () => {
  await deployBondManager();
};
module.exports.tags = ['BondManager'];
