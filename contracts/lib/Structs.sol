// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Structs {
    struct Vote {
        uint32 epoch;
        uint48[] values;
    }

    struct Commitment {
        uint32 epoch;
        bytes32 commitmentHash;
    }
    struct Staker {
        // Slot 1
        bool acceptDelegation;
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
        uint256 amount; //amount in RZR
        uint256 commission;
        uint256 withdrawAfter; // Can be made uint32 later if packing is possible
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
        uint256 iteration;
        uint256 biggestInfluence;
    }

    struct Dispute {
        uint16 collectionId;
        uint32 lastVisitedStaker;
        uint256 accWeight;
        uint256 accProd;
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
        uint16 assetIndex;
        int8 power;
        uint32 aggregationMethod;
        uint16[] jobIDs;
        string name;
    }
}
