const { deployContract } = require('../migrationHelpers');

const deployVoteManager = async () => {
  await deployContract('VoteManager', ['Constants']);
};


module.exports = async () => {
  await deployVoteManager();
};
