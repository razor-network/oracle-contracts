const { assert } = require('chai');

const { BigNumber } = ethers;

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
  if (BigNumber.isBN(actual) || BigNumber.isBN(expected)) {
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

module.exports = {
  assertRevert,
  assertDeepEqual,
  assertBNEqual,
  assertBNNotEqual,
};
