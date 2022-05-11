const { deployContractHH } = require('../migrations/migrationHelpers');

const deployCollectionManager = async () => {
  await deployContractHH('CollectionManager');
};

module.exports = async () => {
  await deployCollectionManager();
};
module.exports.tags = ['CollectionManager'];
