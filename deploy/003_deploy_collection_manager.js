const { deployHHContract } = require('../migrations/migrationHelpers');

const deployCollectionManager = async () => {
  await deployHHContract('CollectionManager');
};

module.exports = async () => {
  await deployCollectionManager();
};
module.exports.tags = ['CollectionManager'];
