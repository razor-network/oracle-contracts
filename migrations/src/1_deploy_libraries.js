const { deployContract } = require('../migrationHelpers')


const deployLibraries = async () => {
  await deployContract('Constants');
  await deployContract('Structs');
  await deployContract('Random', ['Constants']);
};


module.exports = async () => {
  await deployLibraries();
};
