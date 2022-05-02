/* eslint-disable prefer-destructuring */
const { network } = require('hardhat');
const { BigNumber } = require('ethers');
const {
  assertBNEqual,
  mineToNextEpoch,
  mineToNextState,
  assertRevert,
  mineBlock,
  mineToNextStateCustom,
} = require('./helpers/testHelpers');

const { calculateDisputesData, toBigNumber } = require('./helpers/utils');
const { setupContracts } = require('./helpers/testSetup');
const {
  commit, reveal, propose, getData, reset,
} = require('./helpers/InternalEngine');

const {
  COLLECTION_MODIFIER_ROLE,
  GOVERNER_ROLE,
} = require('./helpers/constants');
const {
  getEpoch,
  tokenAmount,
  getCollectionIdPositionInBlock,
} = require('./helpers/utils');

describe('UpgradeEpochLength()', function () {
  let signers;
  let blockManager;
  let collectionManager;
  let voteManager;
  let razor;
  let stakeManager;
  let initializeContracts;
  let governance;

  before(async () => {
    ({
      blockManager,
      governance,
      collectionManager,
      razor,
      stakeManager,
      voteManager,
      initializeContracts,
    } = await setupContracts());
    signers = await ethers.getSigners();
  });

  describe('razor', async () => {
    it('UpgradeEpochLength Shouldnt Disturb the Voting flow', async () => {
      await governance.grantRole(GOVERNER_ROLE, signers[0].address);
      await network.provider.send('evm_setNextBlockTimestamp', [2625097600]);

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

      while (Number(await blockManager.getState()) !== 4) {
        if (Number(await blockManager.getState()) === 5) {
          await mineBlock();
        } else {
          await mineToNextState();
        }
      }

      while (i <= 10) {
        name = `test${i}`;
        await collectionManager.createJob(weight, power, selectorType, name, selector, url);
        i++;
      }

      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c0');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c1');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c2');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c3');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c4');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c5');
      await collectionManager.createCollection(500, 3, 1, [1, 2, 3], 'c6');

      await mineToNextEpoch();

      await razor.transfer(signers[1].address, tokenAmount('100000'));
      await razor.transfer(signers[2].address, tokenAmount('100000'));
      await razor.transfer(signers[3].address, tokenAmount('100000'));

      await razor.connect(signers[1]).approve(stakeManager.address, tokenAmount('100000'));
      await razor.connect(signers[2]).approve(stakeManager.address, tokenAmount('100000'));
      await razor.connect(signers[3]).approve(stakeManager.address, tokenAmount('100000'));

      let epoch = await getEpoch();
      await stakeManager.connect(signers[1]).stake(epoch, tokenAmount('100000'));
      await stakeManager.connect(signers[2]).stake(epoch, tokenAmount('100000'));
      await stakeManager.connect(signers[3]).stake(epoch, tokenAmount('100000'));

      const secret = '0x727d5c9e6d18ed15ce7ac8d3cce6ec8a0e9c02481415c0823ea49d847ccb9ddd';
      await reset();
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextState();

      await reveal(signers[1], 0, voteManager, stakeManager);
      await mineToNextState();

      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);

      // Block Proposed
      // [ 1, 2, 7 ] [ 100, 200, 700 ]

      await mineToNextState();

      // Dispute will happen on values now, and not stakers
      // as a staker, you have to pass sorted values
      const data = await getData(signers[1]);
      const validLeafIdToBeDisputed = (data.seqAllotedCollections)[0];
      const {
        sortedValues,
      } = await calculateDisputesData(validLeafIdToBeDisputed,
        voteManager,
        stakeManager,
        collectionManager,
        epoch);
      await blockManager.connect(signers[19]).giveSorted(epoch, validLeafIdToBeDisputed, sortedValues);
      const collectionIndexInBlock = await getCollectionIdPositionInBlock(epoch, await blockManager.sortedProposedBlockIds(epoch, 0),
        signers[19], blockManager, collectionManager);
      await assertRevert(blockManager.connect(signers[19]).finalizeDispute(epoch, 0, collectionIndexInBlock), 'Block proposed with same medians');

      epoch = await blockManager.getEpoch();

      // Before confrim not allowed
      await assertRevert(governance.setEpochLength(1200), 'not a confirm state');

      await mineToNextState();

      /* ///////////////////////////////////////////////////////////////
        Block Confirmation should go as expected, if epoch length is changed before block being confirmed
      ////////////////////////////////////////////////////////////// */

      await governance.setEpochLength(2000);

      /* ///////////////////////////////////////////////////////////////
                          EPOCH X : Buffer
      ////////////////////////////////////////////////////////////// */

      // Initially should be in buffer state
      await assertBNEqual(await blockManager.getState(), 5);
      await assertBNEqual(await blockManager.getEpoch(), epoch);

      // Once buffer passed, in confirm state
      await ethers.provider.send('evm_increaseTime', [5]);
      await ethers.provider.send('evm_mine');

      /* ///////////////////////////////////////////////////////////////
                          EPOCH X : Confirm
      ////////////////////////////////////////////////////////////// */
      await assertBNEqual(await blockManager.getState(), 4);
      await assertBNEqual(await blockManager.getEpoch(), epoch);

      await blockManager.connect(signers[1]).claimBlockReward();

      await assertBNEqual(await blockManager.getState(), 4);
      await assertBNEqual(await blockManager.getEpoch(), epoch);

      // Mine from this present confirm state of update, to commit
      const startingPoint = await blockManager.timeStampOfCurrentEpochLengthUpdate();
      const currentBlockNumber = toBigNumber(await web3.eth.getBlockNumber());
      const currentBlock = await web3.eth.getBlock(currentBlockNumber);
      const currentTimestamp = toBigNumber(currentBlock.timestamp);

      // startingPoint-------------currentTimestamp|
      // ----------------X-------------------------|----------Y-----------
      const X = currentTimestamp.sub(startingPoint);
      const Y = toBigNumber(400).sub(X);
      await ethers.provider.send('evm_increaseTime', [Y.toNumber() + 5]);
      await ethers.provider.send('evm_mine');

      // @dev SAME EPOCH WOULD REMAIN
      await assertBNEqual(await blockManager.getEpoch(), epoch);
      /* ///////////////////////////////////////////////////////////////
                          EPOCH X
      ////////////////////////////////////////////////////////////// */

      await assertBNEqual(await blockManager.getState(), 0);
      await mineToNextStateCustom(BigNumber.from(400));
      await assertBNEqual(await blockManager.getState(), 1);
      await mineToNextStateCustom(BigNumber.from(400));
      await assertBNEqual(await blockManager.getState(), 2);
      await mineToNextStateCustom(BigNumber.from(400));
      // Dispute
      await assertBNEqual(await blockManager.getState(), 3);
      await mineToNextStateCustom(BigNumber.from(400));

      // Confirm
      await assertBNEqual(await blockManager.getState(), 4);
      await mineToNextStateCustom(BigNumber.from(400));

      /* ///////////////////////////////////////////////////////////////
                          EPOCH X + 1
      ////////////////////////////////////////////////////////////// */

      await assertBNEqual(await blockManager.getState(), 0);
      await assertBNEqual(await blockManager.getEpoch(), epoch + 1);

      // Commit
      await commit(signers[1], 0, voteManager, collectionManager, secret, blockManager);
      await mineToNextStateCustom(BigNumber.from(400));

      // Reveal
      await reveal(signers[1], 0, voteManager, stakeManager);
      await mineToNextStateCustom(BigNumber.from(400));

      // Propose
      await propose(signers[1], stakeManager, blockManager, voteManager, collectionManager);
      await mineToNextStateCustom(BigNumber.from(400));

      // Dispute
      // --nothing to dispute-------------
      await mineToNextStateCustom(BigNumber.from(400));

      // Confirm
      await blockManager.connect(signers[1]).claimBlockReward();
      await mineToNextStateCustom(BigNumber.from(400));

      /* ///////////////////////////////////////////////////////////////
                          EPOCH X + 2
      ////////////////////////////////////////////////////////////// */

      await assertBNEqual(await blockManager.getState(), 0);
      await assertBNEqual(await blockManager.getEpoch(), epoch + 2);
    });
  });
});
