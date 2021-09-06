const fs = require("fs");
const Commenter = require('../dist/index')
const commenter = new Commenter()

let arguments = process.argv

let getFileData = (filePath) => {

    try{
        const fileData = fs.readFileSync(filePath);
        const response = JSON.parse(fileData)
        return response.info.methods;

    } catch (err) {
        console.log(err);
        return
    }  

}
//method to calculate median value

let calculateMedianValue = (numbers) => {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];

}
//method to compare gas values before and after.

let compareValue = (a,b) => {

    if(a<b){
        return ((a-b)*100)/a;
    }
    else if(b<a){
        return ((a-b)*100)/a ;
    }
    else{
        return 0
    }      
}
// method to compare the gas Consumption.

let gasCompare = () => {
    console.log(process.env.CIRCLE_PULL_REQUEST)
    let list = {}
    const gasDataI = getFileData(arguments[2]);
    const gasDataII = getFileData(arguments[3]);
    for(i in gasDataI){
        if(i in gasDataII){
        if(calculateMedianValue(gasDataI[i].gasData) && compareValue(calculateMedianValue(gasDataI[i].gasData),calculateMedianValue(gasDataII[i].gasData))!=0)
        list[gasDataI[i].method] = compareValue(calculateMedianValue(gasDataI[i].gasData),calculateMedianValue(gasDataII[i].gasData))

    }
}
if(list==={}){
    commenter.createOrUpdateComment('gasCompare', list).catch(err=>{
        console.log(err);
    })
}
else{
    commenter.createOrUpdateComment('gasCompare', list).catch(err=>{
        console.log(err);
    })
}
}

gasCompare();
