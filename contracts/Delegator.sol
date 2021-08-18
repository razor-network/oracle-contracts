// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/interface/IAssetManager.sol";

contract Delegator {
    address public delegate;
    IAssetManager public assetManager;
    address public owner = msg.sender;

    function upgradeDelegate(address newDelegateAddress) external {
        require(msg.sender == owner, "Caller is not owner");
        delegate = newDelegateAddress;
        assetManager = IAssetManager(newDelegateAddress);
    }

    function getJob(uint8 id)
        external
        view
        returns (
            bool repeat,
            uint32 result,
            string memory name,
            string memory selector,
            string memory url
        )
    {
        return assetManager.getJob(id);
    }

    // function getResult(uint8 id) public view returns (uint256) {
    //     return assetManager.getResult(id);
    // }
}
