const { deployContract, readDeploymentFile } = require('../migrationHelpers');

const deploySchellingCoin = async () => {
  const { StakeManager } = await readDeploymentFile();
  await deployContract('SchellingCoin', [], [StakeManager]);
};

module.exports = async () => {
  await deploySchellingCoin();
};
