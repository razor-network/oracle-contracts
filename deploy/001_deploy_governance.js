const { deployHHContract } = require('../migrations/migrationHelpers');

const deployGovernance = async () => {
  await deployHHContract('Governance');
};

module.exports = async () => {
  await deployGovernance();
};
module.exports.tags = ['Governance'];
