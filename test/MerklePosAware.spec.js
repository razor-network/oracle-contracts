const { expect, assert } = require('chai');
const { createMerkle, getProofPath } = require('./helpers/MerklePosAware');

describe('Unit tests', function () {
  let Merkle;

  before(async function () {
    // const Governance = await ethers.getContractFactory('Governance');
    Merkle = (await (
      await ethers.getContractFactory('MerklePosAwareTest')
    ).deploy());
  });

  describe('MerklePosAware', function () {
    it('Tree from 1 nodes to 11 nodes', async function () {
      const maxNodes = 11;
      const votes = [];
      const randomHash = '0x26700e13983fefbd9cf16da2ed70fa5c679beb55062a4803121a869731e308d2';
      for (let i = 1; i <= maxNodes; i++) {
        votes.push(i * 100);
      }
      for (let i = 1; i <= maxNodes; i++) {
        const votesThisItr = votes.slice(0, i);
        const tree = await createMerkle(votesThisItr);
        const proofs = [];
        const leafId = [];
        const leaves = [];
        const depth = Math.ceil(Math.log2(i));
        for (let j = 0; j < i; j++) {
          const tree = await createMerkle(votesThisItr);
          proofs.push(await getProofPath(tree, j));
          leaves.push(ethers.utils.solidityKeccak256(['uint256'], [votes[j]]));
          leafId.push(j);
        }
        // console.log('asdasd', proofs, tree[0][0], leaves, medianIndex, depth);
        expect(await Merkle.verifyMultiple(proofs, randomHash, leaves, leafId, depth, i)).to.be.false;
        expect(await Merkle.verifyMultiple(proofs, tree[0][0], leaves, leafId, depth, i)).to.be.true;
      }
    });
    it('Tests for getSequence', async function () {
      const maxNodes = 100;
      for (let i = 2; i <= maxNodes; i++) {
        const depth = Math.ceil(Math.log2(i));
        for (let j = 0; j < i; j++) {
          let output = '';
          let leafId = j;
          for (let k = 0; k < depth; k++) {
            if (leafId % 2 === 1) {
              output = `1${output}`;
            } else {
              output = `0${output}`;
            }
            leafId = Math.floor(leafId / 2);
          }
          const asciiOutput = String(await Merkle.getSequence(j, depth));
          let binary = '';
          const arr = asciiOutput.split('3');
          for (let k = 1; k < arr.length; k++) {
            binary += arr[k];
          }
          assert(binary === output, 'incorrect sequence');
        }
      }
    }).timeout(400000);
  });
});
