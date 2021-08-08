const { deployContract } = require('../migrationHelpers');

const deployStakedTokenFactory = async () => {
    await deployContract('StakedTokenFactory');
};

module.exports = async () => {
    await deployStakedTokenFactory();
};
