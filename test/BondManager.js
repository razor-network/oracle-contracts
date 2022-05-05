const {
  getEpoch,
  getState,
  tokenAmount,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
} = require('../test/helpers/utils');
const {
    COLLECTION_MODIFIER_ROLE,
    WITHDRAW_LOCK_PERIOD,
    GOVERNER_ROLE,
} = require('../test/helpers/constants');
const {
    mineBlock,
    assertBNEqual,
    assertRevert,
    mineToNextEpoch,
    restoreSnapshot,
    takeSnapshot,
    mineToNextState,
} = require('../test/helpers/testHelpers');
const { setupContracts } = require('../test/helpers/testSetup');
const {
  commit, reveal, calculateMedians, getIdsRevealed
} = require('./helpers/InternalEngine');
const { assert } = require('chai');

describe('BondManager', async () => {
  let signers;
  let snapShotId;
  let blockManager;
  let bondManager;
  let stakeManager;
  let voteManager;
  let initializeContracts;
  let razor;
  let governance;

  let stakes = [];

  before(async () => {
    ({
      blockManager, bondManager, razor, governance, voteManager, collectionManager, stakeManager, initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  beforeEach(async () => {
    snapShotId = await takeSnapshot();
    await Promise.all(await initializeContracts());
    await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
    await governance.grantRole(GOVERNER_ROLE, signers[0].address);

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 9) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    await collectionManager.createMulJob(jobs);

    while (Number(await getState()) !== 4) {
      if (Number(await getState()) === -1) {
        await mineBlock();
      } else {
        await mineToNextState();
      }
    }

    let Cname;
    for (let i = 1; i <= 8; i++) {
      Cname = `Test Collection${String(i)}`;
      await collectionManager.createCollection(500, 3, 1, 1, [i, i + 1], Cname);
    }
    Cname = 'Test Collection9';
    await collectionManager.createCollection(500, 3, 1, 1, [9, 1], Cname);
    
    await mineToNextEpoch();
    const epoch = getEpoch();
    const razors = tokenAmount('443000');

    for(let i = 1; i <= 19; i++) {
      await razor.transfer(signers[i].address, razors);
    }

    await governance.connect(signers[0]).setToAssign(7);

    for(let i = 1; i <= 3; i++) {
      let stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));
      await razor.connect(signers[i]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[i]).stake(epoch, stake);
      stakes.push(stake);
    }
    await collectionManager.revokeRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
    stakes = [];
  });

  it('create a bond', async () => {
    const epoch = await getEpoch();

    const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    const medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    const databond = await bondManager.getDatabond(1);
    const collection = await collectionManager.getCollection(databond.collectionId)
    assertBNEqual(bond, databond.bond, 'invalid amount')
    assert(databond.collectionId === 10);
    assert(databond.bondCreator === signers[4].address);
    assert(databond.epochBondLastUpdatedPerAddress === epoch);
    assert(databond.jobIds.length === 4);
    assert(collection.power === collectionPower);
    assert(collection.tolerance === collectionTolerance);
    assert(collection.name === collectionName);
    assert(collection.occurrence === occurrence);
    for(let i = 0; i < databond.jobIds.length; i++) {
      let job = await collectionManager.getJob(databond.jobIds[i])
      assert(job.power === collectionPower);
      assert(job.url === url);
      assert(job.name === `test${i}`);
      assert(job.weight === weight);
      assert(job.selector === selector);
    }
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created')
  });

  it('set result and deactivate collection if not to be reported next epoch', async () => {
    let epoch = await getEpoch();

    let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created')

    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    const databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId)

    while(collection.result === 0) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
      collection = await collectionManager.getCollection(databond.collectionId)
    }

    assert(collection.result === 1000)
    assert(collection.active === false);
    const numActiveCollections = await collectionManager.numActiveCollections();
    assertBNEqual(numActiveCollections, toBigNumber('9'), 'collection not activated');

    await mineToNextEpoch();
    epoch = await getEpoch();
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    medians = await calculateMedians(collectionManager);
    blockConfirmer = 0;
    blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }
    await mineToNextState();
    await mineToNextState();

    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
  });

  it('activate collection when it is to be reported next epoch', async () => {
    let epoch = await getEpoch();

    let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    const databond = await bondManager.getDatabond(1);
  
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    let collection = await collectionManager.getCollection(databond.collectionId)
    while(collection.result === 0) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
      collection = await collectionManager.getCollection(databond.collectionId)
    }

    for(let j = 1; j < collection.occurrence; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
      collection = await collectionManager.getCollection(databond.collectionId)
    }

    assert(collection.active === true);
    const numActiveCollections = await collectionManager.numActiveCollections();
    assertBNEqual(numActiveCollections, toBigNumber('10'), 'collection not activated');
  });

  it('update databond job', async () => {
    let epoch = await getEpoch();

    let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();

    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    const databond = await bondManager.getDatabond(1);
  
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for(let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    }

    const newUrl = 'http://testurl5.com';
    const newSelector = 'selector5';
    const newSelectorType = 1;
    const newPower = -6;
    const newWeight = 90;
    await bondManager.connect(signers[4]).updateDataBondJob(databond.id, 0, newWeight, newPower, newSelectorType, newSelector, newUrl);
    let job = await collectionManager.getJob(databond.jobIds[0])
    assert(job.power === newPower);
    assert(job.url === newUrl);
    assert(job.weight === newWeight);
    assert(job.selector === newSelector);
    assert(job.selectorType === newSelectorType);
  });

  it('update databond collection and by changing number of jobIds, occurrence should update', async () => {
    let epoch = await getEpoch();

    let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();

    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    let databond = await bondManager.getDatabond(1);
  
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for(let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    }

    const newAggregation = 1;
    const newPower = -6;
    const newTolerance = 90;
    const jobIds = [1,2,3];
    await bondManager.connect(signers[4]).updateDataBondCollection(databond.id, databond.collectionId, newTolerance, newAggregation, newPower, jobIds);
    let collection = await collectionManager.getCollection(databond.collectionId)
    databond = await bondManager.getDatabond(1);
    assert(collection.power === newPower);
    assert(collection.tolerance === newTolerance);
    assert(collection.aggregationMethod === newAggregation);
    assert(collection.jobIDs.length === jobIds.length);
    assert(databond.jobIds.length === jobIds.length);
    const newOccurrence = Math.floor((jobDeposit.mul(toBigNumber(jobIds.length))).div(databond.bond));

    await mineToNextEpoch();

    epoch = await getEpoch();
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    medians = await calculateMedians(collectionManager);
    blockConfirmer = 0;
    blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }
    await mineToNextState();
    await mineToNextState();
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward();

    collection = await collectionManager.getCollection(databond.collectionId)
    assert(collection.occurrence === newOccurrence);
  });

  it('add jobs to databond collection and by changing number of jobIds, occurrence should update', async () => {
    let epoch = await getEpoch();

    let secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();

    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    let databond = await bondManager.getDatabond(1);
  
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for(let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    }
    jobs = [];
    
    while (i < 6) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const newAggregation = 1;
    const newPower = -6;
    const newTolerance = 90;
    await bondManager.connect(signers[4]).addJobsToCollection(databond.id, jobs, newPower, newTolerance, newAggregation);
    let collection = await collectionManager.getCollection(databond.collectionId)
    databond = await bondManager.getDatabond(1);
    assert(collection.power === newPower);
    assert(collection.tolerance === newTolerance);
    assert(collection.aggregationMethod === newAggregation);
    assert(collection.jobIDs.length === 6);
    assert(databond.jobIds.length === 6);
    const newOccurrence = Math.floor((jobDeposit.mul(toBigNumber('6'))).div(databond.bond));

    await mineToNextEpoch();

    epoch = await getEpoch();
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    medians = await calculateMedians(collectionManager);
    blockConfirmer = 0;
    blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }
    await mineToNextState();
    await mineToNextState();
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward();

    collection = await collectionManager.getCollection(databond.collectionId)
    assert(collection.occurrence === newOccurrence);
  });

  it('add bond to a databond', async () => {
    let epoch = await getEpoch();

    const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    let databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId)
    
    while(collection.result === 0) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
      collection = await collectionManager.getCollection(databond.collectionId)
    }

    const bondAdded = tokenAmount('500000')
    await razor.transfer(signers[4].address, bondAdded);
    await razor.connect(signers[4]).approve(bondManager.address, bondAdded);
    await bondManager.connect(signers[4]).addBond(databond.id, bondAdded);
    databond = await bondManager.getDatabond(1);
    assertBNEqual(databond.bond, bondAdded.add(tokenAmount('443000')))
    const newOccurrence = Math.floor((jobDeposit.mul(toBigNumber(databond.jobIds.length))).div(databond.bond));

    await mineToNextEpoch();

    epoch = await getEpoch();
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    medians = await calculateMedians(collectionManager);
    blockConfirmer = 0;
    blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }
    await mineToNextState();
    await mineToNextState();
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward();

    collection = await collectionManager.getCollection(databond.collectionId)
    assert(collection.occurrence === newOccurrence);
  });

  it('change the status of a bond', async () => {
    let epoch = await getEpoch();

    const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    let databond = await bondManager.getDatabond(1);

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for(let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    }

    await bondManager.connect(signers[4]).setDatabondStatus(false, databond.id);
    databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId)
    let databondArray = await bondManager.getDatabondCollections();
    assert(databond.active === false);
    assert(collection.active === false);
    assert(databondArray.length === 0);

    for(let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    }

    await bondManager.connect(signers[4]).setDatabondStatus(true, databond.id);
    databond = await bondManager.getDatabond(1);
    collection = await collectionManager.getCollection(databond.collectionId)
    databondArray = await bondManager.getDatabondCollections();
    assert(databond.active === true);
    assert(collection.active === true);
    assert(databondArray.length === 1);
  });

  it('partially unstake and withdraw bond from databond', async () => {
    let epoch = await getEpoch();

    const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    let databond = await bondManager.getDatabond(1);

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for(let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    }

    const bondUnstaked = tokenAmount('200000')
    databond = await bondManager.getDatabond(1);
    const prevBond = databond.bond;
    await bondManager.connect(signers[4]).unstakeBond(databond.id, bondUnstaked);
    databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId)
    let databondArray = await bondManager.getDatabondCollections();
    const bondLock = await bondManager.bondLocks(databond.id, signers[4].address);
    assertBNEqual(databond.bond, prevBond.sub(bondUnstaked), 'invalid amount of razors unstaked')
    assert(databond.active === true);
    assert(databondArray.length === 1);
    assertBNEqual(bondLock.amount, bondUnstaked, 'invalid amount locked');
    assertBNEqual(bondLock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'invalid lock')

    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const prevRazorBalance = await razor.balanceOf(signers[4].address);

    await bondManager.connect(signers[4]).withdrawBond(databond.id);
    const newRazorBalance = await razor.balanceOf(signers[4].address);

    assertBNEqual(newRazorBalance, prevRazorBalance.add(bondUnstaked),'incorrect withdraw');
  });

  it('fully unstake and withdraw bond from databond', async () => {
    let epoch = await getEpoch();

    const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
    for(let i = 1; i <= 3; i++) {
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); //reveal
    for(let i = 1; i <= 3; i++) {
      await reveal(signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); //propose
    let medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration
    for(let i = 1; i <= 3; i++) {
      let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if(blockConfirmer === 0){
        blockConfirmer = i;
        blockIteration = iteration;
      }
      else if (blockIteration > iteration) {
        blockConfirmer = i;
        blockIteration = iteration;
      }
      const idsRevealed = await getIdsRevealed(collectionManager);
      await blockManager.connect(signers[i]).propose(epoch,
        idsRevealed,
        medians,
        iteration,
        biggestStakerId);
    }

    await mineToNextState(); //dispute
    await mineToNextState(); //confirm
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward()

    let jobs = [];
    const id = 0;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    let i = 0;
    while (i < 4) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url
      }
      jobs.push(job);
      i++;
    }
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    const collectionPower = -2;
    const collectionTolerance = 100000;
    const collectionAggregation = 1;
    const collectionName = 'databond1';
    await bondManager.connect(signers[4]).createBond(epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName);
    let databond = await bondManager.getDatabond(1);

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for(let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for(let i = 1; i <= 3; i++) {
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); //reveal
      for(let i = 1; i <= 3; i++) {
        await reveal(signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); //propose
      medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration
      for(let i = 1; i <= 3; i++) {
        let staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        let iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if(blockConfirmer === 0){
          blockConfirmer = i;
          blockIteration = iteration;
        }
        else if (blockIteration > iteration) {
          blockConfirmer = i;
          blockIteration = iteration;
        }
        const idsRevealed = await getIdsRevealed(collectionManager);
        await blockManager.connect(signers[i]).propose(epoch,
          idsRevealed,
          medians,
          iteration,
          biggestStakerId);
      }
      await mineToNextState();
      await mineToNextState();

      await blockManager.connect(signers[blockConfirmer]).claimBlockReward()
    }

    databond = await bondManager.getDatabond(1);
    const prevBond = databond.bond;
    await bondManager.connect(signers[4]).unstakeBond(databond.id, databond.bond);
    databond = await bondManager.getDatabond(1);
    let databondArray = await bondManager.getDatabondCollections();
    const bondLock = await bondManager.bondLocks(databond.id, signers[4].address);
    assertBNEqual(databond.bond, toBigNumber('0'), 'invalid amount of razors unstaked')
    assert(databond.active === false);
    assert(databondArray.length === 0);
    assertBNEqual(bondLock.amount, prevBond, 'invalid amount locked');
    assertBNEqual(bondLock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'invalid lock')

    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const prevRazorBalance = await razor.balanceOf(signers[4].address);

    await bondManager.connect(signers[4]).withdrawBond(databond.id);
    const newRazorBalance = await razor.balanceOf(signers[4].address);

    assertBNEqual(newRazorBalance, prevRazorBalance.add(prevBond),'incorrect withdraw');
  });
});