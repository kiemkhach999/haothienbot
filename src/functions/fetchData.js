import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

export async function fetchDt() {
    try{
        // gas nomarl
        const{ result: {ProposeGasPrice: Average}} = await (await fetch(
            `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`
        )).json()
        //gas fast
        const{ result: {FastGasPrice: High}} = await (await fetch(
            `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`
        )).json()
        //check giá eth
        const { result: { ethusd: ethPrice } } = await (await fetch(
            `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_API_KEY}`
          )).json();

        // tính gas theo giá eth

        //const gasLow = +Low * 0.000000001 * +ethPrice * 21000;
        const gasAverage = +Average * 0.000000001 * +ethPrice * 21000;
        const gasHigh = +High * 0.000000001 * +ethPrice * 21000;

        //Tính gas opensea sale và Uniswap
        const gasOSAverage = +Average * 0.000000001 * +ethPrice * 71645;
        const gasOSHigh = +High * 0.000000001 * +ethPrice * 71645;

        const gasUniAverage = +Average * 0.000000001 * +ethPrice * 184523;
        const gasUniHigh = +High * 0.000000001 * +ethPrice * 184523;
          return {Average,High,gasAverage,gasHigh,gasOSAverage,gasOSHigh,gasUniAverage,gasUniHigh};
    }catch(err){
        console.log(err)
        return undefined;
    }

}