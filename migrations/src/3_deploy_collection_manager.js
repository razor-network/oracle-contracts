const { deployContract } = require('../migrationHelpers');

const deployCollectionManager = async () => {
  await deployContract('CollectionManager');
};

module.exports = async () => {
  await deployCollectionManager();
};
