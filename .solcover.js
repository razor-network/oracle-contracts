module.exports = {
  norpc: true,
  copyPackages: ['openzeppelin-solidity'],
  skipFiles: ['Migrations.sol'],
  providerOptions: { total_accounts: 30, seed: 0, network_id: 420 },
}
