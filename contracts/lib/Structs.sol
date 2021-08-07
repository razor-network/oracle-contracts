// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Structs {
    struct Staker {
        uint32 id;
        address _address;
        uint256 stake;
        uint32 age;
        uint32 epochStaked;
        bool acceptDelegation;
        uint256 commission;
        address tokenAddress;
    }

    struct Lock {
        uint256 amount; //amount in sTokens
        uint256 withdrawAfter;
    }

    struct Block {
        uint32 proposerId;
        uint32[] medians;
        uint256 iteration;
        uint256 biggestInfluence;
        bool valid;
    }

    struct Dispute {
        uint256 accWeight;
        uint32 median;
        uint32 lastVisited;
        uint8 assetId;
    }

    struct Job {
        uint8 id;
        uint32 epoch;
        string url;
        string selector;
        string name;
        bool repeat;
        bool active;
        address creator;
        uint32 result;
        uint8 assetType;
    }

    struct Collection {
        uint8 id;
        string name;
        uint32 aggregationMethod;
        uint8[] jobIDs;
        mapping(uint8 => bool) jobIDExist;
        uint32 epoch;
        bool active;
        address creator;
        uint32 result;
        uint8 assetType;
    }
}
