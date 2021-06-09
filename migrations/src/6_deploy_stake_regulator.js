const { BigNumber } = require('ethers');
const { deployContract } = require('../migrationHelpers');

// Edit it as per deployment chain
const blockReward = BigNumber.from(40).mul((BigNumber.from(10).pow(BigNumber.from(18))));

const deployStakeRegulator = async () => {
  await deployContract('StakeRegulator', [], [blockReward.toHexString()]);
};

module.exports = async () => {
  await deployStakeRegulator();
};
