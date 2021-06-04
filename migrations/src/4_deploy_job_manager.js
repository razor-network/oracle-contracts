const { deployContract, readDeploymentFile } = require('../migrationHelpers');

const deployJobManager = async () => {
  const { Parameters } = await readDeploymentFile();
  await deployContract('JobManager', [], [Parameters]);
};

module.exports = async () => {
  await deployJobManager();
};
