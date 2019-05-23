// accounts[0] transfers tokens to other accounts; does nothing
// 1 stakes 420000; commit 160; reveal 160; proposes wrong, gets slashed //TODO HIS VOTES STILL COUNTD!
// 2 stakes 19000; commit 170; (9) reveals this guy, loses stake
// 3 stakes 800000; commit 168; reveal 168;
// 4 stakes 600000; commit 4; reveal 4;
// 5 stakes 2000; //gets kicked; tries to commit 2000, fails
// 6 stakes 700000, doesnt commit; doesnt reveal;
// 7 stake 3000; commit 169; doesnt reveal
// 8 stake 4000, commit 160; reveal 160;
// 9 stake 5000 commit 1 reveal 1
// 10 stake 6000,  //kicks [5];vote 1000000 reveal 1000000
// 19 doesnt stake. reveals (2)
// 20 doesnt stake; doesnt commit; doesnt reveal; giveSorted()
// 21 givesorted in batches; proposealt()

// 1
totalStake = 420000 + 19000+800000+600000+700000+3000+4000+5000+6000 = 2557000
total stake voted = 800000+600000+4000+5000+6000 +420000 = 1415000

twoFiveWeight 458.75
twofive 4
penaltyweight = 5000+600000

sevenfive weight 1376
sevenfive 168
penalty weight = 6000

total penalty weight = 611000

getting reward = 804000 +420000= 1224000

sevenfiveweight = 1368

epoch 2 expected stake
// 1 0 got slashed
// 2 0 got slashed
// 3 800000 + reward = 803993
// 4 600000 outside zone 594000
// 6 700 doesnt commit 665000
// 7 3000 doesnt reveal 2850
// 8 4000 in zone 4019
// 9 5000 outside zone 4950
//10 6000 outside zone 5940
//


solutions to front running
1.give "slots" to stakers. they can only update stake during these slots
2.only 1 update per dynasty

3. rand(weightgettingreward[epoch-1])
proposer has to prove he is chosen by sending sorted list of stakers till its 0
e.g. rand = 50
listof node ids = [1,2,3] with weights = [40,8,5]
contract verifies weight by votes[epoch-1][nodeid]
pro: we dont even need linked lists lol

4.order statistic tree
5. instead of selecting 1 proposer, pseudorandomly select a sample, everyone can propose, highest one gets reward.
6. dont sort the list!
rand(totalStake)
rand -=nodes[i, 1->inf till rand=0]
7. randomly select rand(biggestStaker.stake())
propose if you are >= rand. the one closest is valid staker
8. for disputes:
just do it dum way sum(votes[weights]) because its gonna be small number in normal scenario anyway.
In case it is >1024, pseudorandomly select 1024 in following way
rand(biggestStaker) select if if you are >= rand
rand(biggestStaker-selectedStaker in previous iter.) and so on

//new story
//1. stake.
//2. commit,
//3. reveal
//4. propose (if isElectedProposer?); get blockreward
//5. challenge minStake*50 by anyone also propose. extend propose by 250 block
//6. proposer does giveSorted() and proposeAlt()
//      if proposeAlt() == Proposed
//      get reward
//      else slash() and give back reward to challenger and select altblock
//      if proposer doesnt givesorted, challenger giveSortedand get blockreward
//STATES:
// 1. commit -80
// 2. reveal -80
// 3. PROPOSE. - 80
// 4. Dispute - CAHLLENGE - 80
// 5. dispute - response - 160
// 6. OPEN PROPOSE -160
