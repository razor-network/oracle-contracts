const { deployContract } = require('../migrationHelpers');

const deployJobManager = async () => {
  await deployContract('JobManager', ['Constants']);
};


module.exports = async () => {
  await deployJobManager();
};
