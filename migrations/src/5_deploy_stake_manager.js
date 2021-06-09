const { BigNumber } = require('ethers');
const { deployContract } = require('../migrationHelpers');

const deployStakeManager = async () => {
  await deployContract('StakeManager', [], []);
};

module.exports = async () => {
  await deployStakeManager();
};
