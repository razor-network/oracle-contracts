const { deployContractHH } = require('../migrations/migrationHelpers');

const deployGovernance = async () => {
  await deployContractHH('Governance');
};

module.exports = async () => {
  await deployGovernance();
};
module.exports.tags = ['Governance'];
