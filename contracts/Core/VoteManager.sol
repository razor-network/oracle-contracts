// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IVoteManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IBlockManager.sol";
import "./interface/ICollectionManager.sol";
import "./storage/VoteStorage.sol";
import "./parameters/child/VoteManagerParams.sol";
import "./StateManager.sol";
import "../Initializable.sol";
import "../lib/MerklePosAware.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/** @title VoteManager
 * @notice VoteManager manages the commitments of votes of the stakers
 */

contract VoteManager is Initializable, VoteStorage, StateManager, VoteManagerParams, IVoteManager {
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IBlockManager public blockManager;
    ICollectionManager public collectionManager;

    /**
     * @dev Emitted when a staker commits
     * @param epoch epoch when the commitment was sent
     * @param stakerId id of the staker that committed
     * @param commitment the staker's commitment
     * @param timestamp time when the commitment was set for the staker
     */
    event Committed(uint32 indexed epoch, uint32 indexed stakerId, bytes32 commitment, uint256 timestamp);
    /**
     * @dev Emitted when a staker reveals
     * @param epoch epoch when the staker revealed
     * @param stakerId id of the staker that reveals
     * @param influence influence of the staker
     * @param values of the collections assigned to the staker
     * @param timestamp time when the staker revealed
     */
    event Revealed(uint32 indexed epoch, uint32 indexed stakerId, uint256 influence, Structs.AssignedAsset[] values, uint256 timestamp);
    /**
     * @dev Emitted when bountyHunter snitch the staker
     * @param epoch epoch when the bountyHunter snitch the staker
     * @param stakerId id of the staker that is snitched
     * @param bountyHunter address who will snitch the staker
     */
    event Snitch(uint32 indexed epoch, uint32 indexed stakerId, address indexed bountyHunter);

    /**
     * @param stakeManagerAddress The address of the StakeManager contract
     * @param rewardManagerAddress The address of the RewardManager contract
     * @param blockManagerAddress The address of the BlockManager contract
     * @param collectionManagerAddress The address of the CollectionManager contract
     */
    function initialize(
        address stakeManagerAddress,
        address rewardManagerAddress,
        address blockManagerAddress,
        address collectionManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        blockManager = IBlockManager(blockManagerAddress);
        collectionManager = ICollectionManager(collectionManagerAddress);
    }

    /**
     * @notice stakers query the jobs in collection, aggregate and instead of revealing them instantly,
     * they need to submit a hash of their results which becomes their commitment and send it to the protocol
     * @dev After query and aggregation is done, the staker would have to construct a merkle tree of their votes.
     *
     * The commitment sent by the staker is hash of root of the merkle tree and seed, which
     * is the hash of the salt and the staker's secret.
     *
     * Collection allocation of each staker is done using seed and the staker would know in commit itself their allocations
     * but wouldn't know other staker's allocation unless they have their seed. Hence, it is advisable to fetch results for
     * only those collections that they have been assigned and set rest to 0 and construct a merkle tree accordingly
     *
     * Before the staker's commitment is registered, the staker confirms the block of the previous epoch incase the initial
     * proposer had not confirmed the block. The staker then gets the block reward if confirmed by the staker and is then
     * given out penalties based on their votes in the previous epoch or incase of inactivity.
     *
     * @param epoch epoch when the commitment was sent
     * @param commitment the commitment
     */
    function commit(uint32 epoch, bytes32 commitment) external initialized checkEpochAndState(State.Commit, epoch, buffer) {
        require(commitment != 0x0, "Invalid commitment");
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(!stakeManager.getStaker(stakerId).isSlashed, "VM : staker is slashed");
        require(stakerId > 0, "Staker does not exist");
        require(commitments[stakerId].epoch != epoch, "already commited");
        // Switch to call confirm block only when block in previous epoch has not been confirmed
        // and if previous epoch do have proposed blocks
        // slither-disable-next-line reentrancy-events,reentrancy-no-eth
        if (!blockManager.isBlockConfirmed(epoch - 1)) {
            blockManager.confirmPreviousEpochBlock(stakerId);
        }
        // slither-disable-next-line reentrancy-events,reentrancy-no-eth
        rewardManager.givePenalties(epoch, stakerId);
        uint256 thisStakerStake = stakeManager.getStake(stakerId);
        if (thisStakerStake >= minStake) {
            commitments[stakerId].epoch = epoch;
            commitments[stakerId].commitmentHash = commitment;
            emit Committed(epoch, stakerId, commitment, block.timestamp);
        }
    }

    /**
     * @notice staker reveal the votes that they had committed to the protocol in the commit state.
     * Stakers would only reveal the collections they have been allocated, the rest of their votes wont matter
     * @dev stakers would need to submit their votes in accordance of how they were assigned to the staker.
     * for example, if they are assigned the following ids: [2,5,4], they would to send their votes in the following order only
     * The votes of other ids dont matter but they should not be passed in the values.
     * So staker would have to pass the proof path of the assigned values of the merkle tree, root of the merkle tree and
     * the values being revealed into a struct in the Structs.MerkleTree format.
     * @param epoch epoch when the revealed their votes
     * @param tree the merkle tree struct of the staker
     * @param signature staker's signature on the messageHash which calculates
     * the secret using which seed would be calculated and thereby checking for collection allocation
     */
    function reveal(
        uint32 epoch,
        Structs.MerkleTree memory tree,
        bytes memory signature
    ) external initialized checkEpochAndState(State.Reveal, epoch, buffer) {
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(stakerId > 0, "Staker does not exist");
        require(commitments[stakerId].epoch == epoch, "not committed in this epoch");
        require(tree.values.length == toAssign, "values length mismatch");

        bytes32 seed;
        {
            bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, epoch, block.chainid, "razororacle"));
            require(ECDSA.recover(ECDSA.toEthSignedMessageHash(messageHash), signature) == msg.sender, "invalid signature");
            bytes32 secret = keccak256(signature);

            seed = keccak256(abi.encode(salt, secret));
            require(keccak256(abi.encode(tree.root, seed)) == commitments[stakerId].commitmentHash, "incorrect secret/value");
            uint256 stakerStake = stakeManager.getStake(stakerId);
            require(stakerStake >= minStake, "stake below minimum");
            stakeSnapshot[epoch][stakerId] = stakerStake;
        }
        //below line also avoid double reveal attack since once revealed, commitment has will be set to 0x0
        commitments[stakerId].commitmentHash = 0x0;

        uint256 influence = stakeManager.getInfluence(stakerId);
        influenceSnapshot[epoch][stakerId] = influence;
        uint16 max = collectionManager.getNumActiveCollections();
        for (uint16 i = 0; i < tree.values.length; i++) {
            require(_isAssetAllotedToStaker(seed, i, max, tree.values[i].leafId), "Revealed asset not alloted");
            // If Job Not Revealed before, like its not in same reveal batch of this
            // As it would be redundant to check
            // please note due to this job result cant be zero
            // slither-disable-next-line calls-loop
            uint16 collectionId = collectionManager.getCollectionIdFromLeafId(tree.values[i].leafId);
            if (votes[epoch][stakerId][collectionId] == 0) {
                // Check if asset value is zero
                // Reason for doing this is, staker can vote 0 for assigned coll, and get away with penalties"
                require(tree.values[i].value != 0, "0 vote for assigned coll");
                // reason to ignore : its internal lib not a external call
                // slither-disable-next-line calls-loop
                require(
                    MerklePosAware.verify(
                        tree.proofs[i],
                        tree.root,
                        keccak256(abi.encode(tree.values[i].value)),
                        tree.values[i].leafId,
                        depth,
                        collectionManager.getNumActiveCollections()
                    ),
                    "invalid merkle proof"
                );
                votes[epoch][stakerId][collectionId] = tree.values[i].value;
                voteWeights[epoch][collectionId][tree.values[i].value] = voteWeights[epoch][collectionId][tree.values[i].value] + influence;
                totalInfluenceRevealed[epoch][collectionId] = totalInfluenceRevealed[epoch][collectionId] + influence;
            }
        }

        epochLastRevealed[stakerId] = epoch;

        emit Revealed(epoch, stakerId, influence, tree.values, block.timestamp);
    }

    //bounty hunter revealing secret in commit state
    /**
     * @notice incase the staker's secret and root of the merkle tree is leaked before the staker reveals,
     * a bounty hunter can snitch on the staker and reveal the root and secret to the protocol
     * @dev when the staker is correctly snitched, their stake is slashed and the bounty hunter receives
     * a part of their stake based on the Slash Nums parameters. A staker can be snitched only in the commit state
     * @param epoch epoch when the bounty hunter snitched.
     * @param root of the staker's merkle tree
     * @param secret secret of the staker being snitched
     * @param stakerAddress the address of the staker
     */
    function snitch(
        uint32 epoch,
        bytes32 root,
        bytes32 secret,
        address stakerAddress
    ) external initialized checkEpochAndState(State.Commit, epoch, buffer) {
        require(msg.sender != stakerAddress, "cant snitch on yourself");
        uint32 thisStakerId = stakeManager.getStakerId(stakerAddress);
        require(thisStakerId > 0, "Staker does not exist");
        require(commitments[thisStakerId].epoch == epoch, "not committed in this epoch");
        // avoid innocent staker getting slashed due to empty secret
        require(secret != 0x0, "secret cannot be empty");

        bytes32 seed = keccak256(abi.encode(salt, secret));
        require(keccak256(abi.encode(root, seed)) == commitments[thisStakerId].commitmentHash, "incorrect secret/value");
        //below line also avoid double reveal attack since once revealed, commitment has will be set to 0x0
        commitments[thisStakerId].commitmentHash = 0x0;
        emit Snitch(epoch, thisStakerId, msg.sender);
        stakeManager.slash(epoch, thisStakerId, msg.sender);
    }

    /// @inheritdoc IVoteManager
    function storeSalt(bytes32 _salt) external override initialized onlyRole(SALT_MODIFIER_ROLE) {
        salt = _salt;
    }

    /// @inheritdoc IVoteManager
    function storeDepth(uint256 _depth) external override initialized onlyRole(DEPTH_MODIFIER_ROLE) {
        depth = _depth;
    }

    /**
     * @notice returns the commitment of a particular staker
     * @param stakerId id of the staker whose commitment is required
     * @return commitment the struct of staker's commitment
     */
    function getCommitment(uint32 stakerId) external view returns (Structs.Commitment memory commitment) {
        //epoch -> stakerid -> commitment
        return (commitments[stakerId]);
    }

    /// @inheritdoc IVoteManager
    function getVoteValue(
        uint32 epoch,
        uint32 stakerId,
        uint16 collectionId
    ) external view override returns (uint256) {
        //epoch -> stakerid -> asserId
        return votes[epoch][stakerId][collectionId];
    }

    /// @inheritdoc IVoteManager
    function getVoteWeight(
        uint32 epoch,
        uint16 collectionId,
        uint256 voteValue
    ) external view override returns (uint256) {
        //epoch -> leafId -> voteValue -> weight
        return (voteWeights[epoch][collectionId][voteValue]);
    }

    /// @inheritdoc IVoteManager
    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view override returns (uint256) {
        //epoch -> stakerId
        return (influenceSnapshot[epoch][stakerId]);
    }

    /// @inheritdoc IVoteManager
    function getStakeSnapshot(uint32 epoch, uint32 stakerId) external view override returns (uint256) {
        //epoch -> stakerId
        return (stakeSnapshot[epoch][stakerId]);
    }

    /// @inheritdoc IVoteManager
    function getTotalInfluenceRevealed(uint32 epoch, uint16 collectionId) external view override returns (uint256) {
        return (totalInfluenceRevealed[epoch][collectionId]);
    }

    /// @inheritdoc IVoteManager
    function getEpochLastCommitted(uint32 stakerId) external view override returns (uint32) {
        return commitments[stakerId].epoch;
    }

    /// @inheritdoc IVoteManager
    function getEpochLastRevealed(uint32 stakerId) external view override returns (uint32) {
        return epochLastRevealed[stakerId];
    }

    /// @inheritdoc IVoteManager
    function getSalt() external view override returns (bytes32) {
        return salt;
    }

    /**
     * @dev an internal function used to check whether the particular collection was allocated to the staker
     * @param seed hash of salt and staker's secret
     * @param max maximum number of assets that can be alloted to any of the stakers
     * @param iterationOfLoop positioning of the collection allocation sequence
     * @param leafId leafId of the collection that is being checked for allotment
     */
    function _isAssetAllotedToStaker(
        bytes32 seed,
        uint16 iterationOfLoop,
        uint16 max,
        uint16 leafId
    ) internal view initialized returns (bool) {
        // max= numAssets, prng_seed = seed+ iteration of for loop
        if (_prng(keccak256(abi.encode(seed, iterationOfLoop)), max) == leafId) return true;
        return false;
    }

    /**
     * @dev an internal function used by _isAssetAllotedToStaker to check for allocation
     * @param prngSeed hash of seed and exact position in sequence
     * @param max total number of active collections
     */
    function _prng(bytes32 prngSeed, uint256 max) internal pure returns (uint256) {
        uint256 sum = uint256(prngSeed);
        return (sum % max);
    }
}
