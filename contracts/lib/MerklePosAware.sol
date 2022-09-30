// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev These functions deal with verification of Merkle trees (hash trees),
 */
library MerklePosAware {
    function verifyMultiple(
        bytes32[][] memory proofs,
        bytes32 root,
        bytes32[] memory leaves,
        uint16[] memory leafId,
        uint256 depth,
        uint16 maxAssets
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < proofs.length; i++) {
            if (!verify(proofs[i], root, leaves[i], leafId[i], depth, maxAssets)) return false;
        }
        return true;
    }

    /**
     * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
     * defined by `root`. For this, a `proof` must be provided, containing
     * sibling hashes on the branch from the leaf to the root of the tree. Each
     * pair of leaves and each pair of pre-images are assumed to be sorted.
     */
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf,
        uint16 leafId,
        uint256 depth,
        uint16 maxAssets
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        bytes memory seq = bytes(getSequence(leafId, depth));

        uint256 lastNode = maxAssets;
        uint256 myNode = leafId + 1;
        uint256 j = depth;
        uint256 i = 0;
        while (j > 0) {
            bytes32 proofElement = proof[i];
            j--;
            // check  proof if my node is not last node and number of nodes on level is not odd
            if (!(lastNode % 2 == 1 && lastNode == myNode)) {
                // 0x30 is 0, 0x31 is 1
                if (seq[j] == 0x30) {
                    computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
                } else {
                    computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
                }
                i++;
            }

            myNode = myNode / 2 + (myNode % 2);
            lastNode = lastNode / 2 + (lastNode % 2);
        }

        return computedHash == root;
    }

    function getSequence(uint256 leafId, uint256 depth) internal pure returns (bytes memory) {
        bytes memory output = new bytes(depth);
        for (uint8 i = 0; i < depth; i++) {
            output[depth - 1 - i] = (leafId % 2 == 1) ? bytes1("1") : bytes1("0");
            leafId /= 2;
        }
        return output;
    }
}
