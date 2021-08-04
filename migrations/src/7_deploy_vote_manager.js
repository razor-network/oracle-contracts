const { deployContract } = require('../migrationHelpers');

const deployVoteManager = async () => {
  await deployContract('VoteManager');
};

module.exports = async () => {
  await deployVoteManager();
};
