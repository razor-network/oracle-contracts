const { deployHHContract } = require('../migrations/migrationHelpers');

const deployRandomNoManager = async () => {
  await deployHHContract('RandomNoManager');
};

module.exports = async () => {
  await deployRandomNoManager();
};
module.exports.tags = ['RandomNoManager'];
