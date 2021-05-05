const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const { setupContracts } = require('./helpers/testSetup');

describe('SchellingCoin', function () {
  let signers;
  let schellingCoin;
  before(async () => {
    ({ schellingCoin } = await setupContracts());
    signers = await ethers.getSigners();
  });

  it('admin role should be granted', async () => {
    const isAdminRoleGranted = await schellingCoin.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
    assert(isAdminRoleGranted === true, 'Admin role was not Granted');
  });
});
