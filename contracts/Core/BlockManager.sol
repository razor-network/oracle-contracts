// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IBlockManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IVoteManager.sol";
import "./interface/ICollectionManager.sol";
import "../randomNumber/IRandomNoProvider.sol";
import "./storage/BlockStorage.sol";
import "./parameters/child/BlockManagerParams.sol";
import "./StateManager.sol";
import "../lib/Random.sol";
import "../Initializable.sol";

/** @title BlockManager
 * @notice BlockManager manages the proposal, confirmation and dispute of blocks
 */

contract BlockManager is Initializable, BlockStorage, StateManager, BlockManagerParams, IBlockManager {
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IVoteManager public voteManager;
    ICollectionManager public collectionManager;
    IRandomNoProvider public randomNoProvider;

    /**
     * @dev Emitted when a block is confirmed
     * @param epoch epoch when the block was confirmed
     * @param stakerId id of the staker that confirmed the block
     * @param medians of the confirmed block
     * @param timestamp time when the block was confirmed
     */
    event BlockConfirmed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 timestamp);

    /**
     * @dev Emitted when a block is proposed
     * @param epoch epoch when the block was proposed
     * @param stakerId id of the staker that proposed the block
     * @param medians of the proposed block
     * @param iteration staker's iteration
     * @param biggestStakerId id of the staker that has the highest stake amongst the stakers that revealed
     * @param timestamp time when the block was proposed
     */
    event Proposed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 iteration, uint32 biggestStakerId, uint256 timestamp);

    /**
     * @param stakeManagerAddress The address of the StakeManager contract
     * @param rewardManagerAddress The address of the RewardManager contract
     * @param voteManagerAddress The address of the VoteManager contract
     * @param collectionManagerAddress The address of the CollectionManager contract
     * @param randomNoManagerAddress The address of the RandomNoManager contract
     */
    function initialize(
        address stakeManagerAddress,
        address rewardManagerAddress,
        address voteManagerAddress,
        address collectionManagerAddress,
        address randomNoManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        voteManager = IVoteManager(voteManagerAddress);
        collectionManager = ICollectionManager(collectionManagerAddress);
        randomNoProvider = IRandomNoProvider(randomNoManagerAddress);
    }

    /**
     * @notice elected proposer proposes block.
     * we use a probabilistic method to elect stakers weighted by stake
     * protocol works like this.
     * to find the iteration of a staker, a bias coin is tossed such that
     * bias = hisStake/biggestStake revealed. if its heads, he can propose block
     * end of iteration. try next iteration
     * stakers elected in higher iterations can also propose hoping that
     * stakers with lower iteration do not propose for some reason
     * @dev The IDs being passed here, are only used for disputeForNonAssignedCollection
     * for delegator, we have seprate registry
     * If user passes invalid ids, disputeForProposedCollectionIds can happen
     * @param epoch in which the block was proposed
     * @param ids ids of the proposed block
     * @param medians medians of the proposed block
     * @param iteration number of times a biased coin was thrown to get a head
     * @param biggestStakerId id of the staker that has the biggest stake amongst the stakers that have revealed
     */
    function propose(
        uint32 epoch,
        uint16[] memory ids,
        uint32[] memory medians,
        uint256 iteration,
        uint32 biggestStakerId
    ) external initialized checkEpochAndState(State.Propose, epoch) {
        uint32 proposerId = stakeManager.getStakerId(msg.sender);
        require(_isElectedProposer(iteration, biggestStakerId, proposerId, epoch), "not elected");
        require(stakeManager.getStake(proposerId) >= minStake, "stake below minimum stake");
        //staker can just skip commit/reveal and only propose every epoch to avoid penalty.
        //following line is to prevent that
        // Below line can't be tested since if not revealed staker most of the times reverts with "not elected"
        require(voteManager.getEpochLastRevealed(proposerId) == epoch, "Cannot propose without revealing");
        require(epochLastProposed[proposerId] != epoch, "Already proposed");

        uint256 biggestStake = voteManager.getStakeSnapshot(epoch, biggestStakerId);
        if (sortedProposedBlockIds[epoch].length == 0) numProposedBlocks = 0;
        proposedBlocks[epoch][numProposedBlocks] = Structs.Block(true, proposerId, medians, ids, iteration, biggestStake);
        bool isAdded = _insertAppropriately(epoch, numProposedBlocks, iteration, biggestStake);
        epochLastProposed[proposerId] = epoch;
        if (isAdded) {
            numProposedBlocks = numProposedBlocks + 1;
        }
        emit Proposed(epoch, proposerId, medians, iteration, biggestStakerId, block.timestamp);
    }

    /**
     * @notice if someone feels that median result of a collection in a block is not in accordance to the protocol,
     * giveSorted() needs to be called to setup the dispute where in, the correct median will be calculated based on the votes
     * reported by stakers
     * @param epoch in which the dispute was setup and raised
     * @param leafId index of the collection that is to be disputed
     * @param sortedValues values reported by staker for a collection in ascending order
     */
    function giveSorted(
        uint32 epoch,
        uint16 leafId,
        uint32[] memory sortedValues
    ) external initialized checkEpochAndState(State.Dispute, epoch) {
        require(leafId <= (collectionManager.getNumActiveCollections() - 1), "Invalid leafId");
        uint256 medianWeight = voteManager.getTotalInfluenceRevealed(epoch, leafId) / 2;
        uint256 accWeight = disputes[epoch][msg.sender].accWeight;
        uint32 lastVisitedValue = disputes[epoch][msg.sender].lastVisitedValue;

        if (disputes[epoch][msg.sender].accWeight == 0) {
            disputes[epoch][msg.sender].leafId = leafId;
        } else {
            require(disputes[epoch][msg.sender].leafId == leafId, "leafId mismatch");
            // require(disputes[epoch][msg.sender].median == 0, "median already found");
        }
        for (uint32 i = 0; i < sortedValues.length; i++) {
            require(sortedValues[i] > lastVisitedValue, "sortedValue <= LVV "); // LVV : Last Visited Value
            lastVisitedValue = sortedValues[i];

            // reason to ignore : has to be done, as each vote will have diff weight
            // slither-disable-next-line calls-loop
            uint256 weight = voteManager.getVoteWeight(epoch, leafId, sortedValues[i]);
            accWeight = accWeight + weight; // total influence revealed for this collection
            if (disputes[epoch][msg.sender].median == 0 && accWeight > medianWeight) {
                disputes[epoch][msg.sender].median = sortedValues[i];
            }
        }
        disputes[epoch][msg.sender].lastVisitedValue = lastVisitedValue;
        disputes[epoch][msg.sender].accWeight = accWeight;
    }

    /**
     * @notice if any mistake made during giveSorted, resetDispute will reset their dispute calculations
     * and they can start again
     * @param epoch in which the dispute was setup and raised
     */
    function resetDispute(uint32 epoch) external initialized checkEpochAndState(State.Dispute, epoch) {
        disputes[epoch][msg.sender] = Structs.Dispute(0, 0, 0, 0);
    }

    /**
     * @notice claimBlockReward() is to be called by the selected staker whose proposed block has the lowest iteration
     * and is valid. This will confirm the block and rewards the selected staker with the block reward
     */
    function claimBlockReward() external initialized checkState(State.Confirm) {
        uint32 epoch = _getEpoch();
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(stakerId > 0, "Structs.Staker does not exist");
        require(blocks[epoch].proposerId == 0, "Block already confirmed");

        if (sortedProposedBlockIds[epoch].length != 0 && blockIndexToBeConfirmed != -1) {
            uint32 proposerId = proposedBlocks[epoch][sortedProposedBlockIds[epoch][uint8(blockIndexToBeConfirmed)]].proposerId;
            require(proposerId == stakerId, "Block Proposer mismatches");
            _confirmBlock(epoch, proposerId);
        }
        uint32 updateRegistryEpoch = collectionManager.getUpdateRegistryEpoch();
        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch) {
            collectionManager.updateDelayedRegistry();
        }
    }

    /// @inheritdoc IBlockManager
    function confirmPreviousEpochBlock(uint32 stakerId) external override initialized onlyRole(BLOCK_CONFIRMER_ROLE) {
        uint32 epoch = _getEpoch();

        if (sortedProposedBlockIds[epoch - 1].length != 0 && blockIndexToBeConfirmed != -1) {
            _confirmBlock(epoch - 1, stakerId);
        }
        uint32 updateRegistryEpoch = collectionManager.getUpdateRegistryEpoch();
        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch - 1) {
            collectionManager.updateDelayedRegistry();
        }
    }

    /**
     * @notice a dispute can be raised on the block if the block proposed has the incorrect biggest Stake.
     * If the dispute is passed and executed, the stake of the staker who proposed such a block will be slashed.
     * The address that raised the dispute will receive a bounty on the staker's stake depending on SlashNums
     * @param epoch in which this dispute was raised
     * @param blockIndex index of the block that is to be disputed
     * @param correctBiggestStakerId the correct biggest staker id
     */
    function disputeBiggestStakeProposed(
        uint32 epoch,
        uint8 blockIndex,
        uint32 correctBiggestStakerId
    ) external initialized checkEpochAndState(State.Dispute, epoch) {
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        uint256 correctBiggestStake = voteManager.getStakeSnapshot(epoch, correctBiggestStakerId);
        require(correctBiggestStake > proposedBlocks[epoch][blockId].biggestStake, "Invalid dispute : Stake");
        _executeDispute(epoch, blockIndex, blockId);
    }

    /**
     * @notice Dispute to prove that id should be absent, when its present in a proposed block.
     * @param epoch in which the dispute was setup
     * @param blockIndex index of the block that is to be disputed
     * @param id collection id
     * @param postionOfCollectionInBlock position of collection id to be disputed inside ids proposed by block
     */
    function disputeCollectionIdShouldBeAbsent(
        uint32 epoch,
        uint8 blockIndex,
        uint16 id,
        uint256 postionOfCollectionInBlock
    ) external initialized checkEpochAndState(State.Dispute, epoch) {
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        // Step 1 : If its active collection, total influence revealed should be zero
        if (collectionManager.getCollectionStatus(id)) {
            // Get leafId from collectionId, as voting is done w.r.t leafIds
            uint16 leafId = collectionManager.getLeafIdOfCollection(id);
            uint256 totalInfluenceRevealed = voteManager.getTotalInfluenceRevealed(epoch, leafId);
            require(totalInfluenceRevealed == 0, "Dispute: ID should be present");
        }
        // Step 2: Prove that given id is indeed present in block
        require(proposedBlocks[epoch][blockId].ids[postionOfCollectionInBlock] == id, "Dispute: ID absent only");

        _executeDispute(epoch, blockIndex, blockId);
    }

    /**
     * @notice Dispute to prove that id should be present, when its not in a proposed block.
     * @param epoch in which the dispute was setup
     * @param blockIndex index of the block that is to be disputed
     * @param id collection id
     */
    function disputeCollectionIdShouldBePresent(
        uint32 epoch,
        uint8 blockIndex,
        uint16 id
    ) external initialized checkEpochAndState(State.Dispute, epoch) {
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        // Get leafId from collectionId, as voting is done w.r.t leafIds
        uint16 leafId = collectionManager.getLeafIdOfCollection(id);
        uint256 totalInfluenceRevealed = voteManager.getTotalInfluenceRevealed(epoch, leafId);

        require(totalInfluenceRevealed != 0, "Dispute: ID should be absent");

        Structs.Block memory _block = proposedBlocks[epoch][blockId];

        // normal search
        // for (uint256 i = 0; i < _block.ids.length; i++)
        //         if (_block.ids[i] == id) {
        //             toDispute = false;
        //             break;
        //         }

        // binary search
        // impl taken and modified from
        // https://github.com/compound-finance/compound-protocol/blob/4a8648ec0364d24c4ecfc7d6cae254f55030d65f/contracts/Governance/Comp.sol#L207
        uint256 lower = 0;
        uint256 upper = _block.ids.length - 1;
        bool toDispute = true;

        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            uint16 _id = _block.ids[center];
            if (_id == id) {
                toDispute = false;
                break;
            } else if (_id < id) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        if (_block.ids[lower] == id) toDispute = false;

        require(toDispute, "Dispute: ID present only");
        _executeDispute(epoch, blockIndex, blockId);
    }

    /**
     * @notice Dispute to prove the ids passed or not sorted in ascend order, or there is duplication
     * @param epoch in which the dispute was setup
     * @param blockIndex index of the block that is to be disputed
     * @param index0 lower
     * @param index1 upper
     *  Valid Block :
     *  If index0 < index1 &&
     *  value0 < value1
     */
    function disputeOnOrderOfIds(
        uint32 epoch,
        uint8 blockIndex,
        uint256 index0,
        uint256 index1
    ) external initialized checkEpochAndState(State.Dispute, epoch) {
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        require(index0 < index1, "index1 not greater than index0 0");
        require(proposedBlocks[epoch][blockId].ids[index0] >= proposedBlocks[epoch][blockId].ids[index1], "ID at i0 not gt than of i1");
        _executeDispute(epoch, blockIndex, blockId);
    }

    /**
     * @notice dispute on median result of a collection in a particular block is finalized after giveSorted was
     * called by the address who setup the dispute. If the dispute is passed and executed, the stake of the staker who
     * proposed such a block will be slashed. The address that raised the dispute will receive a bounty on the
     * staker's stake depending on SlashNums
     * @param epoch in which the dispute was setup
     * @param blockIndex index of the block that is to be disputed
     * @param postionOfCollectionInBlock position of collection id to be disputed inside ids proposed by block
     */
    function finalizeDispute(
        uint32 epoch,
        uint8 blockIndex,
        uint256 postionOfCollectionInBlock
    ) external initialized checkEpochAndState(State.Dispute, epoch) {
        require(
            disputes[epoch][msg.sender].accWeight == voteManager.getTotalInfluenceRevealed(epoch, disputes[epoch][msg.sender].leafId),
            "TIR is wrong"
        ); // TIR : total influence revealed
        require(disputes[epoch][msg.sender].accWeight != 0, "Invalid dispute");
        // Would revert if no block is proposed, or the asset specifed was not revealed
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        uint16 leafId = disputes[epoch][msg.sender].leafId;
        // Get collection id from leafId, as propose happens w.r.t to ids
        uint16 id = collectionManager.getCollectionIdFromLeafId(leafId);

        Structs.Block memory _block = proposedBlocks[epoch][blockId];
        require(_block.ids[postionOfCollectionInBlock] == id, "Wrong Coll Index passed");
        uint32 proposedValue = proposedBlocks[epoch][blockId].medians[postionOfCollectionInBlock];

        require(proposedValue != disputes[epoch][msg.sender].median, "Block proposed with same medians");
        _executeDispute(epoch, blockIndex, blockId);
    }

    /// @inheritdoc IBlockManager
    function getBlock(uint32 epoch) external view override returns (Structs.Block memory _block) {
        return (blocks[epoch]);
    }

    /**
     * @notice return the struct of the proposed block
     * @param epoch in which this block was proposed
     * @param proposedBlock id of the proposed block
     * @return _block : struct of the proposed block
     */
    function getProposedBlock(uint32 epoch, uint32 proposedBlock) external view returns (Structs.Block memory _block) {
        _block = proposedBlocks[epoch][proposedBlock];
        return (_block);
    }

    /**
     * @notice returns number of the block proposed in a particular epoch
     * @param epoch in which blocks were proposed
     * @return number of the block proposed
     */
    function getNumProposedBlocks(uint32 epoch) external view returns (uint8) {
        return (uint8(sortedProposedBlockIds[epoch].length));
    }

    /// @inheritdoc IBlockManager
    function isBlockConfirmed(uint32 epoch) external view override returns (bool) {
        return (blocks[epoch].proposerId != 0);
    }

    /// @inheritdoc IBlockManager
    function getLatestResults(uint16 id) external view override returns (uint32) {
        return latestResults[id];
    }

    /**
     * @notice an internal function in which the block is confirmed.
     * @dev The staker who confirms the block receives the block reward, creates the salt for the next epoch and stores
     * it in the voteManager and provides this salt as secret to the random Manager to generate random number
     * @param epoch in which the block is being confirmed
     * @param stakerId id of the staker that is confirming the block
     */
    function _confirmBlock(uint32 epoch, uint32 stakerId) internal {
        uint32 blockId = sortedProposedBlockIds[epoch][uint8(blockIndexToBeConfirmed)];
        blocks[epoch] = proposedBlocks[epoch][blockId];
        bytes32 salt = keccak256(abi.encodePacked(epoch, blocks[epoch].medians)); // not iteration as it can be manipulated

        Structs.Block memory _block = blocks[epoch];
        for (uint256 i = 0; i < _block.ids.length; i++) {
            latestResults[_block.ids[i]] = _block.medians[i];
        }

        emit BlockConfirmed(epoch, proposedBlocks[epoch][blockId].proposerId, proposedBlocks[epoch][blockId].medians, block.timestamp);

        voteManager.storeSalt(salt);
        rewardManager.giveBlockReward(stakerId, epoch);
        randomNoProvider.provideSecret(epoch, salt);
    }

    /**
     * @dev inserts the block in the approporiate place based the iteration of each block proposed. the block
     * with the lowest iteration is given a higher priority to a lower value
     * @param epoch in which the block was proposed
     * @param blockId id of the proposed block
     * @param iteration number of tosses of a biased coin required for a head
     * @param biggestStake biggest Stake that was revealed
     * @return isAdded : whether the block was added to the array
     */
    function _insertAppropriately(
        uint32 epoch,
        uint32 blockId,
        uint256 iteration,
        uint256 biggestStake
    ) internal returns (bool isAdded) {
        uint8 sortedProposedBlockslength = uint8(sortedProposedBlockIds[epoch].length);

        if (sortedProposedBlockslength == 0) {
            sortedProposedBlockIds[epoch].push(0);
            blockIndexToBeConfirmed = 0;
            return true;
        }

        if (proposedBlocks[epoch][sortedProposedBlockIds[epoch][0]].biggestStake > biggestStake) {
            return false;
        }

        if (proposedBlocks[epoch][sortedProposedBlockIds[epoch][0]].biggestStake < biggestStake) {
            for (uint8 i = 0; i < sortedProposedBlockslength; i++) {
                sortedProposedBlockIds[epoch].pop();
            }
            sortedProposedBlockIds[epoch].push(blockId);
            return true;
        }

        for (uint8 i = 0; i < sortedProposedBlockslength; i++) {
            // Push and Shift
            if (proposedBlocks[epoch][sortedProposedBlockIds[epoch][i]].iteration > iteration) {
                sortedProposedBlockIds[epoch].push(blockId);

                sortedProposedBlockslength = sortedProposedBlockslength + 1;

                for (uint256 j = sortedProposedBlockslength - 1; j > i; j--) {
                    sortedProposedBlockIds[epoch][j] = sortedProposedBlockIds[epoch][j - 1];
                }

                sortedProposedBlockIds[epoch][i] = blockId;

                if (sortedProposedBlockIds[epoch].length > maxAltBlocks) {
                    sortedProposedBlockIds[epoch].pop();
                }

                return true;
            }
        }
        // Worst Iteration and for all other blocks, influence was >=
        if (sortedProposedBlockIds[epoch].length < maxAltBlocks) {
            sortedProposedBlockIds[epoch].push(blockId);
            return true;
        }
    }

    /**
     * @dev internal function executes dispute if a dispute has been passed
     * @param epoch in which the dispute was raised and passed
     * @param blockIndex index of the block that is disputed
     * @param blockId id of the block being disputed
     */
    function _executeDispute(
        uint32 epoch,
        uint8 blockIndex,
        uint32 blockId
    ) internal {
        proposedBlocks[epoch][blockId].valid = false;

        uint8 sortedProposedBlocksLength = uint8(sortedProposedBlockIds[epoch].length);
        if (uint8(blockIndexToBeConfirmed) == blockIndex) {
            // If the chosen one only is the culprit one, find successor
            // O(maxAltBlocks)

            blockIndexToBeConfirmed = -1;
            for (uint8 i = blockIndex + 1; i < sortedProposedBlocksLength; i++) {
                uint32 _blockId = sortedProposedBlockIds[epoch][i];
                if (proposedBlocks[epoch][_blockId].valid) {
                    // slither-disable-next-line costly-loop
                    blockIndexToBeConfirmed = int8(i);
                    break;
                }
            }
        }

        uint32 proposerId = proposedBlocks[epoch][blockId].proposerId;
        stakeManager.slash(epoch, proposerId, msg.sender);
    }

    /**
     * @dev an internal function that checks whether the iteration value sent by the staker is correct or no
     * @param iteration number of tosses of a biased coin required for a head
     * @param biggestStakerId id of the Staker that has the biggest stake amongst the stakers that have revealed
     * @param stakerId id of the staker
     * @param epoch in which the block was proposed
     */
    function _isElectedProposer(
        uint256 iteration,
        uint32 biggestStakerId,
        uint32 stakerId,
        uint32 epoch
    ) internal view initialized returns (bool) {
        // generating pseudo random number (range 0..(totalstake - 1)), add (+1) to the result,
        // since prng returns 0 to max-1 and staker start from 1

        bytes32 salt = voteManager.getSalt();
        bytes32 seed1 = Random.prngHash(salt, keccak256(abi.encode(iteration)));
        uint256 rand1 = Random.prng(stakeManager.getNumStakers(), seed1);
        if ((rand1 + 1) != stakerId) {
            return false;
        }
        bytes32 seed2 = Random.prngHash(salt, keccak256(abi.encode(stakerId, iteration)));
        uint256 rand2 = Random.prng(2**32, seed2);

        uint256 biggestStake = voteManager.getStakeSnapshot(epoch, biggestStakerId);
        uint256 stake = voteManager.getStakeSnapshot(epoch, stakerId);
        // Below line can't be tested since it can't be assured if it returns true or false
        if (rand2 * (biggestStake) > stake * (2**32)) return (false);
        return true;
    }
}
