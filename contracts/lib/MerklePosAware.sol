// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "hardhat/console.sol";

/**
 * @dev These functions deal with verification of Merkle trees (hash trees),
 */
library MerklePosAware {
    function verifyMultiple(
        bytes32[][] memory proofs,
        bytes32 root,
        bytes32[] memory leaves,
        uint16[] memory medianIndex,
        uint16 depth,
        uint16 maxAssets
    ) internal view returns (bool) {
        for (uint256 i = 0; i < proofs.length; i++) {
            if (!verify(proofs[i], root, leaves[i], medianIndex[i], depth, maxAssets)) return false;
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
        uint16 medianIndex,
        uint16 depth,
        uint16 maxAssets
    ) internal view returns (bool) {
        bytes32 computedHash = leaf;
        bytes memory seq = bytes(getSequence(medianIndex, depth));

        uint256 last_node = maxAssets;
        uint256 my_node = medianIndex + 1;
        uint256 j = depth;
        uint256 i = 0;
        while (j > 0) {
            bytes32 proofElement = proof[i];
            j--;
            //skip proof check  if my node is  last node and number of nodes on level is odd
            if (last_node % 2 == 1 && last_node == my_node) {
                my_node = my_node / 2 + (my_node % 2);
                last_node = last_node / 2 + (last_node % 2);
                continue;
            }
            if (seq[j] == 0x30) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
            i++;

            my_node = my_node / 2 + (my_node % 2);
            last_node = last_node / 2 + (last_node % 2);
        }

        return computedHash == root;
    }

    function getSequence(uint256 medianIndex, uint256 depth) internal pure returns (bytes memory) {
        bytes memory output = new bytes(depth);
        for (uint8 i = 0; i < depth; i++) {
            output[depth - 1 - i] = (medianIndex % 2 == 1) ? bytes1("1") : bytes1("0");
            medianIndex /= 2;
        }
        return output;
    }
}
