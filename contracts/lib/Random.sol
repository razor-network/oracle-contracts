// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


library Random {

    // pseudo random number generator based on block hashes. returns 0 -> max-1
    function prng(uint8 numBlocks, uint256 max, bytes32 seed, uint256 epochLength) public view returns (uint256) {
        bytes32 hash = prngHash(numBlocks, seed, epochLength);
        uint256 sum = uint256(hash);
        return(sum%max);
    }

    // pseudo random hash generator based on block hashes.
    function prngHash(uint8 numBlocks, bytes32 seed, uint256 epochLength) public view returns(bytes32) {
        bytes32 sum = blockHashes(numBlocks, epochLength);
        sum = keccak256(abi.encodePacked(sum, seed));
        return(sum);
    }

    function blockHashes(uint8 numBlocks, uint256 epochLength) public view returns(bytes32) {
        bytes32 sum;
        // start from the start of the epoch
        uint256 blockNumberEpochStart = (block.number/(epochLength))*(epochLength);
        for (uint8 i = 1; i <= numBlocks; i++) {
            sum = keccak256(abi.encodePacked(sum, blockhash(blockNumberEpochStart - i)));
        }
        return(sum);
    }
}
