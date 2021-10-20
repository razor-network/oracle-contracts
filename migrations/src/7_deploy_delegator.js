const { deployContract } = require('../migrationHelpers');

const deployDelegator = async () => {
  await deployContract('Delegator');
};

module.exports = async () => {
  await deployDelegator();
};
