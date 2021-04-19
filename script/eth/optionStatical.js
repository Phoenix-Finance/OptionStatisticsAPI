var Web3 = require('web3');
//var web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io/v3/75c431806c0d49ee9868d4fdcef025bd"));
var web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/75c431806c0d49ee9868d4fdcef025bd"));

const BN = require("bn.js");
var { abi } = require('./build/contracts/OptionsProxy.json');
var optionabi = abi;
var { abi } = require('./build/contracts/ManagerProxy.json');
const underLying =  ["","btc","eth","mkr", "snx","link"];
const optype =["call","put"];

function getDate(unixtime) {
    var u = new Date(unixtime*1000);
    return u.getUTCFullYear() +
        '-' + ('0' + u.getUTCMonth()).slice(-2) +
        '-' + ('0' + u.getUTCDate()).slice(-2) +
        ' ' + ('0' + u.getUTCHours()).slice(-2) +
        ':' + ('0' + u.getUTCMinutes()).slice(-2) +
        ':' + ('0' + u.getUTCSeconds()).slice(-2) +
        '(UTC)'
};

async function availableOptionStatistics(managerAddress,poolAddress,fromBlocjNumber) {
    var settle = new Map();
    settle['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()] = "usdc";
    settle['0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B'.toLowerCase()] = "fnx";

    let availableOption =  new Map();
    try {

        const optionpool = new web3.eth.Contract(optionabi, poolAddress);
        const CreateEvents = await optionpool.getPastEvents('CreateOption', {fromBlock:fromBlocjNumber});
       // console.log("CreateEvents count=" + CreateEvents.length);

        for(i=0;i<CreateEvents.length;i++) {
           let optionid = CreateEvents[i].returnValues.optionID;
           optionextra = await optionpool.methods.getOptionsExtraById(optionid).call();
           let option = await optionpool.methods.getOptionsById(optionid).call();

           let opdata = {
                optionid:optionid,
                owner:option[1],    // option's owner
                optType:optype[option[2]],    //0 for call, 1 for put
                underlying:underLying[option[3]], // underlying ID, 1 for BTC,2 for ETH
                optionsPrice:optionextra[3]/100000000,
                settlement:settle[optionextra[0].toLowerCase()],    //user's settlement paying for option.
                expiration:getDate(option[4]), //
                amount:web3.utils.fromWei(new BN(option[6])),
                strikePrice:option[5]/100000000   //  strike price
            }

            availableOption[optionid] = opdata;
        }

        return availableOption

    } catch (e) {
        console.error(e)
    }
}

async function exerciseOptionStatistics(managerAddress,poolAddress,fromBlocjNumber) {
    let optionMap = new Map();
    let excerciseMap = new Map();
    let excerciseOption =  new Map();

    try {
        const optionpool = new web3.eth.Contract(optionabi, poolAddress);
        const CreateEvents = await optionpool.getPastEvents('CreateOption', {fromBlock:fromBlocjNumber});
        //console.log("CreateEvents count=" + CreateEvents.length);

        for(i=0;i<CreateEvents.length;i++) {
            let optionid = CreateEvents[i].returnValues.optionID;
            optionMap[optionid] = await optionpool.methods.getOptionsExtraById(optionid).call();
        }

        const optionManager = new web3.eth.Contract(abi, managerAddress);
        const ExcerciseEvents = await optionManager.getPastEvents('ExerciseOption', {fromBlock:fromBlocjNumber});
        //console.log("ExcerciseEvents="+ExcerciseEvents.length)
        for(i=0;i<ExcerciseEvents.length;i++) {
            excerciseMap[ExcerciseEvents[i].returnValues.optionID] = ExcerciseEvents[i].returnValues;
        }

        for(i=0;i<ExcerciseEvents.length;i++) {
            let optid = ExcerciseEvents[i].returnValues.optionId;
            let sellPay = ExcerciseEvents[i].returnValues.sellValue;
            let sellAmount = ExcerciseEvents[i].returnValues.amount;
            let buyOptPrice = optionMap[optid][3];

            let exopdata = {
                optionid:optid,
                exerciseAmount:web3.utils.fromWei(new BN(sellAmount)),
                exerciseBack: web3.utils.fromWei(new BN(sellPay))/100000000+"(USD)",
                buyPay:web3.utils.fromWei(new BN(sellAmount).mul(new BN(buyOptPrice)))/100000000 + "(USD)"
            }

            excerciseOption[optid] = exopdata;
        }

        return excerciseOption;

    } catch (e) {
        console.error(e)
    }
}

async function AvailableOptionFnxStatistics() {
    let managerAddress = '0xfdf252995da6d6c54c03fc993e7aa6b593a57b8d';
    let optionPoolAddress = '0xed54fb841a62a69d4935303706d1dad7dc87b360';
    let fromBlocjNumber = 11188245;
    return await availableOptionStatistics(managerAddress,optionPoolAddress,fromBlocjNumber);
}

async function ExcerciseOptionFnxStatistics() {
    let managerAddress = '0xfdf252995da6d6c54c03fc993e7aa6b593a57b8d';
    let optionPoolAddress = '0xed54fb841a62a69d4935303706d1dad7dc87b360';
    let fromBlocjNumber = 11188245;
   return await exerciseOptionStatistics(managerAddress,optionPoolAddress,fromBlocjNumber);
}

async function AvailableOptionUsdcStatistics() {
    let managerAddress = '0x120f18f5b8edcaa3c083f9464c57c11d81a9e549';
    let optionPoolAddress = '0xe12a03aea96dc56fb8007ec54fcfbdd61965d925';
    let fromBlocjNumber = 11188245;
    return await availableOptionStatistics(managerAddress,optionPoolAddress,fromBlocjNumber);
}

async function ExcerciseOptionUsdcStatistics() {
    let managerAddress = '0x120f18f5b8edcaa3c083f9464c57c11d81a9e549';
    let optionPoolAddress = '0xe12a03aea96dc56fb8007ec54fcfbdd61965d925';
    let fromBlocjNumber = 11188245;
    return await exerciseOptionStatistics(managerAddress,optionPoolAddress,fromBlocjNumber);
}


async function test() {
  let ret = await AvailableOptionUsdcStatistics();
  console.log("usdc options")
  console.log(ret);

  ret = await ExcerciseOptionUsdcStatistics();
  console.log("\n\nexcercise usdc options")
  console.log(ret);

  ret = await AvailableOptionFnxStatistics();
  console.log("\n\nfnx options")
  console.log(ret);

   ret = await ExcerciseOptionFnxStatistics();
   console.log(ret);
   console.log("\n\nexcercise fnx options")
}

test();

exports.AllOptionUsdcStatistics = AvailableOptionFnxStatistics;
exports.ExcerciseOptionUsdcStatistics = ExcerciseOptionUsdcStatistics;
exports.AllOptionFnxStatistics = AvailableOptionUsdcStatistics;
exports.ExcerciseOptionFnxStatistics = ExcerciseOptionFnxStatistics;

