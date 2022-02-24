// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../lib/MerklePosAware.sol";

contract MerklePosAwareTest {
    function verifyMultiple(
        bytes32[][] memory proofs,
        bytes32 root,
        bytes32[] memory leaves,
        uint16[] memory activeCollectionIndex,
        uint256 depth,
        uint16 maxAssets
    ) external pure returns (bool) {
        return MerklePosAware.verifyMultiple(proofs, root, leaves, activeCollectionIndex, depth, maxAssets);
    }

    // function verify(
    //     bytes32[] memory proof,
    //     bytes32 root,
    //     bytes32 leaf,
    //     uint16 activeCollectionIndex,
    //     uint256 depth,
    //     uint16 maxAssets
    // ) external pure returns (bool) {
    //     return MerklePosAware.verify(proof, root, leaf, activeCollectionIndex, depth, maxAssets);
    // }

    // function getSequence(uint256 activeCollectionIndex, uint256 depth) external pure returns (string memory) {
    //     return string(MerklePosAware.getSequence(activeCollectionIndex, depth));
    // }
}
