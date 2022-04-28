// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IBlockManager {
    /**
     * @notice if the proposed staker, whose block is valid and has the lowest iteration, does not call claimBlockReward()
     * then in commit state, the staker who commits first will confirm this block and will receive the block reward inturn
     * @param stakerId id of the staker that is confirming the block
     */
    function confirmPreviousEpochBlock(uint32 stakerId) external;

    /**
     * @notice return the struct of the confirmed block
     * @param epoch in which this block was confirmed
     * @return _block : struct of the confirmed block
     */
    function getBlock(uint32 epoch) external view returns (Structs.Block memory _block);

    /**
     * @notice this is to check whether a block was confirmed in a particular epoch or not
     * @param epoch for which this check is being done
     * @return true or false. true if a block has been confirmed, else false
     */
    function isBlockConfirmed(uint32 epoch) external view returns (bool);
}
