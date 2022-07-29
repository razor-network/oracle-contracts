const { deployContract } = require('../migrationHelpers');

const deployBondManager = async () => {
  await deployContract('BondManager');
};

module.exports = async () => {
  await deployBondManager();
};
