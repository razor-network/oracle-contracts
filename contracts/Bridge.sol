pragma solidity 0.5.10;
// pragma experimental ABIEncoderV2;
// import "../SimpleToken.sol";
// import "./Utils.sol";
// import "./BlockStorage.sol";
// import "./IStakeManager.sol";
// import "./IStateManager.sol";
// import "./IVoteManager.sol";
// import "./JobStorage.sol";
// import "./IStateManager.sol";
// import "openzeppelin-solidity/contracts/math/SafeMath.sol";
// import "./Core/WriterRole.sol";


contract Bridge {

    mapping (uint256 => uint256) results;
    address public owner = msg.sender;
    //disable after init.
    // function init(address _stateManagerAddress) external {
    //     stateManager = IStateManager(_stateManagerAddress);
    // }

    function setResult(uint256 id, uint256 result) external {
        require(msg.sender == owner);
        results[id] = result;
    }

    function getResult(uint256 id) external view returns(uint256) {
        return results[id];
    }
}
