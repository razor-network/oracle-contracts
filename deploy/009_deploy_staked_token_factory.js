const { deployContractHH } = require('../migrations/migrationHelpers');

const deployStakedTokenFactory = async () => {
  await deployContractHH('StakedTokenFactory');
};

module.exports = async () => {
  await deployStakedTokenFactory();
};
module.exports.tags = ['StakedTokenFactory'];
