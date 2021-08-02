const { BigNumber } = require('ethers');
const { deployContract } = require('../migrationHelpers');

const deployRewardManager = async () => {
  await deployContract('RewardManager', [], []);
};

module.exports = async () => {
  await deployRewardManager();
};
