let functions = require('./helpers/functions')
let StakeManager = artifacts.require('./StakeManager.sol')

// By Default we skip this test as it takes very long time to pass with current defaults.
// So now if we want to test this we can do so by doing follwoing changes and then you can remove skip

// 1) To run this simulation one would have to change visibilty of _calculateBlockReward() to public 

// 2) 
// With Current Constants It would take long time to reach blockReward 0
// So Please update constants in Constants.sol to lower numbers
// Something Like this
// function initialBlockReward() public pure returns(uint256) { return(100*(10**uint256(18)));}
// function halvingInterval() public pure returns(uint256) { return(2);}

// 3) 
// As _CalculateBlockReward is non_view on return we reive tx receipt
// Hence we will have to getvalues by events
// Please define this event

// event getBlockReward(
//     uint256 _genesisBlock,
//     uint256 _blockNumber,
//     uint256 _blockReward,
//     uint256 _halvings
// );

// And emit it in _calcualteBlockRewards()

// Thats all you have to do

contract.skip('Block Reward Test', function (accounts) {

    it('Stimulate BlockRewardFunction and It Should not Overflow', async function () {
        let stakeManager = await StakeManager.deployed()
        let data = [];
        var i = 0;
        while (i < 3) {
            try {
                let txreceipt = await stakeManager._calculateBlockReward();
                let args = txreceipt.logs[0].args;
                data.push({ 'Genesis Block': Number(args['0']), 'No': Number(args['1']), 'BlockReward': Number(args['2']), 'Halvings': Number(args['3']) });
                if (Number(args['2']) == 0) i++;
                console.log(data[data.length - 1]);
                await functions.waitNBlocks(0);
            } catch (error) {
                console.log("Take Care :" + error);
            }

        }
        let verify = data[data.length - 1].BlockReward;
        assert(verify === 0)
    })

})
