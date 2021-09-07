// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../Core/interface/IParameters.sol";
import "./IRandomNoClient.sol";
import "./IRandomNoProvider.sol";
import "../Initializable.sol";
import "../lib/Random.sol";
import "../Core/StateManager.sol";
import "../Core/ACL.sol";
import "./RandomNoStorage.sol";

/**
 *  @title : RandomNoManager
 *  @notice : Allows clients to register for random no, and pull it once available
 */

contract RandomNoManager is Initializable, ACL, StateManager, RandomNoStorage, IRandomNoClient, IRandomNoProvider {
    IParameters public parameters;

    event RandomNumberAvailable(uint32 epoch);

    /// @param blockManagerAddress The address of the BlockManager Contract
    /// @param parametersAddress The address of the Parameters contract
    function initialize(address blockManagerAddress, address parametersAddress) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(SECRETS_MODIFIER_ROLE, blockManagerAddress);
        parameters = IParameters(parametersAddress);
    }

    /// @notice Allows Client to register for random number
    /// Per request a rquest id is generated, which is binded to one epoch
    /// this epoch is current epoch if Protocol is in commit state, and epoch + 1 if in any other state
    /// @return requestId : A unique id per request
    function register() external override initialized returns (uint256) {
        uint32 epoch = getEpoch(parameters.epochLength());
        State state = getState(parameters.epochLength());
        requestId = requestId + 1;
        if (state == State.Commit) {
            requests[requestId] = epoch;
        } else {
            requests[requestId] = epoch + 1;
        }
        return requestId;
    }

    /// @notice Called by BlockManager in ClaimBlockReward or ConfirmBlockLastEpoch in confirm state
    /// @param epoch current epoch
    /// @param _secret hash of encoded rando secret from stakers
    function provideSecret(uint32 epoch, bytes32 _secret) external override onlyRole(SECRETS_MODIFIER_ROLE) {
        /// @dev this require is added for extra assurance to clients,
        /// to give them assurance that once secret is set for epoch, it cant be changed
        /// as admin could always override this SECRETS_MODIFIER_ROLE role
        require(secrets[epoch] == 0x0, "secret already set");
        secrets[epoch] = _secret;
        emit RandomNumberAvailable(epoch);
    }

    /// @notice Allows client to pull random number once available
    /// Random no is generated from secret of that epoch and request id, its unique per requestid
    /// @param _requestId : A unique id per request
    /// @return random number
    function getRandomNumber(uint256 _requestId) external view override returns (uint256) {
        uint32 epochOfRequest = requests[_requestId];
        bytes32 secret = secrets[epochOfRequest];

        if (secret == 0x0) {
            revert("Random Number not genarated yet");
        } else {
            return uint256(Random.prngHash(secret, keccak256(abi.encode(_requestId))));
        }
    }

    /// @notice Allows client to get generic random number of last epoch
    /// @return random number
    function getGenericRandomNumberOfLastEpoch() external view override returns (uint256) {
        uint32 epoch = getEpoch(parameters.epochLength());
        return getGenericRandomNumber(epoch - 1);
    }

    /// @notice Allows client to get generic random number of any epoch
    /// @param epoch random no of which epoch
    /// @return random number
    function getGenericRandomNumber(uint32 epoch) public view override returns (uint256) {
        bytes32 secret = secrets[epoch];
        if (secret == 0x0) {
            revert("Random Number not genarated yet");
        } else {
            return uint256(Random.prngHash(secret, keccak256(abi.encode(0))));
        }
    }
}
