// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Structs {
    struct Commitment {
        uint32 epoch;
        bytes32 commitmentHash;
    }
    struct Staker {
        // Slot 1
        bool acceptDelegation;
        bool isSlashed;
        uint8 commission;
        uint32 id;
        uint32 age;
        address _address;
        // Slot 2
        address tokenAddress;
        uint32 epochFirstStakedOrLastPenalized;
        uint32 epochCommissionLastUpdated;
        // Slot 3
        uint256 stake;
    }

    struct Lock {
        uint256 amount; //amount in sRZR/RZR
        uint256 unlockAfter; // Can be made uint32 later if packing is possible
        uint256 initial; // for unstake lock
    }

    struct BountyLock {
        uint32 redeemAfter;
        address bountyHunter;
        uint256 amount; //amount in RZR
    }

    struct Block {
        bool valid;
        uint32 proposerId;
        uint32[] medians;
        uint16[] ids;
        uint256 iteration;
        uint256 biggestStake;
    }

    struct Dispute {
        uint16 leafId;
        uint32 median;
        uint32 lastVisitedValue;
        uint256 accWeight;
    }

    struct Job {
        uint16 id;
        uint8 selectorType; // 0-1
        uint8 weight; // 1-100
        int8 power;
        string name;
        string selector;
        string url;
    }

    struct Collection {
        bool active;
        uint16 id;
        int8 power;
        uint32 tolerance;
        uint32 aggregationMethod;
        uint16[] jobIDs;
        string name;
    }

    struct AssignedAsset {
        uint16 leafId;
        uint32 value;
    }

    struct MerkleTree {
        Structs.AssignedAsset[] values;
        bytes32[][] proofs;
        bytes32 root;
    }
}
