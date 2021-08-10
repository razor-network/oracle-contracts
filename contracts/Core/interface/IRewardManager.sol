// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IRewardManager {
    function givePenalties(uint32 epoch, uint32 stakerId) external;

    function giveBlockReward(uint32 epoch, uint32 stakerId) external;
}
