const { deployContract } = require('../migrationHelpers');

const deployVoteManager = async () => {
  await deployContract('VoteManager', ['Random']);
};

module.exports = async () => {
  await deployVoteManager();
};
