const { deployContractHH } = require('../migrations/migrationHelpers');

const deployVoteManager = async () => {
  await deployContractHH('VoteManager');
};

module.exports = async () => {
  await deployVoteManager();
};
module.exports.tags = ['VoteManager'];
