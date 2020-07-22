// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.11;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Constants.sol";


library Random {
    using SafeMath for uint256;

    // pseudo random number generator based on block hashes. returns 0 -> max-1
    function prng (uint8 numBlocks, uint256 max, bytes32 seed) public view returns (uint256) {
        bytes32 hashh = prngHash(numBlocks, seed);
        uint256 sum = uint256(hashh);
        return(sum.mod(max));
    }

    // pseudo random hash generator based on block hashes.
    function prngHash (uint8 numBlocks, bytes32 seed) public view returns(bytes32) {
        bytes32 sum = blockHashes(numBlocks);
        sum = keccak256(abi.encodePacked(sum, seed));
        return(sum);
    }

    function blockHashes (uint8 numBlocks) public view returns(bytes32) {
        bytes32 sum;
        //lets start from the start of the epoch
        uint256 blockNumberEpochStart = (block.number.div(Constants.epochLength())).mul(Constants.epochLength());
        for (uint8 i = 1; i <= numBlocks; i++) {
            sum = keccak256(abi.encodePacked(sum, blockhash(blockNumberEpochStart.sub(i))));
        }
        return(sum);
    }
}
