pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

/**
 * @title SchellingCoin
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */

contract SchellingCoin is ERC20, ERC20Detailed, ERC20Mintable {
    uint8 public constant DECIMALS = 18;
    //50 million supply. rest should be mineable
    uint256 public constant INITIAL_SUPPLY = 50000000 * (10 ** uint256(DECIMALS));

    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor () public ERC20Detailed("SchellingCoin", "SCH", DECIMALS) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

}
