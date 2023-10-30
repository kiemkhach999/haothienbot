import Binance from "binance-api-node"
import TelegramBot from "node-telegram-bot-api";
import dotenv from 'dotenv';
import { CoinGeckoClient } from "coingecko-api-v3";

import {fetchDt} from './fetchData.js'

import express from "express";
import axios from "axios";
import bodyParser from "body-parser";



dotenv.config()

const app = express();

//Chỉnh sửa telegram api

const host = '127.0.0.1';
const {TELEGRAM_BOT_TOKEN,SERVER_URL} = process.env
const TELEGRAM_API=`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
const URL = `/webhook/${TELEGRAM_BOT_TOKEN}`
const WEBHOOK_URL = SERVER_URL+URL;


app.use(bodyParser.json());

const init = async () =>{
  const res = await axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`);
  console.log(res.data);
}




app.listen(process.env.PORT || 7071 ,host, async () =>{
  console.log("app running on port",process.env.PORT || 7071);
  await init()
})



//format money 
const formatMoney = new Intl.NumberFormat('en-US', {
    style : 'currency',
    currency: 'USD'
});

//Binance
const binanceClient = Binance.default({
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET
});

//Coingecko
const coingeckoClient = new CoinGeckoClient({
    timeout:10000,
    autoRetry: true,
});


// Đổi usdt ra vnd
const usdt = await coingeckoClient.simplePrice(
    {
      ids: ["tether"],
      vs_currencies: ["vnd"],
    }
  );

// Lấy dữ liệu từ Json

// VND coingecko
  const text = JSON.stringify(usdt);
  const obj = JSON.parse(text);
  const usdtToVnd = obj.tether.vnd;



//GAS

//lấy data từ fetchData
const data = await fetchDt();

if(!data) {
    console.log("ERR");
}
const { Average,High,gasAverage,gasHigh,gasOSAverage,gasOSHigh,gasUniAverage,gasUniHigh } = data;
const gasHigh1 = formatMoney.format(gasHigh);
const gasAverage1 = formatMoney.format(gasAverage);
const gasOSAverage1 = formatMoney.format(gasOSAverage);
const gasOSHigh1 = formatMoney.format(gasHigh);
const gasUniAverage1 = formatMoney.format(gasUniAverage);
const gasUniHigh1 = formatMoney.format(gasUniHigh);

//khai báo bot Telegram
const options = {
  webHook:{
    PORT:7071
  }
}
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, options);
//const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: true});

//Lệnh check token 
app.post(URL,(req,res) =>{

  const chatId = req.body.message.chat.id
  const fullMsg = req.body.message.text
  if(fullMsg.slice(0,2)=="p "){
    const [cryptoToken1, cryptoToken2 ="USDT"] = fullMsg.slice(2).split(" ");
    binanceClient.avgPrice({ symbol: `${cryptoToken1}${cryptoToken2}` .toUpperCase() }) // example, { symbol: "BTCUSTD" }
  .then((avgPrice) => {
      axios.post(`${TELEGRAM_API}/sendMessage`,{
      chat_id: chatId,
      text: `${cryptoToken1}`.toUpperCase() + "  " + formatMoney.format(avgPrice['price'])
      })
  })
  .catch((error) =>{
    axios.post(`${TELEGRAM_API}/sendMessage`,{
      chat_id: chatId,
      text: `Cạn kiệt linh khí nên không thể tìm kiếm ${cryptoToken1}${cryptoToken2}`
      })
  }
  )
  }
  //check 1 số lượng token 
  if(fullMsg.slice(0,4)=="val "){
  
    const [amount, cryptoToken1,cryptoToken2="USDT"] = fullMsg.slice(4).split(" ");
    //console.log(amount, cryptoToken1);
    binanceClient.avgPrice({ symbol: `${cryptoToken1}${cryptoToken2}` .toUpperCase() })
    .then((avgPrice) => {
      const value = Number(avgPrice['price'])*amount;
      //Đổi value usdt ra vnd
      let valueToVnd = value * Number(usdtToVnd);
      valueToVnd = valueToVnd.toLocaleString('it-IT', {style : 'currency', currency : 'VND'});
      axios.post(`${TELEGRAM_API}/sendMessage`,{
        chat_id: chatId,
        text: `${amount}`+ " " + `${cryptoToken1}`.toUpperCase() + " " + " = " +"\n"+"\n"+ "🔸" + " " + formatMoney.format(value) + " " + "USDT" +"\n" + "🔸" + valueToVnd
      })
    })
    .catch((error) =>{
      axios.post(`${TELEGRAM_API}/sendMessage`,{
        chat_id: chatId,
        text: `Error retrieving the price for ${cryptoToken1}${cryptoToken2}: ${error}`}
      )})
      }

    //check gas
    if(fullMsg.slice(0,3).toLowerCase()=="gas"){
      axios.post(`${TELEGRAM_API}/sendMessage`,{
        chat_id: chatId,
        text: "🚲 Average : "+`${Average}` +" "+ "Gwei" + "\n " + "\n" +  "Transfer: " +`${gasAverage1}`+ "\n" + "Opensea: " +`${gasOSAverage1}`+ "\n" + "Uniswap: " +`${gasUniAverage1}` + "\n"+ "\n" + 
        "🏍 High : "+`${High}` +" "+ "Gwei" + "\n " + "\n" +  "Transfer: " +`${gasHigh1}`+ "\n" + "Opensea: " +`${gasOSHigh1}`+ "\n" + "Uniswap: " +`${gasUniHigh1}`
      })
    }
    

    //check NFT floor bằng Opensea API 

    if(fullMsg.slice(0,3).toLowerCase()=="fp "){
      const slug = fullMsg.slice(3);
      const optionsNFT = {
        method: 'GET',
        url: `https://api.opensea.io/api/v2/collections/${slug}/stats`,
        headers: {accept: 'application/json', 'x-api-key': '01adc9214f0d4edb86b267378061bfa8'}
      };
      axios.request(optionsNFT).then(function (response) {
        // Json của opensea
        const dataNFT = response.data;
        const textNFT  = JSON.stringify(dataNFT);
        const objNFT = JSON.parse(textNFT);
        
        const volumeTotal = Number(objNFT.total.volume).toFixed(2);
        const floorNFT = Number(objNFT.total.floor_price).toFixed(4);
        const floorSymbol = objNFT.total.floor_price_symbol

        const volume1Day = Number(objNFT.intervals[0].volume).toFixed(2);
        const sales1Day = objNFT.intervals[0].sales
        const volumechange = Number(objNFT.intervals[0].volume_change).toFixed(2);

        return axios.post(`${TELEGRAM_API}/sendMessage`,{
          chat_id: chatId,
          text: "Name : " + " " + `${slug}`+"\n" + "\n" + "Total Volume : " + " " + `${volumeTotal}` + " " + "ETH" + "\n" + "Floor : " + " " + `${floorNFT}` + " " + `${floorSymbol}` + "\n " + "\n" + 
          "Volume one day :  " + " " + `${volume1Day}` + " " + "ETH" + "\n" + "Sales in 1 day  : " + " " + `${sales1Day}` + "\n" + "Volumechange : " + " " + `${volumechange}` + " "+ "%" 
        })
      })
      .catch(function (error) {
        console.error(error);
      });
    }

    //Bot chào

    if(fullMsg.slice(0,6)=="/start"){
      axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: 'Xin chào ta là hạo thiên nhãn . Ta chưa có cái chức năng mẹ gì ngoài việc truy thuộc tính token , check gia sản và giá trị của NFT'
      });
    }




  return res.send();
});


export function helloWorld(req, res) {
    res.send('Hello, World');
};