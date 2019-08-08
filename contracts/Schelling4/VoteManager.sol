pragma solidity 0.5.10;
// pragma experimental ABIEncoderV2;
// import "../SimpleToken.sol";
// import "./Utils.sol";
// import "../lib/Random.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../lib/Structs.sol";


contract VoteManager {
    //epoch->stakerid->commitment
    mapping (uint256 => mapping (uint256 => bytes32)) public commitments;
    //epoch->stakerid->assetid->vote
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => Structs.Vote))) public votes;
    // epoch -> asset -> stakeWeight
    mapping (uint256 =>  mapping (uint256 => uint256)) public totalStakeRevealed;
    //epoch->assetid->voteValue->weight
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => uint256))) public voteWeights;

    uint256 public lol;
    
    function dum() public {
        lol = 55;
    }
}
