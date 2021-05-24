const { deployContract, readDeploymentFile } = require('../migrationHelpers');

const deployJobManager = async () => {
  const { StateManager } = await readDeploymentFile();
  await deployContract('JobManager', ['Constants'], [StateManager]);
};

module.exports = async () => {
  await deployJobManager();
};
