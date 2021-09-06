// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../Initializable.sol";

/**
 * @title InitializableMock
 * @dev This contract is a mock to test initializable functionality
 */
contract InitializableMock is Initializable {
    bool public initializerRan;

    function initializeNested() external initializer {
        initialize();
    }

    function initialize() public initializer {
        initializerRan = true;
    }
}
