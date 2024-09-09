const { assert } = require('chai');
const {
  assertRevert,
} = require('./helpers/testHelpers');

let mock;

describe('Initializable', function () {
  beforeEach('deploying', async function () {
    const InitializableMock = await ethers.getContractFactory('InitializableMock');
    mock = await InitializableMock.deploy();
  });

  it('initializer has not run', async function () {
    assert.isFalse(await mock.initializerRan());
  });

  it('initializer has run', async function () {
    await mock.initialize();
    assert.isTrue(await mock.initializerRan());
  });

  it('initializer does not run again', async function () {
    await mock.initialize();
    await assertRevert(mock.initialize(), 'contract already initialized');
  });

  it('initializer has run after nested initialization', async function () {
    await mock.initializeNested();
    assert.isTrue(await mock.initializerRan());
  });
});
