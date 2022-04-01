const { assert } = require('chai');
const { BigNumber } = require('ethers');
const { EPOCH_LENGTH, STATE_LENGTH } = require('./constants');
const { getEpoch, toBigNumber } = require('./utils');

/**
 *  Function to assert that two BigNumber instances are equal.
 *  @param actualBN BigNumber amount you received
 *  @param expectedBN BigNumber amount you expected to receive
 *  @param log Log reason if we fail the assertion
 */
const assertBNEqual = (actualBN, expectedBN, log) => {
  assert.strictEqual(actualBN.toString(), expectedBN.toString(), log);
};

/**
 *  Function to assert that the firstBN parameter  is less than secondBN parameter
 *  @param lesserBN  smaller BigNumber amount
 *  @param greaterBN greater BigNumber amount
 */
const assertBNLessThan = (lesserBN, greaterBN) => {
  assert.ok(lesserBN.lt(greaterBN), `${lesserBN.toString()} is not less than ${greaterBN.toString()}`);
};

/**
 *  Convenience method to assert that two BigNumber instances are NOT equal.
 *  @param actualBN The BigNumber instance you received
 *  @param expectedBN The BigNumber amount you expected NOT to receive
 *  @param log Log reason if we fail the assertion
 */
const assertBNNotEqual = (actualBN, expectedBN, log) => {
  assert.notStrictEqual(actualBN.toString(), expectedBN.toString(), log);
};

/**
 *  Function to check if two arrays/objects which contain nested BigNumber are equal.
 *  @param actual What you received
 *  @param expected The shape you expected
 */
const assertDeepEqual = (actual, expected, context) => {
  // Check if it's a value type we can assert on straight away.
  if (BigNumber.isBigNumber(actual) || BigNumber.isBigNumber(expected)) {
    assertBNEqual(actual, expected, context);
  } else if (
    typeof expected === 'string'
    || typeof actual === 'string'
    || typeof expected === 'number'
    || typeof actual === 'number'
    || typeof expected === 'boolean'
    || typeof actual === 'boolean'
  ) {
    assert.strictEqual(actual, expected, context);
  } else if (Array.isArray(expected)) {
    // Otherwise dig through the deeper object and recurse
    for (let i = 0; i < expected.length; i++) {
      assertDeepEqual(actual[i], expected[i], `(array index: ${i}) `);
    }
  } else {
    for (const key of Object.keys(expected)) {
      assertDeepEqual(actual[key], expected[key], `(key: ${key}) `);
    }
  }
};

/**
 *  Function to check whether transaction is getting reverted with reason as expected.
 *  @param promise Transaction promise
 *  @param reason Reason for revert
 */
const assertRevert = async (promise, reason) => {
  let errorEncountered = false;
  try {
    await promise;
  } catch (error) {
    assert.include(error.message, 'revert');
    if (reason) {
      assert.include(error.message, reason);
    }
    errorEncountered = true;
  }
  assert.strictEqual(errorEncountered, true, 'Transaction did not revert as expected');
};

const send = (payload) => {
  if (!payload.jsonrpc) payload.jsonrpc = '2.0';
  if (!payload.id) payload.id = new Date().getTime();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send(payload, (error, result) => {
      if (error) return reject(error);

      return resolve(result);
    });
  });
};

const waitNBlocks = async (n) => {
  await Promise.all(
    [...Array(n).keys()].map((i) => send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: i,
    }))
  );
};

const mineAdvance = async (n) => {
  n = toBigNumber(n);
  const blockNumber = toBigNumber(await web3.eth.getBlockNumber());
  if (n.gt(blockNumber)) {
    const diff = n.sub(blockNumber);
    await waitNBlocks(diff.toNumber());
  }
};

const mineBlock = () => send({ method: 'evm_mine' });

// Mines to the next Epoch from which ever block it is in the current Epoch
const mineToNextEpoch = async () => {
  const currentBlockNumber = await web3.eth.getBlockNumber();
  const currentBlock = await web3.eth.getBlock(currentBlockNumber);
  const currentTimestamp = currentBlock.timestamp;
  const currentEpoch = await getEpoch();
  const nextEpochBlockTimestamp = (currentEpoch + 1) * EPOCH_LENGTH.toNumber(); // currentBlocktimestamp + epochLength
  const diff = nextEpochBlockTimestamp - currentTimestamp;
  await ethers.provider.send('evm_increaseTime', [diff + 5]);
  await ethers.provider.send('evm_mine');
};

// Mines to the next state in the current epoch
const mineToNextState = async () => {
  const currentBlockNumber = toBigNumber(await web3.eth.getBlockNumber());
  const currentBlock = await web3.eth.getBlock(currentBlockNumber);
  const currentTimestamp = toBigNumber(currentBlock.timestamp);
  const temp = currentTimestamp.div(STATE_LENGTH).add('1');
  const nextStateBlockNum = temp.mul(STATE_LENGTH);
  const diff = nextStateBlockNum.sub(currentTimestamp);
  await ethers.provider.send('evm_increaseTime', [diff.toNumber() + 5]);
  await ethers.provider.send('evm_mine');
};

// Mines to the next state with custom stateLength
const mineToNextStateCustom = async (stateLength) => {
  const currentBlockNumber = toBigNumber(await web3.eth.getBlockNumber());
  const currentBlock = await web3.eth.getBlock(currentBlockNumber);
  const currentTimestamp = toBigNumber(currentBlock.timestamp);
  const temp = currentTimestamp.div(stateLength).add('1');
  const nextStateBlockNum = temp.mul(stateLength);
  const diff = nextStateBlockNum.sub(currentTimestamp);
  await ethers.provider.send('evm_increaseTime', [diff.toNumber() + 5]);
  await ethers.provider.send('evm_mine');
};

const restoreSnapshot = async (id) => {
  await send({
    method: 'evm_revert',
    params: [id],
  });
  await mineBlock();
};

const takeSnapshot = async () => {
  const { result } = await send({
    jsonrpc: '2.0',
    method: 'evm_snapshot',
  });

  await mineBlock();

  return result;
};

module.exports = {
  assertRevert,
  assertDeepEqual,
  assertBNEqual,
  assertBNLessThan,
  assertBNNotEqual,
  waitNBlocks,
  mineAdvance,
  mineBlock,
  mineToNextEpoch,
  mineToNextState,
  takeSnapshot,
  restoreSnapshot,
  mineToNextStateCustom,
};
