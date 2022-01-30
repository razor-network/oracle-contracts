/* TODO:
test same vote values, stakes
test penalizeEpochs */

const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
} = require('./helpers/testHelpers');

const { getState } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const { commit, reveal, propose } = require('./helpers/InternalEngine');

const {
  COLLECTION_MODIFIER_ROLE,
} = require('./helpers/constants');
const {
  calculateDisputesData,
  getEpoch,
  getBiggestStakeAndId,
  getIteration,
  getFalseIteration,
  toBigNumber,
  tokenAmount,
} = require('./helpers/utils');

const { utils } = ethers;

describe('AssignCollectionsRandomly', function () {
  let signers;
  let blockManager;
  let collectionManager;
  let voteManager;
  let razor;
  let stakeManager;
  let initializeContracts;
  let delegator;

  before(async () => {
    ({
      blockManager,
      governance,
      collectionManager,
      razor,
      stakeManager,
      voteManager,
      initializeContracts,
      delegator,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('razor', async () => {
    it('Assign Collections Randomly', async () => {
      /* ///////////////////////////////////////////////////////////////
                          SETUP
      ////////////////////////////////////////////////////////////// */
      /// Nothing is changed here
      /// 10 Jobs
      /// 5 Collections
      /// 3 Stakers

      await Promise.all(await initializeContracts());
      await collectionManager.grantRole(COLLECTION_MODIFIER_ROLE, signers[0].address);
      const url = 'http://testurl.com';
      const selector = 'selector';
      let name;
      const power = -2;
      const selectorType = 0;
      const weight = 50;
      let i = 1;
      while (i <= 10) {
        name = `test${i}`;
        await collectionManager.createJob(weight, power, selectorType, name, selector, url);
        i++;
      }
      while (Number(await getState(await stakeManager.epochLength())) !== 4) { await mineToNextState(); }

      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c1');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c2');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c3');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c4');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c5');

      await mineToNextEpoch();

      await razor.transfer(signers[1].address, tokenAmount('100000'));
      await razor.transfer(signers[2].address, tokenAmount('100000'));
      await razor.transfer(signers[3].address, tokenAmount('100000'));

      await razor.connect(signers[1]).approve(stakeManager.address, tokenAmount('100000'));
      await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('100000'));
      await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('100000'));

      const epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('100000'));
      await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('100000'));
      await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('100000'));

      const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      await commit(signers[1], voteManager, collectionManager, secret);
      await mineToNextState();

      await reveal(signers[1], voteManager);
      await mineToNextState();

      await propose(signers[1], [0, 0, 300, 400, 0], stakeManager, blockManager, voteManager);
      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          DISPUTE
      ////////////////////////////////////////////////////////////// */
      // Dispute will happen on values now, and not stakers
      // as a staker, you have to pass sorted values
      await blockManager.connect(signers[19]).giveSorted(epoch, 2, [300]);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0), 'Block proposed with same medians');

      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          CONFIRM
      ////////////////////////////////////////////////////////////// */
      // Nothing is changed in confirm
      await blockManager.connect(signers[1]).claimBlockReward();
      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
                          DELEGATOR
      ////////////////////////////////////////////////////////////// */
      const collectionName = 'c3';
      const hName = utils.solidityKeccak256(['string'], [collectionName]);
      const result1 = await delegator.getResult(hName);
      assertBNEqual(result1[0], toBigNumber('300'));

      const result2 = await delegator.getResult(utils.solidityKeccak256(['string'], ['c1']));
      assertBNEqual(result2[0], toBigNumber('0'));
    });
    // For this to test everytime, is waste, as it takes sig time
    // Test it whenver change to getDepth is made
    // it('Depth Calculation', async () => {
    //   for (let i = 1; i < 2 ** 16; i++) {
    //     // console.log(Math.log2(i) % 1 === 0 ? Math.log2(i) : Math.ceil(Math.log2(i)));
    //     const x = Math.log2(i) % 1 === 0 ? Math.log2(i) : Math.ceil(Math.log2(i));
    //     const y = Number(await collectionManager.getDepth(i));
    //     console.log(i);
    //     if (x !== y) { console.log('revert', x, y, i); }
    //   }
    // });

    // it('S', async () => {
    //   for (let i = 1; i < 2 ** 16; i++) {
    //     // console.log(Math.log2(i) % 1 === 0 ? Math.log2(i) : Math.ceil(Math.log2(i)));
    //     const x = Math.log2(i) % 1 === 0 ? Math.log2(i) : Math.ceil(Math.log2(i));
    //     const y = Number(await collectionManager.getDepth(i));
    //     console.log(i);
    //     if (x !== y) { console.log('revert', x, y, i); }
    //   }
    // });
  });
});
