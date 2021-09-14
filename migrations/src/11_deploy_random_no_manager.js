const { deployContract } = require('../migrationHelpers');

const deployRandomNoManager = async () => {
  await deployContract('RandomNoManager', ['Random']);
};

module.exports = async () => {
  await deployRandomNoManager();
};
