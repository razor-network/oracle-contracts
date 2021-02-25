const { getdeployedContractInstance, readDeploymentFile } = require('../migrationHelpers');
const { BigNumber } = ethers;

module.exports = async () => {
    const SEED = BigNumber.from('10').pow('24')

    const {
        Constants: constantsAddress,
        Random: randomAddress,
        BlockManager: blockManagerAddress,
        JobManager: jobManagerAddress,
        StakeManager: stakeManagerAddress,
        StateManager: stateManagerAddress,
        VoteManager: voteManagerAddress,
        Delegator: delegatorAddress,
        SchellingCoin: schellingCoinAddress,
        Faucet: faucetAddress,
    } = await readDeploymentFile();

    const constantsDependency = { 'Constants': constantsAddress };
    const constantsAndRandomDependency = { 'Constants': constantsAddress, 'Random': randomAddress };

    const { contractInstance: constants } = await getdeployedContractInstance('Constants', constantsAddress);
    const { contractInstance: blockManager } = await getdeployedContractInstance('BlockManager', blockManagerAddress, constantsAndRandomDependency);
    const { contractInstance: jobManager } = await getdeployedContractInstance('JobManager', jobManagerAddress, constantsDependency);
    const { contractInstance: stakeManager } = await getdeployedContractInstance('StakeManager', stakeManagerAddress, constantsDependency);
    const { contractInstance: voteManager } = await getdeployedContractInstance('VoteManager', voteManagerAddress, constantsDependency);
    const { contractInstance: delegator } = await getdeployedContractInstance('Delegator', delegatorAddress);
    const { contractInstance: faucet } = await getdeployedContractInstance('Faucet', faucetAddress);
    const { contractInstance: schellingCoin } = await getdeployedContractInstance('SchellingCoin', schellingCoinAddress);

    await Promise.all([
        blockManager.init(stakeManagerAddress, stateManagerAddress, voteManagerAddress, jobManagerAddress),
        voteManager.init(stakeManagerAddress, stateManagerAddress, blockManagerAddress),
        stakeManager.init(schellingCoinAddress, voteManagerAddress, blockManagerAddress, stateManagerAddress),
        jobManager.init(stateManagerAddress),
        faucet.init(schellingCoinAddress),
    
        jobManager.grantRole(await constants.getJobConfirmerHash(), blockManagerAddress),
        blockManager.grantRole(await constants.getBlockConfirmerHash(), voteManagerAddress),
        stakeManager.grantRole(await constants.getStakeModifierHash(), blockManagerAddress),
        stakeManager.grantRole(await constants.getStakeModifierHash(), voteManagerAddress),
        stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), voteManagerAddress),
    
        delegator.upgradeDelegate(jobManagerAddress),
        
        // Need to hardcode these addresses in ENV variable and probably seed too.
        schellingCoin.transfer('0x1D68ad204637173b2d8656B7972c57dcE41Bc80e', SEED),
        schellingCoin.transfer('0x9FF5085aa345C019cDF2A427B02Bd6746DeF549B', SEED),
        schellingCoin.transfer('0xc4695904751Ad8414c75798d6Ff2579f55e61522', SEED),
        schellingCoin.transfer('0x40d57C3F5c3BAbac3033E2D50AB7C6886A595F46', SEED),
        schellingCoin.transfer('0xa2B827aCF6073f5D9e2350cbf0646Ba2535a5B0C', SEED),
        schellingCoin.transfer(faucetAddress, SEED)
    ]);
}