const fs = require("fs");
const markdown = require('json-to-markdown-table');
const Commenter = require('circleci-pr-commenter');
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

let compareValue = (gas_usage_current,gas_usage_master) => {

    if(gas_usage_current === gas_usage_master){
        return 0 //no change ;
    }
    else{
        return ((gas_usage_current-gas_usage_master)/gas_usage_master)*100
        
    }      
}
// method to compare the gas Consumption.

let gasCompare = async () => {
    let coloumn = ['contract','method','change%','current','master'];
    let gasChangeData = [];
    const gasDataI = getFileData(arguments[2]);
    const gasDataII = getFileData(arguments[3]);
    for(i in gasDataI){
        if(i in gasDataII){        
            let change = compareValue(calculateMedianValue(gasDataI[i].gasData),calculateMedianValue(gasDataII[i].gasData));        
            if(calculateMedianValue(gasDataI[i].gasData) && change!=0)
            {
                let obj = {'contract': gasDataI[i].contract, 
                'method':gasDataI[i].method, 
                'current':calculateMedianValue(gasDataI[i].gasData),
                'master' :calculateMedianValue(gasDataII[i].gasData),
                'change%': change > 0 ? '(+)' + change.toFixed(2).toString() :'(-)' + Math.abs(change.toFixed(2)),}
                gasChangeData.push(obj);
            }
        }
        else{
            let obj = {'contract': gasDataI[i].contract, 
                'method':gasDataI[i].method, 
                'current':calculateMedianValue(gasDataI[i].gasData),
                'master' :0,
                'change%':0,}
                gasChangeData.push(obj);

            }
    }
let markdownstring = markdown(gasChangeData,coloumn);
if(gasChangeData.length!==0){
    await commenter.createOrUpdateComment('gasCompare', markdownstring ).catch(err=>{
        console.log(err);
    })
}
else{
    await commenter.createOrUpdateComment('gasCompare', `No changes found in gas Consumption`).catch(err=>{
        console.log(err);
    })
}
}

gasCompare();
