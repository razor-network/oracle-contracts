pragma solidity 0.5.10;
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract Faucet is ERC20 {
    mapping(address => bool) public requested;
    ERC20 public token;

    function init(address _address) external {
        token = ERC20(_address);
    }

//WARNING FOR TESTNET ONLY DISABLE FOR PROD.
//give 1000 sch once per staker
    function faucet(address _address) external {
        if (!requested[_address]) {
            requested[_address] = true;
            token.transfer(_address, 1000);
        }
    }
}
