pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import "./Utils.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./IStakeManager.sol";
import "./IStateManager.sol";
import "./IBlockManager.sol";
import "./VoteStorage.sol";
import "openzeppelin-solidity/contracts/cryptography/MerkleProof.sol";
import "../lib/Constants.sol";

// import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract VoteManager is  Utils, VoteStorage {
    using SafeMath for uint256;
    IStakeManager public stakeManager;
    IStateManager public stateManager;
    IBlockManager public blockManager;

    modifier checkEpoch (uint256 epoch) {
        require(epoch == stateManager.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == stateManager.getState(), "incorrect state");
        _;
    }

    function init (address _stakeManagerAddress, address _stateManagerAddress, address _blockManagerAddress) public {
        stakeManager = IStakeManager(_stakeManagerAddress);
        stateManager = IStateManager(_stateManagerAddress);
        blockManager = IBlockManager(_blockManagerAddress);
    }

    event Committed(uint256 epoch, uint256 stakerId, bytes32 commitment, uint256 timestamp);

    function getCommitment(uint256 epoch, uint256 stakerId) public view returns(bytes32) {
        //epoch->stakerid->commitment
        // mapping (uint256 => mapping (uint256 => bytes32)) public commitments;
        return(commitments[epoch][stakerId]);
    }

    function getVote(uint256 epoch, uint256 stakerId, uint256 assetId) public view returns(Structs.Vote memory vote) {
        //epoch->stakerid->assetid->vote
        // mapping (uint256 => mapping (uint256 =>  mapping (uint256 => Structs.Vote))) public votes;
        return(votes[epoch][stakerId][assetId]);
    }

    function getVoteWeight(uint256 epoch, uint256 assetId, uint256 voteValue)
    public view returns(uint256) {
        //epoch->assetid->voteValue->weight
        // mapping (uint256 => mapping (uint256 =>  mapping (uint256 => uint256))) public voteWeights;
        return(voteWeights[epoch][assetId][voteValue]);
    }

    function getTotalStakeRevealed(uint256 epoch, uint256 assetId) public view returns(uint256) {
        // epoch -> asset -> stakeWeight
        // mapping (uint256 =>  mapping (uint256 => uint256)) public totalStakeRevealed;
        return(totalStakeRevealed[epoch][assetId]);
    }

    function getTotalStakeRevealed(uint256 epoch, uint256 assetId, uint256 voteValue) public view returns(uint256) {
        //epoch->assetid->voteValue->weight
        // mapping (uint256 => mapping (uint256 =>  mapping (uint256 => uint256))) public voteWeights;
        return(voteWeights[epoch][assetId][voteValue]);
    }

    function commit (uint256 epoch, bytes32 commitment) public checkEpoch(epoch) checkState(Constants.commit()) {
        uint256 stakerId = stakeManager.getStakerId(msg.sender);
        require(commitments[epoch][stakerId] == 0x0, "already commited");
        Structs.Staker memory thisStaker = stakeManager.getStaker(stakerId);
        blockManager.confirmBlock();
 
        stakeManager.givePenalties(stakerId, epoch);
        // emit DebugUint256(y);
        if (thisStaker.stake >= Constants.minStake()) {
            commitments[epoch][stakerId] = commitment;
            stakeManager.updateCommitmentEpoch(stakerId);
            // thisStaker.epochLastCommitted = epoch;
            emit Committed(epoch, stakerId, commitment, now);
        }
    }

    event Revealed(uint256 epoch, uint256 stakerId, uint256 stake, uint256[] values, uint256 timestamp);

    function reveal (uint256 epoch, bytes32 root, uint256[] memory values,
                    bytes32[][] memory proofs, bytes32 secret, address stakerAddress)
    public
    checkEpoch(epoch) {
        uint256 thisStakerId = stakeManager.getStakerId(stakerAddress);
        require(thisStakerId > 0, "Structs.Staker does not exist");
        Structs.Staker memory thisStaker = stakeManager.getStaker(thisStakerId);
        require(commitments[epoch][thisStakerId] != 0x0, "not commited or already revealed");
        // require(value > 0, "voted non positive value");
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
                voteWeights[epoch][i][values[i]] = voteWeights[epoch][i][values[i]].add(thisStaker.stake);
                totalStakeRevealed[epoch][i] = totalStakeRevealed[epoch][i].add(thisStaker.stake);
            }

            stakeManager.giveRewards(thisStakerId, epoch);

            commitments[epoch][thisStakerId] = 0x0;
            // thisStaker.epochLastRevealed = epoch;
            // stakeManager.setStakerStake(thisStakerId, thisStaker.stake);
            stakeManager.setStakerEpochLastRevealed(thisStakerId, epoch);

            emit Revealed(epoch, thisStakerId, thisStaker.stake, values, now);
        } else {
            //bounty hunter revealing someone else's secret in commit state
            require(stateManager.getState() == Constants.commit(), "Not commit state");
            commitments[epoch][thisStakerId] = 0x0;
            stakeManager.slash(thisStakerId, msg.sender, epoch);
        }
    }
}
