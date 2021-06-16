const { BigNumber } = require('ethers');
const { deployContract } = require('../migrationHelpers');

// Edit it as per deployment chain
const blockReward = BigNumber.from(40).mul((BigNumber.from(10).pow(BigNumber.from(18))));

const deployStakeManager = async () => {
  await deployContract('StakeManager', [], [blockReward.toHexString()]);
};

module.exports = async () => {
  await deployStakeManager();
};
