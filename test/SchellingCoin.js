const { DEFAULT_ADMIN_ROLE_HASH } = require('./helpers/constants');
const { assertBNEqual, assertRevert } = require('./helpers/testHelpers');
const { setupContracts } = require('./helpers/testSetup');
const { tokenAmount } = require('./helpers/utils');

describe('SchellingCoin', function () {
  let minterRole;
  let schellingCoin;
  let signers;

  before(async () => {
    ({ schellingCoin } = await setupContracts());
    minterRole = await schellingCoin.MINTER_ROLE();
    signers = await ethers.getSigners();
  });

  it('admin role should be granted', async () => {
    const isAdminRoleGranted = await schellingCoin.hasRole(DEFAULT_ADMIN_ROLE_HASH, signers[0].address);
    assert(isAdminRoleGranted === true, 'Admin role was not Granted');
  });

  it('minter role should be granted', async () => {
    const beforeMinterRoleGranted = await schellingCoin.hasRole(minterRole, signers[1].address);
    assert(beforeMinterRoleGranted === false, 'should not have minter role');

    await schellingCoin.addMinter(signers[1].address);

    const afterMinterRoleGranted = await schellingCoin.hasRole(minterRole, signers[1].address);
    assert(afterMinterRoleGranted === true, 'minter role should be granted');
  });

  it('should be able to mint schelling coin tokens', async () => {
    const tokensToBeMinted = tokenAmount('10');
    const balanceBeforeMinting = await schellingCoin.balanceOf(signers[2].address);
    assertBNEqual(balanceBeforeMinting, tokenAmount('0'), 'should have zero token balance');

    await schellingCoin.connect(signers[1]).mint(signers[2].address, tokensToBeMinted);

    const balanceAfterMinting = await schellingCoin.balanceOf(signers[2].address);
    assertBNEqual(balanceAfterMinting, tokensToBeMinted, `${tokensToBeMinted} tokens should have been minted`);
  });

  it('minter role should be revoked', async () => {
    const beforeMinterRoleGranted = await schellingCoin.hasRole(minterRole, signers[1].address);
    assert(beforeMinterRoleGranted === true, 'should have minter role');

    await schellingCoin.removeMinter(signers[1].address);

    const afterMinterRoleGranted = await schellingCoin.hasRole(minterRole, signers[1].address);
    assert(afterMinterRoleGranted === false, 'minter role should be revoked');
  });

  it('should not be able to mint schelling coin tokens', async () => {
    const tx = schellingCoin.connect(signers[1]).mint(signers[3].address, tokenAmount('10'));
    await assertRevert(tx, 'Caller is not a minter');
  });

  it('should not be able to grant minter role', async () => {
    const tx = schellingCoin.connect(signers[1]).addMinter(signers[2].address);
    await assertRevert(tx, 'ACL: sender not authorized');
  });
  it('should be able to grant minter role', async () => {
    const tx = schellingCoin.connect(signers[0]).addMinter(signers[2].address);
    await assert(tx, 'ACL: Minter Role granted');
  });
  it('should be able to Revoke minter role', async () => {
    const tx = schellingCoin.connect(signers[0]).removeMinter(signers[2].address);
    await assert(tx, 'ACL: Minter Role Revoked');
  });
  it('should not be able to revoke minter role', async () => {
    const tx = schellingCoin.connect(signers[1]).removeMinter(signers[2].address);
    await assertRevert(tx, 'ACL: sender not authorized');
  });
});
