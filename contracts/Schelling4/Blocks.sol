pragma solidity 0.5.10;
import "../lib/Structs.sol";


contract Blocks {
    mapping (uint256 => Structs.Block) public blocks;
    uint256 lol;

    function dum() public {
        lol = 55;
    }
}
