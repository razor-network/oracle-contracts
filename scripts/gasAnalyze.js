const getJSON = require('get-json');
const json = require('../gasReporterOutput.json');

function median(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

const ethGasApi = 'https://ethgasstation.info/api/ethgasAPI.json';
const ethPrice = 'https://api.gemini.com/v1/pubticker/ethusd';
const polygonGasApi = 'https://gasstation-mainnet.matic.network/';
const maticPrice = 'https://api.gemini.com/v1/pubticker/maticusd';

const commits = json.info.methods.VoteManager_40f84925.gasData;
const reveals = json.info.methods.VoteManager_f110a0fa.gasData;
const proposes = json.info.methods.BlockManager_474a1ae1.gasData;

// console.log(commits)
getJSON(ethGasApi, function (error, response) {
  const gwei = response.average / 10;
  getJSON(ethPrice, function (error, response) {
    const ethusd = response.last;

    //
    // tx cost = gas * gasprice
    //           gas * gasPriceInWei/10**9

    let commitcost = Number(ethusd) * Number(gwei) * Number(median(commits)) / 10 ** 9;
    let revealcost = Number(ethusd) * Number(gwei) * Number(median(reveals)) / 10 ** 9;
    let proposecost = Number(ethusd) * Number(gwei) * Number(median(proposes)) / 10 ** 9;
    let epochcost = commitcost + revealcost + revealcost;
    // console.log(Number(ethusd),Number(gwei),Number(commits))
    console.log('On ethereum network. It will take take following cost for tx');
    console.log('Commit: $', commitcost);
    console.log('reveal: $', proposecost);
    console.log('propose: $', revealcost);
    console.log('cost per epoch: $', epochcost);
    console.log('cost per day if epoch = 10min: $', epochcost * 6 * 24);
    console.log('cost per week if epoch = 10min: $', epochcost * 6 * 24 * 7);
    console.log('cost per month if epoch = 10min: $', epochcost * 6 * 24 * 30);
    console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
    console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
    console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
    console.log('========================================================');
    getJSON(polygonGasApi, function (error, response) {
      const polyGwei = response.standard;
      getJSON(maticPrice, function (error, response) {
        const maticusd = response.last;

        commitcost = Number(maticusd) * Number(polyGwei) * Number(median(commits)) / 10 ** 9;
        revealcost = Number(maticusd) * Number(polyGwei) * Number(median(reveals)) / 10 ** 9;
        proposecost = Number(maticusd) * Number(polyGwei) * Number(median(proposes)) / 10 ** 9;
        epochcost = commitcost + revealcost + revealcost;
        // console.log(Number(ethusd),Number(gwei),Number(commits))
        console.log('On Polygon network. It will take take following cost for tx');
        console.log('Commit: $', commitcost);
        console.log('reveal: $', proposecost);
        console.log('propose: $', revealcost);
        console.log('cost per epoch: $', epochcost);
        console.log('cost per day if epoch = 10min: $', epochcost * 6 * 24);
        console.log('cost per week if epoch = 10min: $', epochcost * 6 * 24 * 7);
        console.log('cost per month if epoch = 10min: $', epochcost * 6 * 24 * 30);
        console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        const arbitrumGwei = 0.45;

        commitcost = Number(ethusd) * Number(arbitrumGwei) * Number(median(commits)) / 10 ** 9;
        revealcost = Number(ethusd) * Number(arbitrumGwei) * Number(median(reveals)) / 10 ** 9;
        proposecost = Number(ethusd) * Number(arbitrumGwei) * Number(median(proposes)) / 10 ** 9;
        epochcost = commitcost + revealcost + revealcost;
        // console.log(Number(ethusd),Number(gwei),Number(commits))
        console.log('On Arbitrum network. It will take take following cost for tx (Not real time)');
        console.log('Commit: $', commitcost);
        console.log('reveal: $', proposecost);
        console.log('propose: $', revealcost);
        console.log('cost per epoch: $', epochcost);
        console.log('cost per day if epoch = 10min: $', epochcost * 6 * 24);
        console.log('cost per week if epoch = 10min: $', epochcost * 6 * 24 * 7);
        console.log('cost per month if epoch = 10min: $', epochcost * 6 * 24 * 30);
        console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        const avaGwei = 225;
        const avaxPrice = 'https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd';
        getJSON(avaxPrice, function (error, response) {
          console.log('========================================================');
          const avaxusd = response['avalanche-2'].usd;

          commitcost = Number(avaxusd) * Number(avaGwei) * Number(median(commits)) / 10 ** 9;
          revealcost = Number(avaxusd) * Number(avaGwei) * Number(median(reveals)) / 10 ** 9;
          proposecost = Number(avaxusd) * Number(avaGwei) * Number(median(proposes)) / 10 ** 9;
          epochcost = commitcost + revealcost + revealcost;
          // console.log(Number(ethusd),Number(gwei),Number(commits))
          console.log('On Avalanche network. It will take take following cost for tx');
          console.log('Commit: $', commitcost);
          console.log('reveal: $', proposecost);
          console.log('propose: $', revealcost);
          console.log('cost per epoch: $', epochcost);
          console.log('cost per day if epoch = 10min: $', epochcost * 6 * 24);
          console.log('cost per week if epoch = 10min: $', epochcost * 6 * 24 * 7);
          console.log('cost per month if epoch = 10min: $', epochcost * 6 * 24 * 30);
          console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
          console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
          console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);

          console.log('========================================================');
          const xdaiusd = 1;
          const xdaigwei = 1;

          commitcost = Number(xdaiusd) * Number(xdaigwei) * Number(median(commits)) / 10 ** 9;
          revealcost = Number(xdaiusd) * Number(xdaigwei) * Number(median(reveals)) / 10 ** 9;
          proposecost = Number(xdaiusd) * Number(xdaigwei) * Number(median(proposes)) / 10 ** 9;
          epochcost = commitcost + revealcost + revealcost;
          // console.log(Number(ethusd),Number(gwei),Number(commits))
          console.log('On xDAI network. It will take take following cost for tx (Not real time)');
          console.log('Commit: $', commitcost);
          console.log('reveal: $', proposecost);
          console.log('propose: $', revealcost);
          console.log('cost per epoch: $', epochcost);
          console.log('cost per day if epoch = 10min: $', epochcost * 6 * 24);
          console.log('cost per week if epoch = 10min: $', epochcost * 6 * 24 * 7);
          console.log('cost per month if epoch = 10min: $', epochcost * 6 * 24 * 30);
          console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
          console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
          console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        });
      });
    });
  });
});
