const { deployContract } = require('../migrationHelpers');

const deployRandomNoManager = async () => {
  await deployContract('RandomNoManager');
};

module.exports = async () => {
  await deployRandomNoManager();
};
