module.exports = {
  file: 'test/*.js',
  norpc: true,
  copyPackages: ['openzeppelin-solidity'],
  skipFiles: ['Migrations.sol'],
  istanbulReporter: ['html', 'lcov', 'text'],
  providerOptions: {
    mnemonic: 'square include clarify skin garden tube tide eight eternal grit hybrid library',
    total_accounts: 20,
    default_balance_ether: '1000000000000000000',
    gasLimit: 0xfffffffffff,
  },
}
