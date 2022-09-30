// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../Core/parameters/child/RandomNoManagerParams.sol";
import "../Core/parameters/ACL.sol";
import "./IRandomNoClient.sol";
import "./IRandomNoProvider.sol";
import "../Initializable.sol";
import "../lib/Random.sol";
import "../Core/StateManager.sol";
import "./RandomNoStorage.sol";

/**
 *  @title : RandomNoManager
 *  @notice : Allows clients to register for random no, and pull it once available
 */

contract RandomNoManager is Initializable, StateManager, RandomNoStorage, RandomNoManagerParams, IRandomNoClient, IRandomNoProvider {
    event RandomNumberAvailable(uint32 indexed epoch);

    /**
     * @param blockManagerAddress The address of the BlockManager Contract
     */
    function initialize(address blockManagerAddress) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(SECRETS_MODIFIER_ROLE, blockManagerAddress);
    }

    /// @inheritdoc IRandomNoClient
    function register() external override initialized returns (bytes32 requestId) {
        uint32 epoch = getEpoch();
        nonce[msg.sender] = nonce[msg.sender] + 1;
        requestId = keccak256(abi.encodePacked(nonce[msg.sender], msg.sender));
        requests[requestId] = epoch + 1;
    }

    /// @inheritdoc IRandomNoProvider
    function provideSecret(uint32 epoch, bytes32 _secret) external override initialized onlyRole(SECRETS_MODIFIER_ROLE) {
        /// @dev this require is added for extra assurance to clients,
        /// to give them assurance that once secret is set for epoch, it cant be changed
        /// as admin could always override this SECRETS_MODIFIER_ROLE role
        require(secrets[epoch] == 0x0, "Secret already set");
        secrets[epoch] = _secret;
        emit RandomNumberAvailable(epoch);
    }

    /// @inheritdoc IRandomNoClient
    function getRandomNumber(bytes32 requestId) external view override returns (uint256) {
        uint32 epochOfRequest = requests[requestId];
        return _generateRandomNumber(epochOfRequest, requestId);
    }

    /// @inheritdoc IRandomNoClient
    function getGenericRandomNumberOfLastEpoch() external view override returns (uint256) {
        uint32 epoch = getEpoch();
        return _generateRandomNumber(epoch - 1, 0);
    }

    /// @inheritdoc IRandomNoClient
    function getGenericRandomNumber(uint32 epoch) external view override returns (uint256) {
        return _generateRandomNumber(epoch, 0);
    }

    function _generateRandomNumber(uint32 epoch, bytes32 requestId) internal view returns (uint256) {
        bytes32 secret = secrets[epoch];
        if (secret == 0x0) {
            revert("Random Number not genarated yet");
        } else {
            return uint256(Random.prngHash(secret, requestId));
        }
    }
}
