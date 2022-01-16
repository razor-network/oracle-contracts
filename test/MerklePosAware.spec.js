const { expect } = require('chai');
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
      for (let i = 1; i <= maxNodes; i++) {
        votes.push(i * 100);
      }
      for (let i = 1; i <= maxNodes; i++) {
        console.log(i);
        const votesThisItr = votes.slice(0, i);
        const tree = await createMerkle(votesThisItr);
        console.log(tree);
        const proofs = [];
        const assetIds = [];
        const leaves = [];
        const depth = Math.log2(i) % 1 === 0 ? Math.log2(i) : Math.ceil(Math.log2(i));
        for (let j = 0; j < i; j++) {
          const tree = await createMerkle(votesThisItr);
          proofs.push(await getProofPath(tree, j + 1));
          leaves.push(ethers.utils.solidityKeccak256(['uint256'], [votes[j]]));
          assetIds.push(j + 1);
        }
        console.log('asdasd', proofs, tree[0][0], leaves, assetIds, depth);
        expect(await Merkle.verifyMultiple(proofs, tree[0][0], leaves, assetIds, depth, i)).to.be.true;
      }
    });
  });
});
