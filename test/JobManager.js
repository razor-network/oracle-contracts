/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { setupContracts } = require('./helpers/testSetup');
const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');

describe('JobManager', function () {
  let signers;
  let constants;
  let delegator;
  let jobManager;

  before(async () => {
    ({ constants, delegator, jobManager } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('Delegator', function () {
    it('Admin role should be granted',async () => {

      assert(await jobManager.hasRole(DEFAULT_ADMIN_ROLE_HASH,signers[0].address)===true,"Role was not Granted")

    });
    it('should be able to create Job', async function () {
      const url = 'http://testurl.com';
      const selector = 'selector';
      const name = 'test';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);
      const job = await jobManager.jobs(1);
      assert(job.url === url);
      assert(job.selector === selector);
      assert(job.repeat === repeat);
    });

    it('should be able to get result using proxy', async function () {
      await delegator.upgradeDelegate(jobManager.address);
      assert(await delegator.delegate() === jobManager.address);

      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);
      await jobManager.grantRole(await constants.getJobConfirmerHash(), signers[0].address);
      await jobManager.fulfillJob(2, 222);
    });
  });
});
