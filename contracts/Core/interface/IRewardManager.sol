// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IRewardManager {
    function givePenalties(uint32 stakerId, uint32 epoch) external;

    function giveBlockReward(uint32 stakerId, uint32 epoch) external;
}
