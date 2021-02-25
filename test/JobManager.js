/* TODO:
test same vote values, stakes
test penalizeEpochs */

const { setupContracts } = require('./helpers/testHelpers');
// const jobManagerBuild = require('../build/contracts/JobManager.json');

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
      // console.log('addy', delegator.address)
      //
      // const proxy = new web3.eth.Contract(jobManagerBuild.abi, delegator.address,
      //   {
      //     gas: 5000000,
      //     gasPrice: 2000000000,
      //   });

      const url = 'http://testurl.com/2';
      const selector = 'selector/2';
      const name = 'test2';
      const repeat = true;
      await jobManager.createJob(url, selector, name, repeat);
      await jobManager.grantRole(await constants.getJobConfirmerHash(), signers[0].address);
      await jobManager.fulfillJob(2, 222);
      // function fulfillJob(uint256 jobId, uint256 value) external onlyWriter {

      // let url = 'http://testurl.com'
      // let selector = 'selector'
      // let repeat = true
      // await proxy.methods.createJob(url, selector, repeat).send({ from: accounts[0]})
      // let job = await proxy.methods.numJobs().call()
      // console.log(job)
      // const job2 = await proxy.methods.getResult(2).call();
      // assert(job.url === url)
      // assert(job.selector === selector)
      // assert(job.repeat === repeat)
      // function createJob (string calldata url, string calldata selector, bool repeat) external payable {
    });
  });
});
