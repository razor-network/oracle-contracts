// /* global contract, it, artifacts, assert, web3 */
// // const { assertRevert } = require('./helpers/assertRevert')
// let Ord = artifacts.require('./ord.sol')
// let SlaveSolver = artifacts.require('./SlaveSolver.sol')
// // let Toke = artifacts.require('./Toke.sol')
// // const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// // let gasPrice = new web3.utils.BN(20000000000)
//
// // ether
//
// contract('Ord', function (accounts) {
//   contract('SlaveSolver', function () {
//     it('should be able to insert', async function () {
//       let ord = await Ord.deployed()
//       let slaveSolver = await SlaveSolver.deployed()
//
//       function median (values) {
//         values.sort(function (a, b) {
//           return a - b
//         })
//
//         if (values.length === 0) return 0
//
//         var half = Math.floor(values.length / 2)
//
//       // if (values.length % 2) {
//         return values[half]
//       // } else {
//       // return (values[half - 1] + values[half]) / 2.0
//       // }
//       }
//       let tx, tx2
//       let val
//       let values = []
//       // let valla = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
//       let vallalla = []
//       let gases = 0
//       let gases2 = 0
//       for (let i = 0; i < 30; i++) {
//         // val = Math.floor(Math.random() * 10000)
//         // val = valla[i]
//         val = i
//         vallalla.push(i)
//         console.log(val)
//         values.push(val)
//         tx = await ord.insert(val)
//         tx2 = await slaveSolver.vote(val, 1)
//         console.log(tx.receipt.gasUsed)
//         console.log(tx2.receipt.gasUsed)
//         gases += tx.receipt.gasUsed
//         gases2 += tx2.receipt.gasUsed
//       }
//       let medians = await ord.median()
//       console.log(medians.toString())
//       let jsMed = median(values)
//       console.log('jsMed', jsMed)
//       assert.equal(medians.toString(), jsMed.toString())
//       console.log('total gas', gases.toString())
//       console.log('total gas2', gases2.toString())
//       let tx3 = await slaveSolver.giveSorted(vallalla, 14)
//       console.log(tx3.receipt.gasUsed)
//       gases2 += tx3.receipt.gasUsed
//       console.log('total gas2', gases2.toString())
//
//       // weights [1,2,3,4,5,6,7,8,9,10]
//       // console.log(tx3.toString())
//       // let accWeights = await slaveSolver.accWeights(9)
//       // console.log('accWeights', accWeights.toString())
//       // let medd = await slaveSolver.accWeights(4)
//       // console.log('medd', medd.toString())
//       // let totalWeight = await slaveSolver.totalWeight()
//       // console.log('totalWeight', totalWeight.toString())
//       // console.log(tx3.receipt.gasUsed)
//     })
//   })
// })
