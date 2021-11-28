const fs = require("fs");
const markdown = require('json-to-markdown-table');
const Commenter = require('circleci-pr-commenter');
try{
    const commenter = new Commenter()
}
catch (err){
    console.log("Script is called in dev environment")
};

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
//method to calculate maximum value

let calculateMaximumValue = (numbers) => {
    if(numbers.length===0){
        return 0
    }

    return numbers[numbers.length-1];

}
let calculateMinimumValue = (numbers) => {
    if(numbers.length===0){
        return 0
    }

    return numbers[0];

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
    let coloumn = ['Contract','Method','Change%(Maximum)','Current(Maximum)','Master(Maximum)','Diff','Current(Minimum)','Master(Maximum)','Diff','Change%(Minimum)'];
    let gasChangeData = [];
    const gasDataI = getFileData(arguments[2]);
    const gasDataII = getFileData(arguments[3]);
    for(i in gasDataI){
        if(i in gasDataII){        
            let changeMaximum = compareValue(calculateMaximumValue(gasDataI[i].gasData),calculateMaximumValue(gasDataII[i].gasData));  
            let changeMinimum = compareValue(calculateMinimumValue(gasDataI[i].gasData),calculateMinimumValue(gasDataII[i].gasData)); 
            let diffMaximum = calculateMaximumValue(gasDataI[i].gasData)-calculateMaximumValue(gasDataII[i].gasData);
            let diffMinimum = calculateMinimumValue(gasDataI[i].gasData)-calculateMinimumValue(gasDataII[i].gasData);
            if(calculateMaximumValue(gasDataI[i].gasData) && change!=0)
            {
                let obj = {'Contract': gasDataI[i].contract, 
                'Method':gasDataI[i].method, 
                'Current(Maxiumum)':calculateMaximumValue(gasDataI[i].gasData),
                'Master(Maximum)' :calculateMaximumValue(gasDataII[i].gasData),
                'Change%(Maximum)': changeMaximum > 0 ? '+' + change.toFixed(2).toString() :'-' + Math.abs(change.toFixed(2)),
                'Diff(Maximum)' : diffMaximum > 0 ? '+' + diffMaximum.toFixed(2).toString() :'-' + Math.abs(diffMaximum.toFixed(2)),
                'Current(Minimum)':calculateMinimumValue(gasDataI[i].gasData),
                'Master(Minimum)' :calculateMinimumValue(gasDataII[i].gasData),
                'Diff(Maximum)' : diffMinimum > 0 ? '+' + diffMinimum.toFixed(2).toString() :'-' + Math.abs(diffMinimum.toFixed(2)),
                'Change%(Minimum)':changeMinimum > 0 ? '+' + change.toFixed(2).toString() :'-' + Math.abs(change.toFixed(2)),
                }
                gasChangeData.push(obj);
            }
        }
    }
let markdownstring = markdown(gasChangeData,coloumn);
if(gasChangeData.length!==0){
    try{
    await commenter.createOrUpdateComment('gasCompare', markdownstring )
    }
    catch(err){
        console.log(markdownstring);
    }
}
else{
    try{
        await commenter.createOrUpdateComment('gasCompare', `No changes found in gas Consumption`)
    }
    catch(err){
        console.log(`No changes found in gas Consumption`);
    }
        
}
}

gasCompare();
