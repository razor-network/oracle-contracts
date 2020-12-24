


/* global contract, it, artifacts, assert, web3 */
var SchellingCoin = artifacts.require('./SchellingCoin.sol')
var Constants = artifacts.require('./lib/Constants.sol')
// var Utils = artifacts.require('./lib/Utils.sol')
var Random = artifacts.require('./lib/Random.sol')
var Structs = artifacts.require('./lib/Structs.sol')
// var WriterRole = artifacts.require('./WriterRole.sol')
var BlockManager = artifacts.require('./BlockManager.sol')
var StakeManager = artifacts.require('./StakeManager.sol')
var VoteManager = artifacts.require('./VoteManager.sol')
var StateManager = artifacts.require('./StateManager.sol')
var JobManager = artifacts.require('./JobManager.sol')
var Faucet = artifacts.require('./Faucet.sol')
var Delegator = artifacts.require('./Delegator.sol')

const { assertRevert } = require('./helpers/assertRevert')



let Web3 = require('web3')
const BN = require('bn.js')

let merkle = require('@razor-network/merkle')

let web3i = new Web3(Web3.givenProvider || 'ws://localhost:8545', null, {})
let numBlocks = 10


// Here we will do the negative testing as 

contract("Access Control Test", async accounts => {

    it("fulFillJob() should not be accessable by anyone besides JobConfirmer", async () => {
        let jobManager = await JobManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(jobManager.fulfillJob(2, 222))

        // Checking if BlockConfirmer can access it
        await jobManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await assertRevert(jobManager.fulfillJob(2, 222))

        // Checking if StakeModifier can access it
        await jobManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await assertRevert(jobManager.fulfillJob(2, 222))

        // Checking if StakerActivityUpdater can access it
        await jobManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await assertRevert(jobManager.fulfillJob(2, 222))

        // revoking is important to not impact other test cases
        await jobManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await jobManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);
        await jobManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);

    });

    it("fulFillJob() should be accessable by only JobConfirmer", async () => {
        let jobManager = await JobManager.deployed();
        let constants = await Constants.deployed();
        await jobManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await jobManager.fulfillJob(2, 222);
        await jobManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);

    });

    it("confirmBlock() should not be accessable by anyone besides BlockConfirmer", async () => {
        let blockManager = await BlockManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(blockManager.confirmBlock());

        // Checking if JobConfirmer can access it
        await blockManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await assertRevert(blockManager.confirmBlock())

        // Checking if StakeModifier can access it
        await blockManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await assertRevert(blockManager.confirmBlock())

        // Checking if StakerActivityUpdater can access it
        await blockManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await assertRevert(blockManager.confirmBlock())


        await blockManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);
        await blockManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);
        await blockManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);

    });

    it("confirmBlock() should be accessable by BlockConfirmer", async () => {
        let blockManager = await BlockManager.deployed();
        let constants = await Constants.deployed();
        await blockManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await blockManager.confirmBlock()
        await blockManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
    });

    it("slash() should not be accessable by anyone besides StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(stakeManager.slash(1, accounts[2], 1));

        // Checking if JobConfirmer can access it
        await stakeManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.slash(1, accounts[2], 1))

        // Checking if BlockConfirmer can access it
        await stakeManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.slash(1, accounts[2], 1))

        // Checking if StakerActivityUpdater can access it
        await stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await assertRevert(stakeManager.slash(1, accounts[2], 1))


        await stakeManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);

    });

    it("slash() should be accessable by StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();


        await stakeManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await stakeManager.slash(1, accounts[2], 1)
        await stakeManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);
    });


    it("giveBlockReward() should not be accessable by anyone besides StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(stakeManager.giveBlockReward(1, 1));

        // Checking if JobConfirmer can access it
        await stakeManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.giveBlockReward(1, 1))

        // Checking if BlockConfirmer can access it
        await stakeManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.giveBlockReward(1, 1))

        // Checking if StakerActivityUpdater can access it
        await stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await assertRevert(stakeManager.giveBlockReward(1, 1))

        await stakeManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);

    });

    it("giveBlockReward() should be accessable by StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();


        await stakeManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await stakeManager.giveBlockReward(1, 1)
        await stakeManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);
    });

    it("giveRewards() should not be accessable by anyone besides StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(stakeManager.giveRewards(1, 1));

        // Checking if JobConfirmer can access it
        await stakeManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.giveRewards(1, 1))

        // Checking if BlockConfirmer can access it
        await stakeManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.giveRewards(1, 1))

        // Checking if StakerActivityUpdater can access it
        await stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await assertRevert(stakeManager.giveRewards(1, 1))

        await stakeManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);

    });

    it("giveRewards() should be accessable by StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();


        await stakeManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await stakeManager.giveRewards(1, 1)
        await stakeManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);
    });

    it("givePenalties() should not be accessable by anyone besides StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(stakeManager.givePenalties(1, 1));

        // Checking if JobConfirmer can access it
        await stakeManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.givePenalties(1, 1))

        // Checking if BlockConfirmer can access it
        await stakeManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.givePenalties(1, 1))

        // Checking if StakerActivityUpdater can access it
        await stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await assertRevert(stakeManager.givePenalties(1, 1))

        await stakeManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);

    });

    it("givePenalties() should be accessable by StakeModifier", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();


        await stakeManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await stakeManager.givePenalties(1, 1)
        await stakeManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);
    });

    it("setStakerEpochLastRevealed() should not be accessable by anyone besides StakerActivityUpdater", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1));

        // Checking if JobConfirmer can access it
        await stakeManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1))

        // Checking if BlockConfirmer can access it
        await stakeManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1))

        // Checking if StakeModifier can access it
        await stakeManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await assertRevert(stakeManager.setStakerEpochLastRevealed(1, 1))


        await stakeManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);

    });

    it("setStakerEpochLastRevealed() should be accessable by StakerActivityUpdater", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();


        await stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await stakeManager.setStakerEpochLastRevealed(1, 1)
        await stakeManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
    });

    it("updateCommitmentEpoch() should not be accessable by anyone besides StakerActivityUpdater", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();

        // Checking if Anyone can access it 
        await assertRevert(stakeManager.updateCommitmentEpoch(1));

        // Checking if JobConfirmer can access it
        await stakeManager.grantRole(await constants.getJobConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.updateCommitmentEpoch(1))

        // Checking if BlockConfirmer can access it
        await stakeManager.grantRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await assertRevert(stakeManager.updateCommitmentEpoch(1))

        // Checking if StakeModifier can access it
        await stakeManager.grantRole(await constants.getStakeModifierHash(), accounts[0]);
        await assertRevert(stakeManager.updateCommitmentEpoch(1))


        await stakeManager.revokeRole(await constants.getJobConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getBlockConfirmerHash(), accounts[0]);
        await stakeManager.revokeRole(await constants.getStakeModifierHash(), accounts[0]);

    });

    it("updateCommitmentEpoch() should be accessable by StakerActivityUpdater", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();
        await stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
        await stakeManager.updateCommitmentEpoch(1)
        await stakeManager.revokeRole(await constants.getStakerActivityUpdaterHash(), accounts[0]);
    });

    it("Default Admin should able to change, New admin should able to grant/revoke", async () => {
        let stakeManager = await StakeManager.deployed();
        let constants = await Constants.deployed();
        let DEFAULT_ADMIN_ROLE_HASH = "0x00";

        // Old admin should be able to grant admin role to another account
        await stakeManager.grantRole(DEFAULT_ADMIN_ROLE_HASH, accounts[1]);

        // New admin should be able to revoke admin access from old admin
        await stakeManager.revokeRole(DEFAULT_ADMIN_ROLE_HASH, accounts[0], { 'from': accounts[1] });

        // Old admin should not able to assign roles anymore
        await assertRevert(stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0]));

        // New admin should be able to assign roles
        await stakeManager.grantRole(await constants.getStakerActivityUpdaterHash(), accounts[0], { 'from': accounts[1] });

    });
});