const { deployHHContract } = require('../migrations/migrationHelpers');

const deployBlockManager = async () => {
  await deployHHContract('BlockManager');
};

module.exports = async () => {
  await deployBlockManager();
};
module.exports.tags = ['BlockManager'];
