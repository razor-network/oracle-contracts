const getJSON = require('get-json');
const json = require('../gasReporterOutput.json');
const hre = require('hardhat');

function median(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

async function getGasFeeData(rpc){
 try{
    const provider = new hre.ethers.providers.JsonRpcProvider(rpc);
    const gasPrice = await provider.getFeeData();
    const formatted = hre.ethers.utils.formatUnits(gasPrice.gasPrice, 'gwei');
    console.log("Current Gas Price", formatted, rpc);
    return formatted;
 }
    catch(e){
    console.log(e);
    }
}

const ethGasApi = 'https://ethgasstation.info/api/ethgasAPI.json';
const ethPrice = 'https://api.gemini.com/v1/pubticker/ethusd';
const polygonGasApi = 'https://gasstation-mainnet.matic.network/';
const maticPrice = 'https://api.gemini.com/v1/pubticker/maticusd';

const commits = json.info.methods.VoteManager_40f84925.gasData;
const reveals = json.info.methods.VoteManager_f110a0fa.gasData;
const proposes = json.info.methods.BlockManager_dc82a745.gasData;


async function main() {
    const gwei = await getGasFeeData("https://rpc.lokibuilder.xyz/wallet");
    const opgwei = await getGasFeeData("https://opt-mainnet.g.alchemy.com/v2/B2TSPVLHcfePftR4ZdgRsjwoaWNAPP65");
    const baseGwei = await getGasFeeData("https://base.meowrpc.com");
    const polyGwei = await getGasFeeData("https://rpc-mainnet.maticvigil.com");
    const opStackGwei = await getGasFeeData("http://35.240.132.193:8547");
      getJSON(ethPrice, function (error, response) {
      
        const ethusd = response.last;
    
        console.log("ETHUSD", ethusd);
        // tx cost = gas * gasprice
        //           gas * gasPriceInWei/10**9

        let commitcost = Number(ethusd) * Number(gwei) * Number(median(commits)) / 10 ** 9;
        let revealcost = Number(ethusd) * Number(gwei) * Number(median(reveals)) / 10 ** 9;
        let proposecost = Number(ethusd) * Number(gwei) * Number(median(proposes)) / 10 ** 9;
        let epochcost = commitcost + revealcost + revealcost;
        console.log(commitcost, revealcost, proposecost, epochcost)
        console.log('On ethereum network. It will take take following cost for tx');
        console.log('Commit: $', commitcost);
        console.log('reveal: $', proposecost);
        console.log('propose: $', revealcost);
        console.log('cost per epoch: $', epochcost);
        console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
        console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
        console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
        console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        console.log('========================================================');
        

        console.log("ETHUSD", ethusd);
        commitcost = Number(ethusd) * Number(opgwei) * Number(median(commits)) / 10 ** 9;
        revealcost = Number(ethusd) * Number(opgwei) * Number(median(reveals)) / 10 ** 9;
        proposecost = Number(ethusd) * Number(opgwei) * Number(median(proposes)) / 10 ** 9;
        epochcost = commitcost + revealcost + revealcost;
        console.log(commitcost, revealcost, proposecost, epochcost)
        console.log('On OP Mainnet network. It will take take following cost for tx');
        console.log('Commit: $', commitcost);
        console.log('reveal: $', proposecost);
        console.log('propose: $', revealcost);
        console.log('cost per epoch: $', epochcost);
        console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
        console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
        console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
        console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        console.log('========================================================');


        console.log("ETHUSD", ethusd);
        commitcost = Number(ethusd) * Number(opStackGwei) * Number(median(commits)) / 10 ** 9;
        revealcost = Number(ethusd) * Number(opStackGwei) * Number(median(reveals)) / 10 ** 9;
        proposecost = Number(ethusd) * Number(opStackGwei) * Number(median(proposes)) / 10 ** 9;
        epochcost = commitcost + revealcost + revealcost;
        console.log(commitcost, revealcost, proposecost, epochcost)
        console.log('On ARB L3 Stack Testnet network. It will take take following cost for tx');
        console.log('Commit: $', commitcost);
        console.log('reveal: $', proposecost);
        console.log('propose: $', revealcost);
        console.log('cost per epoch: $', epochcost);
        console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
        console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
        console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
        console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        console.log('========================================================');

        console.log("ETHUSD", ethusd);
        commitcost = Number(ethusd) * Number(baseGwei) * Number(median(commits)) / 10 ** 9;
        revealcost = Number(ethusd) * Number(baseGwei) * Number(median(reveals)) / 10 ** 9;
        proposecost = Number(ethusd) * Number(baseGwei) * Number(median(proposes)) / 10 ** 9;
        epochcost = commitcost + revealcost + revealcost;
        console.log(commitcost, revealcost, proposecost, epochcost)
        console.log('On Base Mainnet network. It will take take following cost for tx');
        console.log('Commit: $', commitcost);
        console.log('reveal: $', proposecost);
        console.log('propose: $', revealcost);
        console.log('cost per epoch: $', epochcost);
        console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
        console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
        console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
        console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        console.log('========================================================');

          getJSON(maticPrice, function (error, response) {
            const maticusd = response.last;
            console.log("MATICUSD:", maticusd);
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
            console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
            console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
            console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
            console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
            console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
            console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        //     const opStackGwei = 0.45;
    
        //     commitcost = Number(ethusd) * Number(opStackGwei) * Number(median(commits)) / 10 ** 9;
        //     revealcost = Number(ethusd) * Number(opStackGwei) * Number(median(reveals)) / 10 ** 9;
        //     proposecost = Number(ethusd) * Number(opStackGwei) * Number(median(proposes)) / 10 ** 9;
        //     epochcost = commitcost + revealcost + revealcost;
        //     // console.log(Number(ethusd),Number(gwei),Number(commits))
        //     console.log('On Arbitrum network. It will take take following cost for tx (Not real time)');
        //     console.log('Commit: $', commitcost);
        //     console.log('reveal: $', proposecost);
        //     console.log('propose: $', revealcost);
        //     console.log('cost per epoch: $', epochcost);
        //     console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
        //     console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
        //     console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
        //     console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        //     console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        //     console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        //     const avaGwei = 225;
        //     const avaxPrice = 'https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd';
        //     getJSON(avaxPrice, function (error, response) {
        //       console.log('========================================================');
        //       const avaxusd = response['avalanche-2'].usd;
    
        //       commitcost = Number(avaxusd) * Number(avaGwei) * Number(median(commits)) / 10 ** 9;
        //       revealcost = Number(avaxusd) * Number(avaGwei) * Number(median(reveals)) / 10 ** 9;
        //       proposecost = Number(avaxusd) * Number(avaGwei) * Number(median(proposes)) / 10 ** 9;
        //       epochcost = commitcost + revealcost + revealcost;
        //       // console.log(Number(ethusd),Number(gwei),Number(commits))
        //       console.log('On Avalanche network. It will take take following cost for tx');
        //       console.log('Commit: $', commitcost);
        //       console.log('reveal: $', proposecost);
        //       console.log('propose: $', revealcost);
        //       console.log('cost per epoch: $', epochcost);
        //       console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
        //       console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
        //       console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
        //       console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        //       console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        //       console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
    
        //       console.log('========================================================');
        //       const xdaiusd = 1;
        //       const xdaigwei = 1;
    
        //       commitcost = Number(xdaiusd) * Number(xdaigwei) * Number(median(commits)) / 10 ** 9;
        //       revealcost = Number(xdaiusd) * Number(xdaigwei) * Number(median(reveals)) / 10 ** 9;
        //       proposecost = Number(xdaiusd) * Number(xdaigwei) * Number(median(proposes)) / 10 ** 9;
        //       epochcost = commitcost + revealcost + revealcost;
        //       // console.log(Number(ethusd),Number(gwei),Number(commits))
        //       console.log('On xDAI network. It will take take following cost for tx (Not real time)');
        //       console.log('Commit: $', commitcost);
        //       console.log('reveal: $', proposecost);
        //       console.log('propose: $', revealcost);
        //       console.log('cost per epoch: $', epochcost);
        //       console.log('cost per day if epoch = 5min: $', epochcost * 12 * 24);
        //       console.log('cost per week if epoch = 5min: $', epochcost * 12 * 24 * 7);
        //       console.log('cost per month if epoch = 5min: $', epochcost * 12 * 24 * 30);
        //       console.log('cost per day if epoch = 1 hour: $', epochcost * 24);
        //       console.log('cost per week if epoch = 1 hour: $', epochcost * 24 * 7);
        //       console.log('cost per month if epoch = 1 hour: $', epochcost * 24 * 30);
        //     });
          });
      });

}

main().catch(console.error);
