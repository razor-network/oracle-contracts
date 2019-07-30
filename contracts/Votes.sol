pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "./SimpleToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/Constants.sol";
import "./lib/SharedStructs.sol";
import "./Stakers.sol";
import "./States.sol";
import "openzeppelin-solidity/contracts/cryptography/MerkleProof.sol";


contract Votes {
	    //epoch->stakerid->commitment
    mapping (uint256 => mapping (uint256 => bytes32)) public commitments;
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => SharedStructs.Vote))) public votes;
    // epoch -> asset -> stakeWeight
    mapping (uint256 =>  mapping (uint256 => uint256)) public totalStakeRevealed;
        //epoch->assetid->voteValue->weight
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => uint256))) public voteWeights;

    event Committed(uint256 epoch, uint256 nodeId, bytes32 commitment);
    //
    event Y(uint256 y);
    //
    // // what was the eth/usd rate at the beginning of this epoch?

    modifier checkEpoch (uint256 epoch) {
        require(epoch == States.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == States.getState(), "incorrect state");
        _;
    }

    function commit (uint256 epoch, bytes32 commitment) public checkEpoch(epoch) checkState(Constants.commit()) {
        uint256 nodeId = Stakers.stakerIds[msg.sender];
        require(commitments[epoch][nodeId] == 0x0, "already commited");
        SharedStructs.Staker storage thisStaker = Stakers.stakers[nodeId];
        if (Blocks.blocks[epoch - 1].proposerId == 0 && Blocks.proposedBlocks[epoch - 1].length > 0) {
            for (uint8 i=0; i < Blocks.proposedBlocks[epoch - 1].length; i++) {
                if (Blocks.proposedBlocks[epoch - 1][i].valid) {
                    Blocks.blocks[epoch - 1] = Blocks.proposedBlocks[epoch - 1][i];
                    Incentives.giveBlockReward(Blocks.blocks[epoch - 1].proposerId);
                }
            }
        }
        uint256 y = Incentives.givePenalties(thisStaker, epoch);
        emit Y(y);
        if (thisStaker.stake >= Constants.minStake()) {
            commitments[epoch][nodeId] = commitment;
            thisStaker.epochLastCommitted = epoch;
            emit Committed(epoch, nodeId, commitment);
        }
    }

    event Revealed(uint256 epoch, uint256 nodeId, uint256 value, uint256 stake);

    function reveal (uint256 epoch, bytes32 root, uint256[] memory values,
                    bytes32[][] memory proofs, bytes32 secret, address stakerAddress)
    public
    checkEpoch(epoch) {
        uint256 thisNodeId = Stakers.stakerIds[stakerAddress];
        require(thisNodeId > 0, "SharedStructs.Staker does not exist");
        SharedStructs.Staker storage thisStaker = Stakers.stakers[thisNodeId];
        require(commitments[epoch][thisNodeId] != 0x0, "not commited or already revealed");
        // require(value > 0, "voted non positive value");
        require(keccak256(abi.encodePacked(epoch, root, secret)) == commitments[epoch][thisNodeId],
                "incorrect secret/value");
        //if revealing self
        if (msg.sender == stakerAddress) {

            require(States.getState() == Constants.reveal(), "Not reveal state");
            require(thisStaker.stake > 0, "nonpositive stake");
            Incentives.giveRewards(thisStaker, epoch);
            for (uint256 i = 0; i < values.length; i++) {
                require(MerkleProof.verify(proofs[i], root, keccak256(abi.encodePacked(values[i]))));

                votes[epoch][thisNodeId][i] = SharedStructs.Vote(values[i], thisStaker.stake);
                voteWeights[epoch][i][values[i]] = voteWeights[epoch][i][values[i]].add(thisStaker.stake);
                totalStakeRevealed[epoch][i] = totalStakeRevealed[epoch][i].add(thisStaker.stake);

            }


            commitments[epoch][thisNodeId] = 0x0;
            thisStaker.epochLastRevealed = epoch;
            // emit Revealed(epoch, thisNodeId, value, thisStaker.stake);
        } else {
            //bounty hunter revealing someone else's secret in commit state
            require(States.getState() == Constants.commit(), "Not commit state");
            commitments[epoch][thisNodeId] = 0x0;
            Incentives.slash(thisNodeId, msg.sender);
        }
    }
}