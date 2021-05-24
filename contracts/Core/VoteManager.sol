// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interface/IStakeManager.sol";
import "./interface/IStateManager.sol";
import "./interface/IBlockManager.sol";
import "./storage/VoteStorage.sol";
import "../lib/Constants.sol";
import "../Initializable.sol";
import "./ACL.sol";


contract VoteManager is Initializable, ACL, VoteStorage {

    IStakeManager public stakeManager;
    IStateManager public stateManager;
    IBlockManager public blockManager;

    event Committed(uint256 epoch, uint256 stakerId, bytes32 commitment, uint256 timestamp);
    event Revealed(uint256 epoch, uint256 stakerId, uint256 stake, uint256[] values, uint256 timestamp);

    modifier checkEpoch (uint256 epoch) {
        require(epoch == stateManager.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == stateManager.getState(), "incorrect state");
        _;
    }

    function initialize (
        address stakeManagerAddress,
        address stateManagerAddress,
        address blockManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE)
    {
        stakeManager = IStakeManager(stakeManagerAddress);
        stateManager = IStateManager(stateManagerAddress);
        blockManager = IBlockManager(blockManagerAddress);
    }
    

    function commit(uint256 epoch, bytes32 commitment) public initialized checkEpoch(epoch) checkState(Constants.commit()) {
        uint256 stakerId = stakeManager.getStakerId(msg.sender);
        require(commitments[epoch][stakerId] == 0x0, "already commited");
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);

        // Switch to call confirm block only when block in previous epoch has not been confirmed 
        // and if previous epoch do have proposed blocks

        if (blockManager.getBlock(epoch-1).proposerId == 0 && blockManager.getNumProposedBlocks(epoch-1) > 0) {
            blockManager.confirmBlock();
        }
        stakeManager.givePenalties(stakerId, epoch);

        if (thisStaker.stake >= Constants.minStake()) {
            commitments[epoch][stakerId] = commitment;
            stakeManager.updateCommitmentEpoch(stakerId);
            emit Committed(epoch, stakerId, commitment, block.timestamp);
        }
    }


    function reveal (
        uint256 epoch,
        bytes32 root,
        uint256[] memory values,
        bytes32[][] memory proofs, bytes32 secret,
        address stakerAddress
    )
        public
        initialized
        checkEpoch(epoch) 
    {
        uint256 thisStakerId = stakeManager.getStakerId(stakerAddress);
        require(thisStakerId > 0, "Structs.Staker does not exist");
        Structs.Staker memory thisStaker = stakeManager.getStaker(thisStakerId);
        require(commitments[epoch][thisStakerId] != 0x0, "not commited or already revealed");
        require(keccak256(abi.encodePacked(epoch, root, secret)) == commitments[epoch][thisStakerId],
                "incorrect secret/value");
        
        //if revealing self
        if (msg.sender == stakerAddress) {
            require(stateManager.getState() == Constants.reveal(), "Not reveal state");
            require(thisStaker.stake > 0, "nonpositive stake");
            for (uint256 i = 0; i < values.length; i++) {
                require(MerkleProof.verify(proofs[i], root, keccak256(abi.encodePacked(values[i]))),
                "invalid merkle proof");
                votes[epoch][thisStakerId][i] = Structs.Vote(values[i], thisStaker.stake);
                voteWeights[epoch][i][values[i]] = voteWeights[epoch][i][values[i]]+(thisStaker.stake);
                totalStakeRevealed[epoch][i] = totalStakeRevealed[epoch][i]+(thisStaker.stake);
            }

            stakeManager.giveRewards(thisStakerId, epoch);

            commitments[epoch][thisStakerId] = 0x0;
            stakeManager.setStakerEpochLastRevealed(thisStakerId, epoch);

            emit Revealed(epoch, thisStakerId, thisStaker.stake, values, block.timestamp);
        } else {
            //bounty hunter revealing someone else's secret in commit state
            require(stateManager.getState() == Constants.commit(), "Not commit state");
            commitments[epoch][thisStakerId] = 0x0;
            stakeManager.slash(thisStakerId, msg.sender, epoch);
        }
    }

    function getCommitment(uint256 epoch, uint256 stakerId) public view returns(bytes32) {
        //epoch -> stakerid -> commitment
        return(commitments[epoch][stakerId]);
    }

    function getVote(uint256 epoch, uint256 stakerId, uint256 assetId) public view returns(Structs.Vote memory vote) {
        //epoch -> stakerid -> assetid -> vote
        return(votes[epoch][stakerId][assetId]);
    }

    function getVoteWeight(uint256 epoch, uint256 assetId, uint256 voteValue)
    public view returns(uint256) {
        //epoch -> assetid -> voteValue -> weight
        return(voteWeights[epoch][assetId][voteValue]);
    }

    function getTotalStakeRevealed(uint256 epoch, uint256 assetId) public view returns(uint256) {
        // epoch -> asset -> stakeWeight
        return(totalStakeRevealed[epoch][assetId]);
    }

    function getTotalStakeRevealed(uint256 epoch, uint256 assetId, uint256 voteValue) public view returns(uint256) {
        //epoch -> assetid -> voteValue -> weight
        return(voteWeights[epoch][assetId][voteValue]);
    }
}
