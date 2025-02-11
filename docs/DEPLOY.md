## hardhat-deploy in a nutshell

**hardhat-deploy** allows you to write `deploy scripts` in the `deploy` folder. Each of these files that look as follows will be executed in turn when you execute the following task: `hardhat --network <networkName> deploy`

Note: `hre.deployments.deploy` function will by default only deploy a contract if the contract code has changed, making it easier to write idempotent scripts.

### An example of a deploy script :

```
module.exports = async ({
  getNamedAccounts,
  deployments,
  getChainId,
  getUnnamedAccounts,
}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // the following will only deploy "GenericMetaTxProcessor" if the contract was never deployed or if the code changed since last deployment
  await deploy('GenericMetaTxProcessor', {
    from: deployer,
    gasLimit: 4000000,
    args: [],
  });
};

```

As you can see the HRE passed in has 4 new fields :

- `getNamedAccounts` is a function that returns a promise to an object whose keys are names and values are addresses. It is parsed from the `namedAccounts` configuration.
- `getUnnamedAccounts` is a function that return a promise to an array of accounts which were not named (see `namedAccounts` ). It is useful for tests where you want to be sure that the account has no speicifc role in the system (no token given, no admin access, etc...).
- `getChainId` is a function which return a promise for the chainId, as convenience
- `deployments` is an object which contains functions to access past deployments or to save new ones, as well as helpers functions.

`deployments` contains for example the `deploy` function that allows you to deploy contract and save them.

### **1. namedAccounts (ability to name addresses)**

---

This plugin extends the `HardhatConfig`'s object with an optional `namedAccounts` field.

`namedAccounts` allows you to associate names to addresses and have them configured per chain.
This allows you to have meaningful names in your tests.

```
{
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
            4: '0xA296a3d5F026953e17F472B497eC29a5631FB51B', // but for rinkeby it will be a specific address
            "goerli": '0x84b9514E013710b9dD0811c9Fe46b837a4A0d8E0', //it can also specify a specific netwotk name (specified in hardhat.config.js)
        },
        feeCollector:{
            default: 1, // here this will by default take the second account as feeCollector (so in the test this will be a different account than the deployer)
            1: '0xa5610E1f289DbDe94F3428A9df22E8B518f65751', // on the mainnet the feeCollector could be a multi sig
            4: '0xa250ac77360d4e837a13628bC828a2aDf7BabfB3', // on rinkeby it could be another account
        }
    }
}

```

---

Furthermore you can also ensure these scripts are executed in test’s too by calling `await deployments.fixture(['MyContract'])` in your test.
This is optimised, so if multiple tests use the same contract, the deployment will be executed once and each test will start with the exact same state.

This is a huge benefit for testing since you are not required to replicate the deployment procedure in your tests.

You can even group deploy scripts in different sub folder and ensure they are executed in their logical order.
