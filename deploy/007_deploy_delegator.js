const { deployContractHH, readOldDeploymentFile, appendDeploymentFile } = require('../migrations/migrationHelpers');

const { DELEGATOR_ADDRESS } = process.env;

const deployDelegator = async () => {
  if (DELEGATOR_ADDRESS === '' || !DELEGATOR_ADDRESS) {
    await deployContractHH('Delegator');
  } else {
    const { Delegator } = await readOldDeploymentFile();

    if (DELEGATOR_ADDRESS !== Delegator) {
      throw Error('Delegator instance address is different than what was deployed previously');
    }
    // eslint-disable-next-line no-console
    console.log('Re-using Delegator instance deployed at', Delegator);
    await appendDeploymentFile({ Delegator });
  }
};

module.exports = async () => {
  await deployDelegator();
};
module.exports.tags = ['Delegator'];
