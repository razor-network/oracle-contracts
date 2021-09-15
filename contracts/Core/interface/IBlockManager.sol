// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IBlockManager {

    function confirmPreviousEpochBlock(uint32 stakerId) external;

    function getBlock(uint32 epoch) external view returns (Structs.Block memory _block);

    function isBlockConfirmed(uint32 epoch) external view returns (bool);
}
