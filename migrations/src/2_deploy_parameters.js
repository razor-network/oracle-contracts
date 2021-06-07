const { deployContract } = require('../migrationHelpers');

const deployParameters = async () => {
  await deployContract('Parameters');
};

module.exports = async () => {
  await deployParameters();
};
