// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;


library Structs {
    struct Vote {
        uint256 value;
        uint256 weight;
    }

    struct Staker {
        uint256 id;
        address _address;
        uint256 stake;
        uint256 epochStaked;
        uint256 epochLastCommitted;
        uint256 epochLastRevealed;
        uint256 unstakeAfter;
        uint256 withdrawAfter;
    }

    struct Block {
        uint256 proposerId;
        uint256[] jobIds;
        uint256[] medians;
        uint256[] lowerCutoffs;
        uint256[] higherCutoffs;
        uint256 iteration;
        uint256 biggestStake;
        bool valid;
    }

    struct Dispute {
        uint256 accWeight;
        uint256 median;
        uint256 lowerCutoff;
        uint256 higherCutoff;
        uint256 lastVisited;
        uint256 assetId;
    }

    struct Job {
        uint256 id;
        uint256 epoch;
        string url;
        string selector;
        string name;
        bool repeat;
        address creator;
        uint256 credit;
        bool fulfilled;
        uint256 result;
    }

}
