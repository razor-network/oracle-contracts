pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "../lib/Structs.sol";


interface IStakeManager {


    function init (address _schAddress, address _voteManagerAddress, address _blockManagerAddress) external;

    // function getTotalStakeRevealed(uint256 epoch, uint256 assetId) external view returns(uint256) {
    //     return(totalStakeRevealed[epoch][assetId]);
    // }

    function updateCommitmentEpoch(uint256 stakerId) external;

    // stake during commit state only
    // we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    function stake (uint256 epoch, uint256 amount) external;
    event Unstaked(uint256 stakerId);

    // staker must call unstake() and continue voting for Constants.WITHDRAW_LOCK_PERIOD
    //after which she can call withdraw() to finally Withdraw
    function unstake (uint256 epoch) external;

    event Withdrew(uint256 stakerId, uint256 amount);

    function withdraw (uint256 epoch) external;

    // todo reduce complexity
    function givePenalties (Structs.Staker calldata thisStaker, uint256 epoch) external;

    function giveRewards (Structs.Staker calldata thisStaker, uint256 epoch) external;

    function slash (uint256 id, address bountyHunter) external;
    function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue) external pure returns(uint256);

    function getStakerId(address _address) external view returns(uint256);

    function getStaker(uint256 _id) external view returns(Structs.Staker memory staker);

    function getNumStakers() external view returns(uint256);

    function getRewardPool() external view returns(uint256);

    function getStakeGettingReward() external view returns(uint256);
    // function stakeTransfer(uint256 fromId, address to, uint256 amount) internal{
    //     // uint256 fromId = stakerIds[from];
    //     require(fromId!=0);
    //     require(stakers[fromId].stake >= amount);
    //     uint256 toId = stakerIds[to];
    //     stakers[fromId].stake = stakers[fromId].stake - amount;
    //     if (toId == 0) {
    //         numStakers = numStakers + 1;
    //         stakers[numStakers] = Structs.Staker(numStakers, amount, 0, 0, 0);
    //         stakerIds[to] = numStakers;
    //     } else {
    //         stakers[toId].stake = stakers[toId].stake + amount;
    //     }
    // }

}
