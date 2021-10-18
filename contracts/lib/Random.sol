// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Random {
    // pseudo random number generator based on hash. returns 0 -> max-1
    // slither ignore reason : Internal library
    // slither-disable-next-line dead-code
    function prng(uint256 max, bytes32 randHash) internal pure returns (uint256) {
        uint256 sum = uint256(randHash);
        return (sum % max);
    }

    // pseudo random hash generator based on hashes.
    // slither ignore reason : Internal library
    // slither-disable-next-line dead-code
    function prngHash(bytes32 seed, bytes32 salt) internal pure returns (bytes32) {
        bytes32 prngHashVal = keccak256(abi.encodePacked(seed, salt));
        return (prngHashVal);
    }
}
