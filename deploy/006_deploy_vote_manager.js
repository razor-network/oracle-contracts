const { deployHHContract } = require('../migrations/migrationHelpers');

const deployVoteManager = async () => {
  await deployHHContract('VoteManager');
};

module.exports = async () => {
  await deployVoteManager();
};
module.exports.tags = ['VoteManager'];
