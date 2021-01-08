/* global contract, it, artifacts, assert, web3 */
/* jshint esversion: 8 */

// // TODO:
// // test same vote values, stakes
// test penalizeEpochs
const { assertRevert } = require('./helpers/assertRevert')
let functions = require('./helpers/functions')
// let BlockManager = artifacts.require('./BlockManager.sol')
let JobManager = artifacts.require('./JobManager.sol')
let Delegator = artifacts.require('./Delegator.sol')
var Constants = artifacts.require('./lib/Constants.sol')

let jobManagerBuild = require('../build/contracts/JobManager.json')
let delegatorBuild = require('../build/contracts/Delegator.json')
// let StakeManager = artifacts.require('./StakeManager.sol')
let StateManager = artifacts.require('./StateManager.sol')
// let VoteManager = artifacts.require('./VoteManager.sol')
// let SchellingCoin = artifacts.require('./SchellingCoin.sol')
// let Random = artifacts.require('./lib/Random.sol')
// let Web3 = require('web3')
// let merkle = require('@razor-network/merkle')

// let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
// let numBlocks = 10

contract('JobManager', function (accounts) {
  contract('Delegator', function (accounts) {
    // contract('SchellingCoin', async function () {
    // let blockManager = await BlockManager.deployed()
    // let voteManager = await VoteManager.deployed()
    // let stakeManager = await StakeManager.deployed()

    it('should be able to create Job', async function () {
      // let stakeManager = await StakeManager.deployed()
      let jobManager = await JobManager.deployed()
      let url = 'http://testurl.com'
      let selector = 'selector'
      let name = 'test'
      let repeat = true
      await jobManager.createJob(url, selector, name, repeat)
      let job = await jobManager.jobs(1)
      assert(job.url === url)
      assert(job.selector === selector)
      assert(job.repeat === repeat)
      // function createJob (string calldata url, string calldata selector, bool repeat) external payable {

    })

    it('should be able to get result using proxy', async function () {
      let constants = await Constants.deployed()
      // let stakeManager = await StakeManager.deployed()
      let jobManager = await JobManager.deployed()
      let delegator = await Delegator.deployed()
      await delegator.upgradeDelegate(jobManager.address)
      assert(await delegator.delegate() === jobManager.address)
      // console.log('addy', delegator.address)
      //
      let proxy = new web3.eth.Contract(jobManagerBuild['abi'], delegator.address,
        {
          gas: 5000000,
          gasPrice: 2000000000
        })

      let url = 'http://testurl.com/2'
      let selector = 'selector/2'
      let name = 'test2'
      let repeat = true
      await jobManager.createJob(url, selector, name, repeat)
      console.log(Number(await jobManager.numJobs()))
      await jobManager.grantRole(await constants.getJobConfirmerHash(), accounts[0])
      await jobManager.fulfillJob(2, 222)
      // function fulfillJob(uint256 jobId, uint256 value) external onlyWriter {

      // let url = 'http://testurl.com'
      // let selector = 'selector'
      // let repeat = true
      // await proxy.methods.createJob(url, selector, repeat).send({ from: accounts[0]})
      // let job = await proxy.methods.numJobs().call()
      // console.log(job)
      let job2 = await proxy.methods.getResult(2).call()
      console.log(job2)
      // assert(job.url === url)
      // assert(job.selector === selector)
      // assert(job.repeat === repeat)
      // function createJob (string calldata url, string calldata selector, bool repeat) external payable {

    })
  })
})
