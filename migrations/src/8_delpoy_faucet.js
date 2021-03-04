const { deployContract } = require('../migrationHelpers');

const deployFaucet = async () => {
  await deployContract('Faucet');
};

module.exports = async () => {
  await deployFaucet();
};
