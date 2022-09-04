const { assert } = require('chai');
const {
  getEpoch,
  getState,
  tokenAmount,
  getBiggestStakeAndId,
  getIteration,
  toBigNumber,
  getSecret,
} = require('./helpers/utils');
const {
  COLLECTION_MODIFIER_ROLE,
  WITHDRAW_LOCK_PERIOD,
  GOVERNER_ROLE,
} = require('./helpers/constants');
const {
  mineBlock,
  assertBNEqual,
  assertRevert,
  mineToNextEpoch,
  restoreSnapshot,
  takeSnapshot,
  mineToNextState,
} = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const {
  commit, reveal, calculateMedians, getIdsRevealed,
} = require('./helpers/InternalEngine');

describe('BondManager', async () => {
  let signers;
  let snapShotId;
  let blockManager;
  let collectionManager;
  let bondManager;
  let stakeManager;
  let voteManager;
  let initializeContracts;
  let razor;
  let governance;

  const stakes = [];
  const databondJobs = [];
  const id = 0;
  const url = 'http://testurl.com';
  const selector = 'selector';
  const selectorType = 0;
  let name;
  const power = -2;
  const weight = 50;
  let i = 9;
  while (i < 18) {
    name = `test${i}`;
    const job = {
      id,
      selectorType,
      weight,
      power,
      name,
      selector,
      url,
    };
    databondJobs.push(job);
    i++;
  }
  const jobs = databondJobs.slice(0, 4);
  const jobs2 = databondJobs.slice(4, 7);
  const jobs3 = databondJobs.slice(7, 9);
  const collectionPower = -2;
  const collectionTolerance = 100000;
  const collectionAggregation = 1;
  const collectionName = 'databond1';

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

    const collJobs = [];
    i = 0;
    while (i < 9) {
      name = `test${i}`;
      const job = {
        id,
        selectorType,
        weight,
        power,
        name,
        selector,
        url,
      };
      collJobs.push(job);
      i++;
    }
    await collectionManager.createMulJob(collJobs);

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

    for (let i = 1; i <= 19; i++) {
      await razor.transfer(signers[i].address, razors);
    }

    await governance.connect(signers[0]).setToAssign(7);

    for (let i = 1; i <= 3; i++) {
      const stake = razors.sub(tokenAmount(Math.floor((Math.random() * 423000))));
      await razor.connect(signers[i]).approve(stakeManager.address, stake);
      await stakeManager.connect(signers[i]).stake(epoch, stake);
      stakes.push(stake);
    }
    await collectionManager.revokeRole(COLLECTION_MODIFIER_ROLE, signers[0].address);

    for (let i = 1; i <= 3; i++) {
      const secret = await getSecret(signers[i]);
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); // reveal
    for (let i = 1; i <= 3; i++) {
      await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); // propose
    const medians = await calculateMedians(collectionManager);
    let blockConfirmer = 0;
    let blockIteration;
    for (let i = 1; i <= 3; i++) {
      const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if (blockConfirmer === 0) {
        blockConfirmer = i;
        blockIteration = iteration;
      } else if (blockIteration > iteration) {
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

    await mineToNextState(); // dispute
    await mineToNextState(); // confirm
    await blockManager.connect(signers[blockConfirmer]).claimBlockReward();
  });

  afterEach(async () => {
    await restoreSnapshot(snapShotId);
  });

  it('create a databond', async () => {
    const epoch = await getEpoch();
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    const databond = await bondManager.getDatabond(1);
    const collection = await collectionManager.getCollection(databond.collectionId);
    assertBNEqual(bond, databond.bond, 'invalid amount');
    assert(databond.collectionId === 10);
    assert(databond.bondCreator === signers[4].address);
    assert(databond.epochBondLastUpdated === epoch);
    assert(databond.jobIds.length === 4);
    assert(collection.power === collectionPower);
    assert(collection.tolerance === collectionTolerance);
    assert(collection.name === collectionName);
    assert(collection.occurrence === occurrence);
    for (let i = 0; i < databond.jobIds.length; i++) {
      const job = await collectionManager.getJob(databond.jobIds[i]);
      assert(job.power === collectionPower);
      assert(job.url === url);
      assert(job.name === `test${databond.jobIds[i] - 1}`);
      assert(job.weight === weight);
      assert(job.selector === selector);
    }
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');
  });

  it('create a databond with desired occurrence > minOccurrence', async () => {
    const epoch = await getEpoch();
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond)) + 10;
    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    const databond = await bondManager.getDatabond(1);
    const collection = await collectionManager.getCollection(databond.collectionId);
    assertBNEqual(bond, databond.bond, 'invalid amount');
    assert(databond.collectionId === 10);
    assert(databond.bondCreator === signers[4].address);
    assert(databond.epochBondLastUpdated === epoch);
    assert(databond.jobIds.length === 4);
    assert(collection.power === collectionPower);
    assert(collection.tolerance === collectionTolerance);
    assert(collection.name === collectionName);
    assert(collection.occurrence === occurrence);
    for (let i = 0; i < databond.jobIds.length; i++) {
      const job = await collectionManager.getJob(databond.jobIds[i]);
      assert(job.power === collectionPower);
      assert(job.url === url);
      assert(job.name === `test${databond.jobIds[i] - 1}`);
      assert(job.weight === weight);
      assert(job.selector === selector);
    }
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');
  });

  it('set result and deactivate collection if not to be reported next epoch', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    const databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId);
    let blockConfirmer = 0;
    let blockIteration;
    while (Number(collection.result) === 0) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
      collection = await collectionManager.getCollection(databond.collectionId);
      if (Number(collection.result) === 0) assert(collection.active === true);
      else assert(collection.active === false);
    }

    assertBNEqual(collection.result, toBigNumber('1000'), 'incorrect result');
    const numActiveCollections = await collectionManager.numActiveCollections();
    assertBNEqual(numActiveCollections, toBigNumber('9'), 'collection not activated');

    await mineToNextEpoch();
    epoch = await getEpoch();
    for (let i = 1; i <= 3; i++) {
      const secret = await getSecret(signers[i]);
      await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
    }
    await mineToNextState(); // reveal
    for (let i = 1; i <= 3; i++) {
      await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
    }
    await mineToNextState(); // propose
    const medians = await calculateMedians(collectionManager);
    blockConfirmer = 0;
    blockIteration;
    for (let i = 1; i <= 3; i++) {
      const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
      const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
      const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
      if (blockConfirmer === 0) {
        blockConfirmer = i;
        blockIteration = iteration;
      } else if (blockIteration > iteration) {
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
  });

  it('activate collection when it is to be reported next epoch', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    const databond = await bondManager.getDatabond(1);

    let collection = await collectionManager.getCollection(databond.collectionId);
    while (Number(collection.result) === 0) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      let blockConfirmer = 0;
      let blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
      collection = await collectionManager.getCollection(databond.collectionId);
      if (Number(collection.result) === 0) {
        assert(collection.active === true);
      } else {
        assert(collection.active === false);
      }
    }
    assertBNEqual(collection.result, toBigNumber('1000'), 'incorrect result');
    assert(collection.active === false);
    let numActiveCollections = await collectionManager.numActiveCollections();
    assertBNEqual(numActiveCollections, toBigNumber('9'), 'collection not activated');

    for (let j = 1; j < collection.occurrence; j++) {
      await mineToNextEpoch();
      epoch = await getEpoch();
      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      let blockConfirmer = 0;
      let blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
      collection = await collectionManager.getCollection(databond.collectionId);
    }

    assert(collection.active === true);
    numActiveCollections = await collectionManager.numActiveCollections();
    assertBNEqual(numActiveCollections, toBigNumber('10'), 'collection not activated');
  });

  it('update databond job', async () => {
    let epoch = await getEpoch();
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');
    const databond = await bondManager.getDatabond(1);
    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      let blockConfirmer = 0;
      let blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
    }

    const newUrl = 'http://testurl5.com';
    const newSelector = 'selector5';
    const newSelectorType = 1;
    const newPower = -6;
    const newWeight = 90;
    await bondManager.connect(signers[4]).updateDataBondJob(databond.id, 0, newWeight, newPower, newSelectorType, newSelector, newUrl);
    const job = await collectionManager.getJob(databond.jobIds[0]);
    assert(job.power === newPower);
    assert(job.url === newUrl);
    assert(job.weight === newWeight);
    assert(job.selector === newSelector);
    assert(job.selectorType === newSelectorType);
  });

  it('update databond collection and by changing number of jobIds, occurrence should update', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    let databond = await bondManager.getDatabond(1);
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');
    const bondUpdation = await bondManager.epochLimitForUpdateBond();
    let blockConfirmer = 0;
    let blockIteration;

    for (let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
    }

    const newAggregation = 1;
    const newPower = -6;
    const newTolerance = 90;
    const jobIds = [1, 2, 3];
    databond = await bondManager.getDatabond(1);
    const newOccurrence = Math.floor((jobDeposit.mul(toBigNumber(jobIds.length))).div(databond.bond)) + 5;
    await bondManager.connect(signers[4]).updateDataBondCollection(
      databond.id, databond.collectionId, newOccurrence, newTolerance, newAggregation, newPower, jobIds
    );
    const collection = await collectionManager.getCollection(databond.collectionId);
    databond = await bondManager.getDatabond(1);
    assert(collection.power === newPower);
    assert(collection.tolerance === newTolerance);
    assert(collection.aggregationMethod === newAggregation);
    assert(collection.jobIDs.length === jobIds.length);
    assert(databond.jobIds.length === jobIds.length);
    assertBNEqual(databond.desiredOccurrence, newOccurrence, 'invalid databond occurrence calculation');
    assertBNEqual(collection.occurrence, newOccurrence, 'invalid collection occurrence calculation');
  });

  it('add jobs to databond collection and by changing number of jobIds, occurrence should update', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    let databond = await bondManager.getDatabond(1);

    const bondUpdation = await bondManager.epochLimitForUpdateBond();
    let blockConfirmer = 0;
    let blockIteration;
    for (let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
    }
    const newJobs = [];
    let i = 4;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    while (i < 6) {
      name = `test${i}`;
      const job = {
        id: 0,
        selectorType,
        weight,
        power,
        name,
        selector,
        url,
      };
      newJobs.push(job);
      i++;
    }
    const newAggregation = 1;
    const newPower = -6;
    const newTolerance = 90;
    let collection = await collectionManager.getCollection(databond.collectionId);
    databond = await bondManager.getDatabond(1);
    const newOccurrence = Math.floor((jobDeposit.mul(toBigNumber('6'))).div(databond.bond)) + 10;
    await bondManager.connect(signers[4]).addJobsToCollection(databond.id, newJobs, newOccurrence, newPower, newTolerance, newAggregation);
    collection = await collectionManager.getCollection(databond.collectionId);
    databond = await bondManager.getDatabond(1);
    assert(collection.power === newPower);
    assert(collection.tolerance === newTolerance);
    assert(collection.aggregationMethod === newAggregation);
    assert(collection.jobIDs.length === 6);
    assert(databond.jobIds.length === 6);
    assertBNEqual(databond.desiredOccurrence, newOccurrence, 'invalid databond occurrence calculation');
    assertBNEqual(collection.occurrence, newOccurrence, 'invalid collection occurrence calculation');
  });

  it('add bond to a databond but not change occurrence', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    let databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId);
    let blockConfirmer = 0;
    let blockIteration;

    while (Number(collection.result) === 0) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
      collection = await collectionManager.getCollection(databond.collectionId);
    }

    const bondAdded = tokenAmount('500000');
    databond = await bondManager.getDatabond(1);
    await razor.transfer(signers[4].address, bondAdded);
    await razor.connect(signers[4]).approve(bondManager.address, bondAdded);
    await bondManager.connect(signers[4]).addBond(databond.id, bondAdded, occurrence);
    databond = await bondManager.getDatabond(1);

    assertBNEqual(databond.bond, bondAdded.add(tokenAmount('443000')));
    assertBNEqual(databond.desiredOccurrence, toBigNumber(occurrence), 'invalid databond occurrence assignment');
    assertBNEqual(collection.occurrence, toBigNumber(occurrence), 'invalid collection occurrence assignment');
  });

  it('add bond to a databond and change occurrence', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    let databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId);
    let blockConfirmer = 0;
    let blockIteration;

    while (Number(collection.result) === 0) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
      collection = await collectionManager.getCollection(databond.collectionId);
    }

    const bondAdded = tokenAmount('500000');
    databond = await bondManager.getDatabond(1);
    const newBond = (databond.bond).add(bondAdded);
    await razor.transfer(signers[4].address, bondAdded);
    await razor.connect(signers[4]).approve(bondManager.address, bondAdded);
    const newOccurrence = Math.floor((jobDeposit.mul(toBigNumber(databond.jobIds.length))).div(newBond));
    await bondManager.connect(signers[4]).addBond(databond.id, bondAdded, newOccurrence);
    databond = await bondManager.getDatabond(1);
    collection = await collectionManager.getCollection(databond.collectionId);

    assertBNEqual(databond.bond, bondAdded.add(tokenAmount('443000')));
    assertBNEqual(databond.desiredOccurrence, toBigNumber(newOccurrence), 'invalid databond occurrence assignment');
    assertBNEqual(collection.occurrence, toBigNumber(newOccurrence), 'invalid collection occurrence assignment');
  });

  it('change the status of a bond', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    let databond = await bondManager.getDatabond(1);

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      let blockConfirmer = 0;
      let blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
    }

    await bondManager.connect(signers[4]).setDatabondStatus(false, databond.id);
    databond = await bondManager.getDatabond(1);
    let collection = await collectionManager.getCollection(databond.collectionId);
    let databondArray = await bondManager.getDatabondCollections();
    assert(databond.active === false);
    assert(collection.active === false);
    assert(databondArray.length === 0);

    for (let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      let blockConfirmer = 0;
      let blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
    }

    await bondManager.connect(signers[4]).setDatabondStatus(true, databond.id);
    databond = await bondManager.getDatabond(1);
    collection = await collectionManager.getCollection(databond.collectionId);
    databondArray = await bondManager.getDatabondCollections();
    assert(databond.active === true);
    assert(databondArray.length === 1);
  });

  it('partially unstake and withdraw bond from databond', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    let databond = await bondManager.getDatabond(1);

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      let blockConfirmer = 0;
      let blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
    }

    const bondUnstaked = tokenAmount('200000');
    databond = await bondManager.getDatabond(1);
    const prevBond = databond.bond;
    await bondManager.connect(signers[4]).unstakeBond(databond.id, bondUnstaked);
    databond = await bondManager.getDatabond(1);
    const databondArray = await bondManager.getDatabondCollections();
    const bondLock = await bondManager.bondLocks(databond.id, signers[4].address);
    assertBNEqual(databond.bond, prevBond.sub(bondUnstaked), 'invalid amount of razors unstaked');
    assert(databond.active === true);
    assert(databondArray.length === 1);
    assertBNEqual(bondLock.amount, bondUnstaked, 'invalid amount locked');
    assertBNEqual(bondLock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'invalid lock');

    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const prevRazorBalance = await razor.balanceOf(signers[4].address);

    await bondManager.connect(signers[4]).withdrawBond(databond.id);
    const newRazorBalance = await razor.balanceOf(signers[4].address);

    assertBNEqual(newRazorBalance, prevRazorBalance.add(bondUnstaked), 'incorrect withdraw');
  });

  it('fully unstake and withdraw bond from databond', async () => {
    let epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('10'), 'databond not created');

    let databond = await bondManager.getDatabond(1);

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let j = 1; j <= bondUpdation; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();

      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      let blockConfirmer = 0;
      let blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
    }

    databond = await bondManager.getDatabond(1);
    const prevBond = databond.bond;
    await bondManager.connect(signers[4]).unstakeBond(databond.id, databond.bond);
    databond = await bondManager.getDatabond(1);
    const databondArray = await bondManager.getDatabondCollections();
    const bondLock = await bondManager.bondLocks(databond.id, signers[4].address);
    assertBNEqual(databond.bond, toBigNumber('0'), 'invalid amount of razors unstaked');
    assert(databond.active === false);
    assert(databondArray.length === 0);
    assertBNEqual(bondLock.amount, prevBond, 'invalid amount locked');
    assertBNEqual(bondLock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'invalid lock');

    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const prevRazorBalance = await razor.balanceOf(signers[4].address);

    await bondManager.connect(signers[4]).withdrawBond(databond.id);
    const newRazorBalance = await razor.balanceOf(signers[4].address);

    assertBNEqual(newRazorBalance, prevRazorBalance.add(prevBond), 'incorrect withdraw');
  });

  it('handling multiple databonds', async () => {
    let epoch = await getEpoch();
    /* ///////////////////////////////////////////////////////////////
                          BOND CREATION
      ////////////////////////////////////////////////////////////// */
    const bonds = [];
    for (let i = 4; i <= 6; i++) {
      const bond = await razor.balanceOf(signers[i].address);
      bonds.push(bond);
    }

    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bonds[0]);
    await razor.connect(signers[5]).approve(bondManager.address, bonds[1]);
    await razor.connect(signers[6]).approve(bondManager.address, bonds[2]);
    const numJobs = [4, 3, 2];
    const occurrences = [];
    for (let i = 0; i <= 2; i++) {
      const occurrence = Math.floor((jobDeposit.mul(toBigNumber(numJobs[i]))).div(bonds[i]));
      occurrences.push(occurrence);
    }

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bonds[0], occurrences[0], collectionPower, collectionTolerance, collectionAggregation, 'databond1'
    );
    await bondManager.connect(signers[5]).createBond(
      epoch, jobs2, bonds[1], occurrences[1], collectionPower, collectionTolerance, collectionAggregation, 'databond2'
    );
    await bondManager.connect(signers[6]).createBond(
      epoch, jobs3, bonds[2], occurrences[2], collectionPower, collectionTolerance, collectionAggregation, 'databond3'
    );
    const numDatabonds = await bondManager.numDataBond();
    for (let j = 1; j <= numDatabonds; j++) {
      const databond = await bondManager.getDatabond(j);
      const collection = await collectionManager.getCollection(databond.collectionId);
      assertBNEqual(bonds[j - 1], databond.bond, 'invalid amount');
      assert(databond.collectionId === 9 + j);
      assert(databond.bondCreator === signers[j + 3].address);
      assert(databond.epochBondLastUpdated === epoch);
      assert(databond.jobIds.length === numJobs[j - 1]);
      assert(collection.power === collectionPower);
      assert(collection.tolerance === collectionTolerance);
      assert(collection.name === `databond${j}`);
      assert(collection.occurrence === occurrences[j - 1]);
      for (let i = 0; i < databond.jobIds.length; i++) {
        const job = await collectionManager.getJob(databond.jobIds[i]);
        assert(job.power === collectionPower);
        assert(job.url === url);
        assert(job.name === `test${databond.jobIds[i] - 1}`);
        assert(job.weight === weight);
        assert(job.selector === selector);
      }
    }
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('12'), 'databond not created');

    /* ///////////////////////////////////////////////////////////////
                          VOTING
      ////////////////////////////////////////////////////////////// */
    const active = [true, true, true];
    let blockConfirmer = 0;
    let blockIteration;
    for (let j = 1; j <= 10; j++) {
      await mineToNextEpoch();

      epoch = await getEpoch();
      for (let i = 1; i <= 3; i++) {
        const secret = await getSecret(signers[i]);
        await commit(signers[i], 0, voteManager, collectionManager, secret, blockManager);
      }
      await mineToNextState(); // reveal
      for (let i = 1; i <= 3; i++) {
        await reveal(collectionManager, signers[i], 0, voteManager, stakeManager);
      }
      await mineToNextState(); // propose
      const medians = await calculateMedians(collectionManager);
      blockConfirmer = 0;
      blockIteration;
      for (let i = 1; i <= 3; i++) {
        const staker = await stakeManager.getStaker(await stakeManager.getStakerId(signers[i].address));
        const { biggestStake, biggestStakerId } = await getBiggestStakeAndId(stakeManager, voteManager);
        const iteration = await getIteration(voteManager, stakeManager, staker, biggestStake);
        if (blockConfirmer === 0) {
          blockConfirmer = i;
          blockIteration = iteration;
        } else if (blockIteration > iteration) {
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
      let numActiveCollections = await collectionManager.getNumActiveCollections();
      const blockId = await blockManager.sortedProposedBlockIds(epoch, 0);
      const block = await blockManager.getProposedBlock(epoch, blockId);
      await blockManager.connect(signers[blockConfirmer]).claimBlockReward();
      for (let i = 0; i < block.ids.length; i++) {
        const collectionId = block.ids[i];
        const collection = await collectionManager.getCollection(collectionId);
        if (collection.epochLastReported + collection.occurrence !== epoch + 1) {
          numActiveCollections -= 1;
          if (collectionId === 10) active[0] = false;
          else if (collectionId === 11) active[1] = false;
          else if (collectionId === 12) active[2] = false;
        }
      }
      const databondCollectionIds = await bondManager.getDatabondCollections();
      for (let i = 0; i < databondCollectionIds.length; i++) {
        const collectionId = databondCollectionIds[i];
        const collection = await collectionManager.getCollection(collectionId);
        if (collection.epochLastReported + collection.occurrence === epoch + 1 && !active[i]) {
          numActiveCollections += 1;
          active[i] = true;
        }
      }
      assertBNEqual(numActiveCollections, await collectionManager.getNumActiveCollections(), 'incorrect number of active collections');
    }

    /* ///////////////////////////////////////////////////////////////
                          BOND DEACTIVATION
      ////////////////////////////////////////////////////////////// */

    await bondManager.connect(signers[5]).setDatabondStatus(false, 2);
    let databond = await bondManager.getDatabond(2);
    let collection = await collectionManager.getCollection(databond.collectionId);
    let databondArray = await bondManager.getDatabondCollections();
    assert(databond.active === false);
    assert(databondArray.length === 2);

    /* ///////////////////////////////////////////////////////////////
                        BOND ACTIVATION
    ////////////////////////////////////////////////////////////// */

    // Immediate deactivation <-> activation should not be possible
    const tx = bondManager.connect(signers[5]).setDatabondStatus(true, databond.id);
    await assertRevert(tx, 'databond been updated recently');
    const bondUpdation = await bondManager.epochLimitForUpdateBond();
    for (let i = 1; i <= bondUpdation; i++) {
      await mineToNextEpoch();
    }
    await mineToNextState(); // reveal
    await mineToNextState(); // propose
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm
    await bondManager.connect(signers[5]).setDatabondStatus(true, databond.id);
    databond = await bondManager.getDatabond(2);
    collection = await collectionManager.getCollection(databond.collectionId);
    databondArray = await bondManager.getDatabondCollections();
    assert(databond.active === true);
    assert(collection.active === true);
    assert(databondArray.length === 3);

    /* ///////////////////////////////////////////////////////////////
                          UNSTAKE BOND
      ////////////////////////////////////////////////////////////// */
    // Immediate unstake after changing databond details
    const tx1 = bondManager.connect(signers[5]).unstakeBond(databond.id, databond.bond);
    await assertRevert(tx1, 'databond been updated recently');
    for (let i = 1; i <= bondUpdation; i++) {
      await mineToNextEpoch();
    }
    await mineToNextState(); // reveal
    await mineToNextState(); // propose
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm
    const prevBond = databond.bond;
    await bondManager.connect(signers[5]).unstakeBond(databond.id, databond.bond);
    databond = await bondManager.getDatabond(2);
    databondArray = await bondManager.getDatabondCollections();
    const bondLock = await bondManager.bondLocks(databond.id, signers[5].address);
    epoch = await getEpoch();
    assertBNEqual(databond.bond, toBigNumber('0'), 'invalid amount of razors unstaked');
    assert(databond.active === false);
    assert(databondArray.length === 2);
    assertBNEqual(bondLock.amount, prevBond, 'invalid amount locked');
    assertBNEqual(bondLock.unlockAfter, epoch + WITHDRAW_LOCK_PERIOD, 'invalid lock');

    for (let i = 0; i < WITHDRAW_LOCK_PERIOD; i++) {
      await mineToNextEpoch();
    }

    const prevRazorBalance = await razor.balanceOf(signers[5].address);

    await bondManager.connect(signers[5]).withdrawBond(databond.id);
    const newRazorBalance = await razor.balanceOf(signers[5].address);

    assertBNEqual(newRazorBalance, prevRazorBalance.add(prevBond), 'incorrect withdraw');
  });

  it('changing minBond through governance', async () => {
    const epoch = await getEpoch();
    /* ///////////////////////////////////////////////////////////////
                          BOND CREATION
      ////////////////////////////////////////////////////////////// */
    const bonds = [];
    for (let i = 4; i <= 6; i++) {
      let bond = await razor.balanceOf(signers[i].address);
      bond = bond.sub(toBigNumber(i - 4).mul(tokenAmount('100000')));
      bonds.push(bond);
    }

    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bonds[0]);
    await razor.connect(signers[5]).approve(bondManager.address, bonds[1]);
    await razor.connect(signers[6]).approve(bondManager.address, bonds[2]);
    const numJobs = [2, 3, 4];
    const occurrences = [];
    for (let i = 0; i <= 2; i++) {
      const occurrence = Math.floor((jobDeposit.mul(toBigNumber(numJobs[i]))).div(bonds[i]));
      occurrences.push(occurrence);
    }
    await bondManager.connect(signers[4]).createBond(
      epoch, jobs3, bonds[0], occurrences[0], collectionPower, collectionTolerance, collectionAggregation, 'databond1'
    );
    await bondManager.connect(signers[5]).createBond(
      epoch, jobs2, bonds[1], occurrences[1], collectionPower, collectionTolerance, collectionAggregation, 'databond2'
    );
    await bondManager.connect(signers[6]).createBond(
      epoch, jobs, bonds[2], occurrences[2], collectionPower, collectionTolerance, collectionAggregation, 'databond3'
    );
    const numDatabonds = await bondManager.numDataBond();
    for (let j = 1; j <= numDatabonds; j++) {
      const databond = await bondManager.getDatabond(j);
      const collection = await collectionManager.getCollection(databond.collectionId);
      assertBNEqual(bonds[j - 1], databond.bond, 'invalid amount');
      assert(databond.collectionId === 9 + j);
      assert(databond.bondCreator === signers[j + 3].address);
      assert(databond.epochBondLastUpdated === epoch);
      assert(databond.jobIds.length === numJobs[j - 1]);
      assert(collection.power === collectionPower);
      assert(collection.tolerance === collectionTolerance);
      assert(collection.name === `databond${j}`);
      assert(collection.occurrence === occurrences[j - 1]);
    }
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('12'), 'databond not created');

    /* ///////////////////////////////////////////////////////////////
                          GOVERNANCE CHANGE
      ////////////////////////////////////////////////////////////// */

    await governance.setMinBond(tokenAmount('343000'));

    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('11'), 'databond 3 collection not deactivated');
    for (let i = 1; i <= 3; i++) {
      const databond = await bondManager.getDatabond(i);
      const collection = await collectionManager.getCollection(databond.collectionId);
      if (databond.id === 3) {
        assert(collection.active === false);
        assert(databond.active === false);
      } else {
        assert(collection.active === true);
        assert(databond.active === true);
      }
    }

    const databondCollections = await bondManager.getDatabondCollections();
    assertBNEqual(databondCollections.length, toBigNumber('2'), 'array not reset');
  });

  it('changing depositPerJob through governance', async () => {
    const epoch = await getEpoch();
    /* ///////////////////////////////////////////////////////////////
                          BOND CREATION
      ////////////////////////////////////////////////////////////// */
    const bonds = [];
    for (let i = 4; i <= 6; i++) {
      let bond = await razor.balanceOf(signers[i].address);
      bond = bond.sub(toBigNumber(i - 4).mul(tokenAmount('100000')));
      bonds.push(bond);
    }

    let jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bonds[0]);
    await razor.connect(signers[5]).approve(bondManager.address, bonds[1]);
    await razor.connect(signers[6]).approve(bondManager.address, bonds[2]);
    const numJobs = [2, 3, 4];
    const occurrences = [];
    for (let i = 0; i <= 2; i++) {
      const occurrence = Math.floor((jobDeposit.mul(toBigNumber(numJobs[i]))).div(bonds[i]));
      occurrences.push(occurrence);
    }
    await bondManager.connect(signers[4]).createBond(
      epoch, jobs3, bonds[0], occurrences[0], collectionPower, collectionTolerance, collectionAggregation, 'databond1'
    );
    await bondManager.connect(signers[5]).createBond(
      epoch, jobs2, bonds[1], occurrences[1], collectionPower, collectionTolerance, collectionAggregation, 'databond2'
    );
    await bondManager.connect(signers[6]).createBond(
      epoch, jobs, bonds[2], occurrences[2], collectionPower, collectionTolerance, collectionAggregation, 'databond3'
    );
    const numDatabonds = await bondManager.numDataBond();
    for (let j = 1; j <= numDatabonds; j++) {
      const databond = await bondManager.getDatabond(j);
      const collection = await collectionManager.getCollection(databond.collectionId);
      assertBNEqual(bonds[j - 1], databond.bond, 'invalid amount');
      assert(databond.collectionId === 9 + j);
      assert(databond.bondCreator === signers[j + 3].address);
      assert(databond.epochBondLastUpdated === epoch);
      assert(databond.jobIds.length === numJobs[j - 1]);
      assert(collection.power === collectionPower);
      assert(collection.tolerance === collectionTolerance);
      assert(collection.name === `databond${j}`);
      assert(collection.occurrence === occurrences[j - 1]);
    }
    assertBNEqual(await collectionManager.getNumActiveCollections(), toBigNumber('12'), 'databond not created');

    /* ///////////////////////////////////////////////////////////////
                          GOVERNANCE CHANGE: INCREASE
      ////////////////////////////////////////////////////////////// */

    await governance.setDepositPerJob(tokenAmount('700000'));
    jobDeposit = await bondManager.depositPerJob();

    for (let i = 0; i <= 2; i++) {
      const occurrence = Math.floor((jobDeposit.mul(toBigNumber(numJobs[i]))).div(bonds[i]));
      const databond = await bondManager.getDatabond(i + 1);
      const collection = await collectionManager.getCollection(databond.collectionId);
      assertBNEqual(databond.desiredOccurrence, toBigNumber(occurrence), 'incorrect occurrence calculation:databond');
      assertBNEqual(collection.occurrence, toBigNumber(occurrence), 'incorrect occurrence calculation:collection');
    }

    /* ///////////////////////////////////////////////////////////////
                          GOVERNANCE CHANGE: DECREASE
      ////////////////////////////////////////////////////////////// */

    await governance.setDepositPerJob(tokenAmount('300000'));
    jobDeposit = await bondManager.depositPerJob();

    for (let i = 0; i <= 2; i++) {
      const occurrence = Math.floor((jobDeposit.mul(toBigNumber(numJobs[i]))).div(bonds[i]));
      const databond = await bondManager.getDatabond(i + 1);
      const collection = await collectionManager.getCollection(databond.collectionId);
      assertBNEqual(databond.desiredOccurrence, toBigNumber(occurrence), 'incorrect occurrence calculation:databond');
      assertBNEqual(collection.occurrence, toBigNumber(occurrence), 'incorrect occurrence calculation:collection');
    }
  });

  it('negative test cases: Create Bond', async () => {
    const epoch = await getEpoch();
    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));
    let tx = bondManager.connect(signers[4]).createBond(
      epoch, databondJobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    await assertRevert(tx, 'number of jobs exceed maxJobs');
    tx = bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, 1, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    await assertRevert(tx, 'not enough bond paid per job');
    tx = bondManager.connect(signers[4]).createBond(
      epoch, databondJobs.slice(0, 1), bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    await assertRevert(tx, 'invalid bond creation');
    const minBond = await bondManager.minBond();
    tx = bondManager.connect(signers[4]).createBond(
      epoch, jobs, minBond.sub(toBigNumber('1')), occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );
    await assertRevert(tx, 'minBond not satisfied');
  });

  it('negative test cases: Update Databond Job', async () => {
    const epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    const newUrl = 'http://testurl5.com';
    const newSelector = 'selector5';
    const newSelectorType = 1;
    const newPower = -6;
    const newWeight = 90;
    let tx = bondManager.connect(signers[4]).updateDataBondJob(1, 0, newWeight, newPower, newSelectorType, newSelector, newUrl);
    await assertRevert(tx, 'invalid databond update');

    tx = bondManager.connect(signers[5]).updateDataBondJob(1, 0, newWeight, newPower, newSelectorType, newSelector, newUrl);
    await assertRevert(tx, 'invalid access to databond');
  });

  it('negative test cases: Update Databond Collection', async () => {
    const epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    let occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    const newAggregation = 1;
    const newPower = -6;
    const newTolerance = 90;
    const jobIds = [1, 2, 3];
    let tx = bondManager.connect(signers[4]).updateDataBondCollection(1, 10, occurrence, newTolerance, newAggregation, newPower, [1]);
    await assertRevert(tx, 'invalid bond updation');

    tx = bondManager.connect(signers[4]).updateDataBondCollection(1, 10, occurrence, newTolerance, newAggregation, newPower, [1, 2, 3, 4, 5, 6, 7]);
    await assertRevert(tx, 'number of jobs exceed maxJobs');

    tx = bondManager.connect(signers[4]).updateDataBondCollection(1, 4, occurrence, newTolerance, newAggregation, newPower, jobIds);
    await assertRevert(tx, 'incorrect collectionId specified');

    tx = bondManager.connect(signers[4]).updateDataBondCollection(1, 10, occurrence, newTolerance, newAggregation, newPower, jobIds);
    await assertRevert(tx, 'invalid databond update');

    tx = bondManager.connect(signers[6]).updateDataBondCollection(1, 10, occurrence, newTolerance, newAggregation, newPower, jobIds);
    await assertRevert(tx, 'invalid access to databond');

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let i = 1; i <= bondUpdation; i++) {
      await mineToNextEpoch();
    }

    occurrence = Math.floor((jobDeposit.mul(toBigNumber(jobIds.length))).div(bond));
    tx = bondManager.connect(signers[4]).updateDataBondCollection(1, 10, occurrence - 1, newTolerance, newAggregation, newPower, jobIds);
    await assertRevert(tx, 'not enough bond paid per job');
  });

  it('negative test cases: Add Jobs to Collection', async () => {
    const epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    let occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    const newJobs = [];
    let i = 4;
    const url = 'http://testurl.com';
    const selector = 'selector';
    const selectorType = 0;
    let name;
    const power = -2;
    const weight = 50;
    while (i < 7) {
      name = `test${i}`;
      const job = {
        id: 0,
        selectorType,
        weight,
        power,
        name,
        selector,
        url,
      };
      newJobs.push(job);
      i++;
    }
    const newAggregation = 1;
    const newPower = -6;
    const newTolerance = 90;

    let tx = bondManager.connect(signers[4]).addJobsToCollection(1, newJobs.slice(0, 2), occurrence, newPower, newTolerance, newAggregation);
    await assertRevert(tx, 'invalid databond update');

    tx = bondManager.connect(signers[7]).addJobsToCollection(1, newJobs.slice(0, 2), occurrence, newPower, newTolerance, newAggregation);
    await assertRevert(tx, 'invalid access to databond');

    tx = bondManager.connect(signers[4]).addJobsToCollection(1, newJobs, occurrence, newPower, newTolerance, newAggregation);
    await assertRevert(tx, 'number of jobs exceed maxJobs');

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let i = 1; i <= bondUpdation; i++) {
      await mineToNextEpoch();
    }

    occurrence = Math.floor((jobDeposit.mul(toBigNumber('6'))).div(bond));
    tx = bondManager.connect(signers[4]).addJobsToCollection(1, newJobs.slice(0, 2), occurrence - 1, newPower, newTolerance, newAggregation);
    await assertRevert(tx, 'not enough bond paid per job');
  });

  it('negative test cases: Add bond', async () => {
    const epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let i = 1; i <= bondUpdation; i++) {
      await mineToNextEpoch();
    }

    await mineToNextState(); // reveal
    await mineToNextState(); // propose
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm

    await bondManager.connect(signers[4]).setDatabondStatus(false, 1);

    let tx = bondManager.connect(signers[4]).addBond(1, toBigNumber('1'), occurrence - 1);
    await assertRevert(tx, 'not enough bond paid per job');

    tx = bondManager.connect(signers[8]).addBond(1, toBigNumber('1'), occurrence);
    await assertRevert(tx, 'invalid access to databond');
  });

  it('negative test cases: Unstake & Withdraw', async () => {
    const epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    let tx = bondManager.connect(signers[4]).withdrawBond(1);
    await assertRevert(tx, 'no lock created');

    tx = bondManager.connect(signers[4]).unstakeBond(1, bond.add(toBigNumber('1')));
    await assertRevert(tx, 'invalid bond amount');

    tx = bondManager.connect(signers[4]).unstakeBond(1, 0);
    await assertRevert(tx, 'bond being unstaked cant be 0');

    tx = bondManager.connect(signers[4]).unstakeBond(1, bond);
    await assertRevert(tx, 'databond been updated recently');

    tx = bondManager.connect(signers[9]).unstakeBond(1, bond);
    await assertRevert(tx, 'invalid access to databond');

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let i = 1; i <= bondUpdation; i++) {
      await mineToNextEpoch();
    }

    await mineToNextState(); // reveal
    await mineToNextState(); // propose
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm
    await bondManager.connect(signers[4]).unstakeBond(1, bond);

    tx = bondManager.connect(signers[4]).withdrawBond(1);
    await assertRevert(tx, 'Withdraw epoch not reached');

    tx = bondManager.connect(signers[9]).withdrawBond(1);
    await assertRevert(tx, 'invalid access to databond');
  });

  it('negative test case: set databond status', async () => {
    const epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    let tx = bondManager.connect(signers[4]).setDatabondStatus(true, 1);
    await assertRevert(tx, 'status not being changed');

    tx = bondManager.connect(signers[4]).setDatabondStatus(false, 1);
    await assertRevert(tx, 'databond been updated recently');

    tx = bondManager.connect(signers[10]).setDatabondStatus(false, 1);
    await assertRevert(tx, 'invalid access to databond');

    const bondUpdation = await bondManager.epochLimitForUpdateBond();

    for (let i = 1; i <= bondUpdation; i++) {
      await mineToNextEpoch();
    }

    await mineToNextState(); // reveal
    await mineToNextState(); // propose
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm
    await bondManager.connect(signers[4]).unstakeBond(1, bond);

    await mineToNextEpoch();
    await bondManager.connect(signers[4]).withdrawBond(1);

    await mineToNextState(); // reveal
    await mineToNextState(); // propose
    await mineToNextState(); // dispute
    await mineToNextState(); // confirm

    tx = bondManager.connect(signers[4]).setDatabondStatus(true, 1);
    await assertRevert(tx, 'bond needs to be >= minbond');
  });

  it('negative test case: get Databond', async () => {
    const epoch = await getEpoch();

    const bond = await razor.balanceOf(signers[4].address);
    const jobDeposit = await bondManager.depositPerJob();
    await razor.connect(signers[4]).approve(bondManager.address, bond);
    const occurrence = Math.floor((jobDeposit.mul(toBigNumber('4'))).div(bond));

    await bondManager.connect(signers[4]).createBond(
      epoch, jobs, bond, occurrence, collectionPower, collectionTolerance, collectionAggregation, collectionName
    );

    let tx = bondManager.getDatabond(0);
    await assertRevert(tx, 'ID cannot be 0');

    tx = bondManager.getDatabond(100);
    await assertRevert(tx, 'ID does not exist');
  });
});
