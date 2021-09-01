// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Random {
    // pseudo random number generator based on block hashes. returns 0 -> max-1
    function prng(uint256 max, bytes32 randHash) external pure returns (uint256) {
        uint256 sum = uint256(randHash);
        return (sum % max);
    }

    // pseudo random hash generator based on block hashes.
    function prngHash(bytes32 seed, bytes32 salt) external pure returns (bytes32) {
        bytes32 prngHashVal = keccak256(abi.encodePacked(seed, salt));
        return (prngHashVal);
    }
}
