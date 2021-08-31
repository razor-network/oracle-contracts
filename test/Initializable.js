const { assert } = require('chai');
const {
  assertRevert,
} = require('./helpers/testHelpers');

const InitializableMock = artifacts.require('../contracts/mocks/InitializableMock');

describe('Initializable', function () {
  beforeEach('deploying', async function () {
    this.contract = await InitializableMock.new();
  });

  it('initializer has not run', async function () {
    assert.isFalse(await this.contract.initializerRan());
  });

  it('initializer has run', async function () {
    await this.contract.initialize();
    assert.isTrue(await this.contract.initializerRan());
  });

  it('initializer does not run again', async function () {
    await this.contract.initialize();
    await assertRevert(this.contract.initialize(), 'Initializable: contract is already initialized');
  });

  it('initializer has run after nested initialization', async function () {
    await this.contract.initializeNested();
    assert.isTrue(await this.contract.initializerRan());
  });
});
