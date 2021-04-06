pragma solidity ^0.8.0;
import "../lib/Structs.sol";


contract BlockStorage {
    //epoch->address->dispute->assetid
    mapping (uint256 => mapping (address => Structs.Dispute)) public disputes;
    //epoch -> numProposedBlocks
    // mapping (uint256 => uint256) public numProposedBlocks;
    //epoch -> proposalNumber -> block
    mapping (uint256 => Structs.Block[]) public proposedBlocks;
    mapping (uint256 => Structs.Block) public blocks;

    // function getBlock(uint256 epoch) public view returns(Structs.Block memory _block) {
    //     return(blocks[epoch]);
    // }
}
