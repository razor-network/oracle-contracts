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

contract VoteManager is Initializable, VoteStorage, StateManager, VoteManagerParams, IVoteManager {
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IBlockManager public blockManager;
    ICollectionManager public collectionManager;

    event Committed(uint32 epoch, uint32 stakerId, bytes32 commitment, uint256 timestamp);
    event Revealed(uint32 epoch, uint32 stakerId, Structs.AssignedAsset[] values, uint256 timestamp);

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

    function commit(uint32 epoch, bytes32 commitment) external initialized checkEpochAndState(State.Commit, epoch) {
        require(commitment != 0x0, "Invalid commitment");
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(!stakeManager.getStaker(stakerId).isSlashed, "VM : staker is slashed");
        require(stakerId > 0, "Staker does not exist");
        require(commitments[stakerId].epoch != epoch, "already commited");

        // slither-disable-next-line reentrancy-events,reentrancy-no-eth
        if (!blockManager.isBlockConfirmed(epoch - 1)) {
            blockManager.confirmPreviousEpochBlock(stakerId);
        }
        // slither-disable-next-line reentrancy-events,reentrancy-no-eth
        rewardManager.givePenalties(epoch, stakerId);
        // Switch to call confirm block only when block in previous epoch has not been confirmed
        // and if previous epoch do have proposed blocks
        uint256 thisStakerStake = stakeManager.getStake(stakerId);
        if (thisStakerStake >= minStake) {
            commitments[stakerId].epoch = epoch;
            commitments[stakerId].commitmentHash = commitment;
            emit Committed(epoch, stakerId, commitment, block.timestamp);
        }
    }

    function reveal(
        uint32 epoch,
        Structs.MerkleTree memory tree,
        bytes32 secret
    ) external initialized checkEpochAndState(State.Reveal, epoch) {
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(stakerId > 0, "Staker does not exist");
        require(commitments[stakerId].epoch == epoch, "not committed in this epoch");
        require(tree.values.length == toAssign, "values length mismatch");
        // avoid innocent staker getting slashed due to empty secret
        require(secret != 0x0, "secret cannot be empty");
        bytes32 seed = keccak256(abi.encode(salt, secret));
        require(keccak256(abi.encode(tree.root, seed)) == commitments[stakerId].commitmentHash, "incorrect secret/value");
        {
            uint256 stakerStake = stakeManager.getStake(stakerId);
            require(stakerStake >= minStake, "stake below minimum");
            stakeSnapshot[epoch][stakerId] = stakerStake;
        }
        //below line also avoid double reveal attack since once revealed, commitment has will be set to 0x0
        commitments[stakerId].commitmentHash = 0x0;

        uint256 influence = stakeManager.getInfluence(stakerId);
        influenceSnapshot[epoch][stakerId] = influence;

        for (uint16 i = 0; i < tree.values.length; i++) {
            require(_isAssetAllotedToStaker(seed, i, tree.values[i].activeCollectionIndex), "Revealed asset not alloted");
            // If Job Not Revealed before, like its not in same reveal batch of this
            // As it would be redundant to check
            // please note due to this job result cant be zero
            if (votes[epoch][stakerId][tree.values[i].activeCollectionIndex] == 0) {
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
                        tree.values[i].activeCollectionIndex,
                        depth,
                        collectionManager.getNumActiveCollections()
                    ),
                    "invalid merkle proof"
                );
                // TODO : Possible opt
                /// Can we remove epochs ? would save lot of gas
                votes[epoch][stakerId][tree.values[i].activeCollectionIndex] = tree.values[i].value;
                voteWeights[epoch][tree.values[i].activeCollectionIndex][tree.values[i].value] =
                    voteWeights[epoch][tree.values[i].activeCollectionIndex][tree.values[i].value] +
                    influence;
                totalInfluenceRevealed[epoch][tree.values[i].activeCollectionIndex] =
                    totalInfluenceRevealed[epoch][tree.values[i].activeCollectionIndex] +
                    influence;
            }
        }

        epochLastRevealed[stakerId] = epoch;

        emit Revealed(epoch, stakerId, tree.values, block.timestamp);
    }

    //bounty hunter revealing secret in commit st ate
    function snitch(
        uint32 epoch,
        bytes32 root,
        bytes32 secret,
        address stakerAddress
    ) external initialized checkEpochAndState(State.Commit, epoch) {
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
        stakeManager.slash(epoch, thisStakerId, msg.sender);
    }

    function storeSalt(bytes32 _salt) external override onlyRole(SALT_MODIFIER_ROLE) {
        salt = _salt;
    }

    function storeDepth(uint256 _depth) external override onlyRole(DEPTH_MODIFIER_ROLE) {
        depth = _depth;
    }

    function getCommitment(uint32 stakerId) external view returns (Structs.Commitment memory commitment) {
        //epoch -> stakerid -> commitment
        return (commitments[stakerId]);
    }

    function getVoteValue(
        uint32 epoch,
        uint32 stakerId,
        uint16 activeCollectionIndex
    ) external view override returns (uint32) {
        //epoch -> stakerid -> asserId
        return votes[epoch][stakerId][activeCollectionIndex];
    }

    function getVoteWeight(
        uint32 epoch,
        uint16 activeCollectionIndex,
        uint32 voteValue
    ) external view override returns (uint256) {
        //epoch -> activeCollectionIndex -> voteValue -> weight
        return (voteWeights[epoch][activeCollectionIndex][voteValue]);
    }

    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view override returns (uint256) {
        //epoch -> stakerId
        return (influenceSnapshot[epoch][stakerId]);
    }

    function getStakeSnapshot(uint32 epoch, uint32 stakerId) external view override returns (uint256) {
        //epoch -> stakerId
        return (stakeSnapshot[epoch][stakerId]);
    }

    function getTotalInfluenceRevealed(uint32 epoch, uint16 activeCollectionIndex) external view override returns (uint256) {
        // epoch -> asseted
        return (totalInfluenceRevealed[epoch][activeCollectionIndex]);
    }

    function getEpochLastCommitted(uint32 stakerId) external view override returns (uint32) {
        return commitments[stakerId].epoch;
    }

    function getEpochLastRevealed(uint32 stakerId) external view override returns (uint32) {
        return epochLastRevealed[stakerId];
    }

    function getSalt() external view override returns (bytes32) {
        return salt;
    }

    function _isAssetAllotedToStaker(
        bytes32 seed,
        uint16 iterationOfLoop,
        uint16 activeCollectionIndex
    ) internal view initialized returns (bool) {
        // max= numAssets, prng_seed = seed+ iteration of for loop
        uint16 max = collectionManager.getNumActiveCollections();
        if (_prng(keccak256(abi.encode(seed, iterationOfLoop)), max) == activeCollectionIndex) return true;
        return false;
    }

    function _prng(bytes32 prngSeed, uint256 max) internal pure returns (uint256) {
        uint256 sum = uint256(prngSeed);
        return (sum % max);
    }
}
