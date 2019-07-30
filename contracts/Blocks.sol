pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "./SimpleToken.sol";
import "./Votes.sol";
import "./States.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/Constants.sol";
import "./lib/SharedStructs.sol";


contract Blocks {
    mapping (uint256 => SharedStructs.Block) public blocks;

        //return price from last epoch
    function getPrice(uint256 assetId) public view returns (uint256) {
        uint256 epoch = States.getEpoch();
        return(blocks[epoch-1].medians[assetId]);
    }
}