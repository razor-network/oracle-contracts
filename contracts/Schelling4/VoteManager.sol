pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
// import "../SimpleToken.sol";
import "./Utils.sol";
// import "../lib/Random.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../lib/Structs.sol";
import "openzeppelin-solidity/contracts/cryptography/MerkleProof.sol";


contract VoteManager is Utils {


    event Committed(uint256 epoch, uint256 stakerId, bytes32 commitment);
    //
    //
    // // what was the eth/usd rate at the beginning of this epoch?

    function commit (uint256 epoch, bytes32 commitment) public checkEpoch(epoch) checkState(Constants.commit()) {
        uint256 stakerId = stakerIds[msg.sender];
        require(commitments[epoch][stakerId] == 0x0, "already commited");
        Structs.Staker storage thisStaker = stakers[stakerId];
        if (blocks[epoch - 1].proposerId == 0 && proposedBlocks[epoch - 1].length > 0) {
            for (uint8 i=0; i < proposedBlocks[epoch - 1].length; i++) {
                if (proposedBlocks[epoch - 1][i].valid) {
                    blocks[epoch - 1] = proposedBlocks[epoch - 1][i];
                }
            }
        }
        uint256 y = givePenalties(thisStaker, epoch);
        emit DebugUint256(y);
        if (thisStaker.stake >= Constants.minStake()) {
            commitments[epoch][stakerId] = commitment;
            thisStaker.epochLastCommitted = epoch;
            emit Committed(epoch, stakerId, commitment);
        }
    }

    event Revealed(uint256 epoch, uint256 stakerId, uint256 value, uint256 stake);

    function reveal (uint256 epoch, bytes32 root, uint256[] memory values,
                    bytes32[][] memory proofs, bytes32 secret, address stakerAddress)
    public
    checkEpoch(epoch) {
        uint256 thisNodeId = stakerIds[stakerAddress];
        require(thisNodeId > 0, "Structs.Staker does not exist");
        Structs.Staker storage thisStaker = stakers[thisNodeId];
        require(commitments[epoch][thisNodeId] != 0x0, "not commited or already revealed");
        // require(value > 0, "voted non positive value");
        require(keccak256(abi.encodePacked(epoch, root, secret)) == commitments[epoch][thisNodeId],
                "incorrect secret/value");
        //if revealing self
        if (msg.sender == stakerAddress) {
            for (uint256 i = 0; i < values.length; i++) {
                require(MerkleProof.verify(proofs[i], root, keccak256(abi.encodePacked(values[i]))));
                votes[epoch][thisNodeId][i] = Structs.Vote(values[i], thisStaker.stake);
                voteWeights[epoch][i][values[i]] = voteWeights[epoch][i][values[i]].add(thisStaker.stake);
                totalStakeRevealed[epoch][i] = totalStakeRevealed[epoch][i].add(thisStaker.stake);

            }

            require(getState() == Constants.reveal(), "Not reveal state");
            require(thisStaker.stake > 0, "nonpositive stake");
            giveRewards(thisStaker, epoch);

            commitments[epoch][thisNodeId] = 0x0;
            thisStaker.epochLastRevealed = epoch;
            // emit Revealed(epoch, thisNodeId, value, thisStaker.stake);
        } else {
            //bounty hunter revealing someone else's secret in commit state
            require(getState() == Constants.commit(), "Not commit state");
            commitments[epoch][thisNodeId] = 0x0;
            slash(thisNodeId, msg.sender);
        }
    }
}
