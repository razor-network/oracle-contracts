pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "../lib/Constants.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../SimpleToken.sol";
import "../lib/Structs.sol";


contract Utils {
    using SafeMath for uint256;

    // Constants public constants;
    mapping (address => uint256) public stakerIds;
    mapping (uint256 => Structs.Staker) public stakers;
    uint256 public numStakers = 0;
       // uint256 public totalStake = 0;
    event Staked(uint256 stakerId, uint256 amount);
    // SimpleToken public sch;
    uint256 public rewardPool = 0;
    uint256 public stakeGettingReward = 0;
    //epoch->stakerid->commitment
    mapping (uint256 => mapping (uint256 => bytes32)) public commitments;
    //epoch->stakerid->assetid->vote
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => Structs.Vote))) public votes;
    // epoch -> asset -> stakeWeight
    mapping (uint256 =>  mapping (uint256 => uint256)) public totalStakeRevealed;
    //epoch->assetid->voteValue->weight
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => uint256))) public voteWeights;

      //epoch->address->dispute->assetid
    mapping (uint256 => mapping (address => Structs.Dispute)) public disputes;
    //epoch -> numProposedBlocks
    // mapping (uint256 => uint256) public numProposedBlocks;
    //epoch -> proposalNumber -> block
    mapping (uint256 => Structs.Block[]) public proposedBlocks;
    mapping (uint256 => Structs.Block) public blocks;

    event DebugUint256(uint256 a);

    SimpleToken public sch = SimpleToken(0x0);

    // constructor(address _schAddress) public {
    //     sch = SimpleToken(_schAddress);
    // }
    modifier checkEpoch (uint256 epoch) {
        require(epoch == getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == getState(), "incorrect state");
        _;
    }

    function getEpoch () public view returns(uint256) {
        // return(EPOCH);
        return(block.number.div(Constants.epochLength()));
    }

    function getState () public view returns(uint256) {
        // return (STATE);
        uint256 state = (block.number.div(Constants.epochLength()/Constants.numStates()));
        return (state.mod(Constants.numStates()));
    }

        // internal functions vvvvvvvv
        //gives penalties for:
        // 2. not committing
        // 3. not revealing
        // 1. giving vting outside consensus
        //executed in state 0
        function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue) public pure returns(uint256) {
            if (epochs < 2) {
                return(stakeValue);
            }
            uint256 penalty = (epochs.sub(1)).mul((stakeValue.mul(Constants.penaltyNotRevealNum())).div(
            Constants.penaltyNotRevealDenom()));
            if (penalty < stakeValue) {
                return(stakeValue.sub(penalty));
            } else {
                return(0);
            }
        }

        // todo reduce complexity
        function givePenalties (Structs.Staker memory thisStaker, uint256 epoch) public returns(uint256) {
            uint256 epochLastRevealed = thisStaker.epochLastRevealed;
            if (epoch > 1 && epochLastRevealed > 0) {
                uint256 epochLastActive = thisStaker.epochStaked < thisStaker.epochLastRevealed ?
                                        thisStaker.epochLastRevealed :
                                        thisStaker.epochStaked;
                // penalize or reward if last active more than epoch - 1
                uint256 penalizeEpochs = epoch.sub(epochLastActive);
                uint256 previousStake = thisStaker.stake;
                thisStaker.stake = calculateInactivityPenalties(penalizeEpochs, previousStake);
                // return(0);

                uint256[] memory mediansLastEpoch = blocks[epochLastRevealed].medians;
                if (mediansLastEpoch.length > 0) {

                    uint256 y;
                    for (uint256 i = 0; i < mediansLastEpoch.length; i++) {
                        uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id][i].value;
                        uint256 medianLastEpoch = mediansLastEpoch[i];

                        if (voteLastEpoch > (medianLastEpoch.mul(2))) {
                            thisStaker.stake = 0;
                            rewardPool = rewardPool.add(previousStake);
                            return(0);
                        } else if (voteLastEpoch > 0 &&
                            (voteLastEpoch < (medianLastEpoch.mul(Constants.safetyMarginLower())).div(100) ||
                            voteLastEpoch > (medianLastEpoch.mul(uint256(200).sub(
                                            Constants.safetyMarginLower()))).div(100))) {

                            if (medianLastEpoch > voteLastEpoch) {
                                y = y + (100 * (medianLastEpoch - voteLastEpoch))/medianLastEpoch;
                            } else {
                                y = y + (100 * (voteLastEpoch - medianLastEpoch))/medianLastEpoch;
                            }
                        }
                    }

                    if (y > 0) {
                        thisStaker.stake = previousStake.sub(((y - 1).mul(previousStake)).div(100*mediansLastEpoch.length));
                    // thisStaker.stake = previousStake.sub(((y.sub(1)).mul(previousStake)).div(10000));

                        rewardPool = rewardPool.add(previousStake.sub(thisStaker.stake));
                        return(y);
                    } else {
                    //no penalty. only reward??
                        stakeGettingReward = stakeGettingReward.add(previousStake);//*(1 - y);
                    }
                }
            }
        }


    // //executed in state 1
    function giveRewards (Structs.Staker memory thisStaker, uint256 epoch) public {
        if (epoch > 1 && stakeGettingReward > 0) {
            uint256 epochLastRevealed = thisStaker.epochLastRevealed;
            uint256[] memory mediansLastEpoch = blocks[epochLastRevealed].medians;
            require(mediansLastEpoch.length > 0);
            //epoch->stakerid->assetid->vote
            // mapping (uint256 => mapping (uint256 =>  mapping (uint256 => Structs.Vote))) public votes;
            uint256 rewardable = 0;
            for (uint256 i = 0; i < mediansLastEpoch.length; i++) {
                uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id][i].value;
                uint256 medianLastEpoch = mediansLastEpoch[i];

        //rewardpool*stake*multiplier/stakeGettingReward
            // uint256 y =  ((((medianLastEpoch.sub(voteLastEpoch)).mul(medianLastEpoch.sub(
            //         voteLastEpoch))).div(medianLastEpoch.mul(medianLastEpoch))).mul(
            //         uint256(10000)));
            //give rewards if voted in zone
                if ((voteLastEpoch * 100 >= (99 * medianLastEpoch) ||
                    (voteLastEpoch * 100 <= (101 * medianLastEpoch)))) {
                    rewardable = rewardable + 1;
                }
            }
            emit DebugUint256(rewardable);
            emit DebugUint256(rewardPool);
            thisStaker.stake = thisStaker.stake + (thisStaker.stake*rewardPool*rewardable)/
            (stakeGettingReward*mediansLastEpoch.length);
        }
    }

    function slash (uint256 id, address bountyHunter) internal {
        // SimpleToken sch = SimpleToken(schAddress);
        uint256 halfStake = stakers[id].stake.div(2);
        stakers[id].stake = 0;
        if (halfStake > 1) {
            // totalStake = totalStake.sub(halfStake);
            require(sch.transfer(bountyHunter, halfStake), "failed to transfer bounty");
        }
    }
}
