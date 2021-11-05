const { deployContract } = require('../migrationHelpers');

const deployGovernance = async () => {
  await deployContract('Governance');
};

module.exports = async () => {
  await deployGovernance();
};
