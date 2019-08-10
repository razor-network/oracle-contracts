module.getBiggestStakeAndId = async function (schelling) {
// async function getBiggestStakeAndId (schelling) {
  let numStakers = await schelling.numStakers()
  let biggestStake = 0
  let biggestStakerId = 0
  for (let i = 1; i <= numStakers; i++) {
    let stake = Number((await schelling.stakers(i)).stake)
    if (stake > biggestStake) {
      biggestStake = stake
      biggestStakerId = i
    }
  }
  return ([biggestStake, biggestStakerId])
}
