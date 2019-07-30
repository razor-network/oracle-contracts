pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "./Stakers.sol";
import "./SimpleToken.sol";
import "./Votes.sol";
import "./Blocks.sol";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/Constants.sol";
import "./lib/SharedStructs.sol";


contract Incentives {
    using SafeMath for uint256;
    //epoch -> shares
    mapping (uint256 => uint256) public shares;
    //epoch -> nodeId -> share
    mapping (uint256 =>  mapping (uint256 => uint256)) public share;

    uint256 public rewardPool = 0;
    uint256 public stakeGettingReward = 0;
    address public schAddress;

    constructor (address _schAddress) public {
        schAddress = _schAddress;
    }

    //executed in state 0
    function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue) public view returns(uint256) {

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

    function giveBlockReward (uint256 proposerId) internal {
        SimpleToken sch = SimpleToken(schAddress);
        if (Constants.blockReward() > 0) {
            Stakers.stakers[proposerId];
            SharedStructs.Staker storage staker = Stakers.stakers[proposerId];
            staker.stake = staker.stake.add(Constants.blockReward());
            // totalStake = totalStake.add(Constants.blockReward());
            require(sch.mint(address(this), Constants.blockReward()));
        }
    }
    
    // internal functions vvvvvvvv
    //gives penalties for:
    // 2. not committing
    // 3. not revealing
    // 1. giving vting outside consensus
    function givePenalties (SharedStructs.Staker storage thisStaker, uint256 epoch) internal returns(uint256) {
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

            uint256[] memory mediansLastEpoch = Blocks.blocks[epochLastRevealed].medians;
            if (mediansLastEpoch.length > 0) {

                uint256 y;
                for (uint256 i = 0; i < mediansLastEpoch.length; i++) {
                    uint256 voteLastEpoch = Votes.votes[epochLastRevealed][thisStaker.id][i].value;
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
                    } else {
                        shares[epoch] = shares[epoch] + previousStake;
                        share[epoch][thisStaker.id] = share[epoch][thisStaker.id] + previousStake;
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
    function giveRewards (SharedStructs.Staker storage thisStaker, uint256 epoch) internal {
        if (epoch > 1 && stakeGettingReward > 0) {
            uint256 epochLastRevealed = thisStaker.epochLastRevealed;
            // uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id].value;
            // uint256 medianLastEpoch = blocks[epochLastRevealed].median;
            // stake + share/shares*rewardpool
            thisStaker.stake = thisStaker.stake +
            (share[epochLastRevealed][thisStaker.id]*
            rewardPool)/shares[epochLastRevealed];

        //rewardpool*stake*multiplier/stakeGettingReward
            // uint256 y =  ((((medianLastEpoch.sub(voteLastEpoch)).mul(medianLastEpoch.sub(
            //         voteLastEpoch))).div(medianLastEpoch.mul(medianLastEpoch))).mul(
            //         uint256(10000)));
            //give rewards if voted in zone
            // if ((voteLastEpoch * 100 < (99 * medianLastEpoch) || (voteLastEpoch * 100 > (101 * medianLastEpoch)))) {
            //     thisStaker.stake = thisStaker.stake + (thisStaker.stake*rewardPool)/stakeGettingReward;
            // }
        }
    }

    function slash (uint256 id, address bountyHunter) internal {
        SimpleToken sch = SimpleToken(schAddress);
        uint256 halfStake = Stakers.stakers[id].stake.div(2);
        Stakers.stakers[id].stake = 0;
        if (halfStake > 1) {
            // totalStake = totalStake.sub(halfStake);
            require(sch.transfer(bountyHunter, halfStake), "failed to transfer bounty");
        }
    }
}
