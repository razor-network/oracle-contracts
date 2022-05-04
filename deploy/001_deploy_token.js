const hre = require('hardhat');

module.exports = async () => {
  const { getNamedAccounts, deployments } = hre;
  const { log, deploy } = deployments;
  const namedAccounts = await getNamedAccounts();
  const { deployer, tokenOwner } = namedAccounts;
  console.log(`deployer ${deployer} tokenOwner ${tokenOwner}`);
  const deployResult = await deploy('Token', {
    from: deployer,
    args: [tokenOwner],
  });
  log(`deployResult newlyDeployed: ${deployResult.newlyDeployed}`);
  if (deployResult.newlyDeployed) {
    console.log(
      `contract Token deployed at ${deployResult.address} using ${deployResult.receipt.gasUsed} gas`
    );
  }
};

module.exports.tags = ['Token'];
