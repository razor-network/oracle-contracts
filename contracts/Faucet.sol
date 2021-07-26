// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract Faucet {

    ERC20 public token;
    mapping(address => bool) public requested;
    
    event Donate(address _address, uint256 value);

    constructor(address tokenAddress) {
        token =  ERC20(tokenAddress);
    }

    //WARNING FOR TESTNET ONLY DISABLE FOR PROD.
    //give 10000 sch once per staker
    function faucet(address _address) external {
        if (!requested[_address]) {
            requested[_address] = true;
            // Transfer 10000 Tokens
            token.transfer(_address, 10000 * (10 ** 18));
            emit Donate(_address, 10000 * (10 ** 18));
        }
    }
}