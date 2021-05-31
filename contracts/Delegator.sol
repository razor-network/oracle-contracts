// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import "./Core/interface/IAssetManager.sol";


contract Delegator {

    address public delegate;
    address public owner = msg.sender;
    IAssetManager public assetManager;

    function getJob(
        uint256 id
    ) 
        external
        view
        returns(
            string memory url,
            string memory selector,
            string memory name,
            bool repeat,
            uint256 result
        )
    {
        return assetManager.getJob(id);
    }

    function upgradeDelegate(address newDelegateAddress) public {
        require(msg.sender == owner, "caller is not the owner");
        delegate = newDelegateAddress;
        assetManager = IAssetManager(newDelegateAddress);
    }

    function getResult(uint256 id) public view returns(uint256) {
        return assetManager.getResult(id);
    }
}
