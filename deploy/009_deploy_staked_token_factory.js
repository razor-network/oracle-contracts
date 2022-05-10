const { deployHHContract } = require('../migrations/migrationHelpers');

const deployStakedTokenFactory = async () => {
  await deployHHContract('StakedTokenFactory');
};

module.exports = async () => {
  await deployStakedTokenFactory();
};
module.exports.tags = ['StakedTokenFactory'];
