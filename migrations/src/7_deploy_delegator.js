const { DELEGATOR_ADDRESS } = process.env;

const { deployContract, readOldDeploymentFile, appendDeploymentFile } = require('../migrationHelpers');

const deployDelegator = async () => {
  if (DELEGATOR_ADDRESS === '') {
    await deployContract('Delegator');
  } else {
    const { Delegator } = await readOldDeploymentFile();

    if (DELEGATOR_ADDRESS !== Delegator) {
      throw Error('Delegator instance address is different than that is deployed previously');
    }

    // eslint-disable-next-line no-console
    console.log('Re-using Delegator instance deployed at', Delegator);
    await appendDeploymentFile({ Delegator });
  }
};

module.exports = async () => {
  await deployDelegator();
};
