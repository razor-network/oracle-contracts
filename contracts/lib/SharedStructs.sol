library SharedStructs
{
	struct Vote {
        uint256 value;
        uint256 weight;
    }

    struct Staker {
        uint256 id;
        uint256 stake;
        uint256 epochStaked;
        uint256 epochLastCommitted;
        uint256 epochLastRevealed;
        uint256 unstakeAfter;
        uint256 withdrawAfter;
    }

    struct Block {
        uint256 proposerId;
        uint256[] medians;
        uint256 iteration;
        uint256 biggestStake;
        bool valid;
    }

    struct Dispute {
        uint256 accWeight;
        uint256 median;
        uint256 lastVisited;
        uint256 assetId;
    }

}