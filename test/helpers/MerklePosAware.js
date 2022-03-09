const { utils } = require('ethers');

const createMerkle = async (values) => {
  let tree = [];
  const leafs = [];
  // Hash all values
  for (let i = 0; i < values.length; i++) {
    leafs.push(utils.solidityKeccak256(['uint256'], [values[i]]));
  }

  let level = leafs;
  let nextLevel = [];
  tree.push(level);

  while (level.length !== 1) {
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        nextLevel.push(utils.solidityKeccak256(['bytes32', 'bytes32'], [level[i], level[i + 1]]));
      } else nextLevel.push(level[i]);
    }
    level = nextLevel;
    tree.push(level);
    nextLevel = [];
  }
  tree = tree.reverse();
  return tree;
};

const getProofPath = async (tree, leafId) => {
  let index = leafId;
  const compactProofPath = [];
  for (let currentLevel = tree.length - 1; currentLevel > 0; currentLevel--) {
    const currentLevelNodes = tree[currentLevel];
    const currentLevelCount = currentLevelNodes.length;

    // if this is an odd end node to be promoted up, skip to avoid proofs with null values
    if (index === currentLevelCount - 1 && currentLevelCount % 2 === 1) {
      index = Math.floor(index / 2);
      // eslint-disable-next-line no-continue
      continue;
    }

    const nodes = { left: '0', right: '0' };
    if (index % 2) {
      // the index is the right node
      nodes.left = currentLevelNodes[index - 1];
      nodes.right = currentLevelNodes[index];
      compactProofPath.push(nodes.left);
    } else {
      nodes.left = currentLevelNodes[index];
      nodes.right = currentLevelNodes[index + 1];
      compactProofPath.push(nodes.right);
    }

    index = Math.floor(index / 2); // set index to the parent index
  }
  return compactProofPath;
};

module.exports = {
  createMerkle,
  getProofPath,
};
