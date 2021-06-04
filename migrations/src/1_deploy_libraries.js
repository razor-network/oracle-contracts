const { deployContract } = require('../migrationHelpers');

const deployLibraries = async () => {
  await deployContract('Structs');
  await deployContract('Random');
};

module.exports = async () => {
  await deployLibraries();
};
