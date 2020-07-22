// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.11;
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract Faucet {
    mapping(address => bool) public requested;
    ERC20 public token;

    function init(address _address) external {
        token = ERC20(_address);
    }

    event Donate(address _address, uint256 value);

//WARNING FOR TESTNET ONLY DISABLE FOR PROD.
//give 10000 sch once per staker
    function faucet(address _address) external {
        if (!requested[_address]) {
            requested[_address] = true;
            token.transfer(_address, 10000*(10**uint256(18)));
            emit Donate(_address,  10000*(10**uint256(18)));
        }
    }
}
