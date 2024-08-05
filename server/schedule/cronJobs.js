const cron = require("node-cron");
const bot = require("../bot/commands");
const moment = require("moment");
const { fetchAllStockPrices } = require("../utils/delay");
const { formatMarketData } = require("../utils/formatData");
const {
  fetchStockPrice,
  fetchEarningCalendar,
  fetchEconomicCalendar,
  marketOpen,
  fetchStockPricesTwelveData,
} = require("../controllers/controllersAPIs");
const MarketData = require("../models/marketData");
const { saveMarketData } = require("../controllers/marketDataController");
const { saveOrUpdateData } = require("../controllers/earningsDataController");
const {
  saveOrUpdateEconomicEvents,
} = require("../controllers/economicEventController");
const logger = require("../utils/logger");
const { delay } = require("../utils/delay");


function mapProperties(item) {
  return {
    symbol: item.symbol || null,
    currency: item.currency || null,
    description: item.description || null,
    open: parseFloat(item.open) || parseFloat(item.regularMarketOpen) || null,
    high: parseFloat(item.high) || parseFloat(item.dayHigh) || null,
    low: parseFloat(item.low) || parseFloat(item.dayLow) || null,
    close: parseFloat(item.close) || parseFloat(item.regularMarketPreviousClose) || null,
    previousClose: parseFloat(item.previous_close) || parseFloat(item.previousClose) || null,
    percent_change: parseFloat(item.percent_change) || null,
    bid: parseFloat(item.bid) || null,
    ask: parseFloat(item.ask) || null,
    underlyingSymbol: item.underlyingSymbol || null,
    currentPrice: parseFloat(item.currentPrice) || null,
  };
}

function mergeArrays(array1, array2) {
  const map = new Map();

  array1.forEach(item => map.set(item.symbol, mapProperties(item)));
  array2.forEach(item => {
    const mappedItem = mapProperties(item);
    if (map.has(item.symbol)) {
      map.set(item.symbol, { ...map.get(item.symbol), ...mappedItem });
    } else {
      map.set(item.symbol, mappedItem);
    }
  });

  return Array.from(map.values());
}
const openSymbols = [
  { description: "Futuros Bonos US 10 años", symbol: "ZN=F" },
  { description: "Futuros Soja", symbol: "ZS=F" },
  { description: "Futuros Oro", symbol: "GC=F" },
  { description: "Futuros Plata", symbol: "SI=F" },
  { description: "Futuros Petróleo", symbol: "CL=F" },
  { description: "Futuros S&P 500", symbol: "ES=F" },
  { description: "Futuros NASDAQ 100", symbol: "NQ=F" },
  { description: "Futuros Dow Jones", symbol: "YM=F" },
  { description: "Futuros Russell 2000", symbol: "RTY=F" },
  { description: "Futuros Dólar Îndex", symbol: "DX=F" },
  { description: "Bitcoin/USD", symbol: "BTC-USD" },
  { description: "Etherum/USD", symbol: "ETH-USD" },
];
const closeSymbols = [
  { description: "S&P 500", symbol: "^GSPC" },
  { description: "Nasdaq", symbol: "^IXIC" },
  { description: "Dow Jones", symbol: "^DJI" },
  { description: "Russell 2000", symbol: "^RUT" },
  { description: "Tasa Bonos US 10 años ", symbol: "^TNX" },
  { description: "DAX", symbol: "^GDAXI", country: "Germany" },
  { description: "SSE", symbol: "000001.SS", country: "China" },
  { description: "Nikkei", symbol: "^N225" },
  { description: "Bovespa", symbol: "^BVSP" },
  { description: "Merval", symbol: "^MERV" }, // no trae currency
  { description: "US Dólar Index", symbol: "DX-Y.NYB" },
  { description: "Futuros Soja", symbol: "ZS=F" },
  { description: "Futuros Oro", symbol: "GC=F" },
  { description: "Futuros Plata", symbol: "SI=F" },
  { description: "Futuros Petróleo", symbol: "CL=F" },
  { description: "Bitcoin/USD", symbol: "BTC-USD" },
  { description: "Etherum/USD", symbol: "ETH-USD" },
];

const closeYahooSymbols = [
  { description: "DAX", symbol: "^GDAXI", country: "Germany" },
  { description: "SSE", symbol: "000001.SS", country: "China" },
  { description: "Nikkei", symbol: "^N225" },
  { description: "Bovespa", symbol: "^BVSP" },
  { description: "Merval", symbol: "^MERV" }, // no trae currency
  { description: "Futuros Soja", symbol: "ZS=F" },
  { description: "Futuros Oro", symbol: "GC=F" },
  { description: "Futuros Plata", symbol: "SI=F" },
  { description: "Futuros Petróleo", symbol: "CL=F" },
  { description: "Bitcoin/USD", symbol: "BTC-USD" },
  { description: "Etherum/USD", symbol: "ETH-USD" },
];

const closeTwelveSymbols = [
  { description: "S&P 500", symbol: "SPX" },
  { description: "Nasdaq", symbol: "IXIC" },
  { description: "Dow Jones", symbol: "DJI" },
  { description: "Russell 2000", symbol: "RUT" },
  { description: "Tasa Bonos US 10 años ", symbol: "TNX" },
  { description: "US Dólar Index", symbol: "DXY" },
];

const sendMessageToChatAndTopic = async (chatId, topicId, message) => {
  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      message_thread_id: topicId,
    });
    logger.info(`Mensaje enviado a chatId: ${chatId}, topicId: ${topicId}`);
  } catch (err) {
    logger.error(
      `Error enviando mensaje a chatId: ${chatId}, topicId: ${topicId} - ${err.message}`
    );
  }
};

//  "*/2 * * * *"
//  "00 9 * * 1-5"

const earningsDataCron = cron.schedule(
  "10 8 * * 1-5",
  async () => {
    try {
      logger.info("Tarea de actualización de base de datos ejecutada.");
      const earningsCalendar = await fetchEarningCalendar();
      const saveData = await saveOrUpdateData(earningsCalendar);
      return saveData;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  },
  {
    timezone: "America/New_York",
  }
);

const calendarDataCron = cron.schedule(
  "00 8 * * 1-5",
  async () => {
    try {
      logger.info("Tarea de actualización de base de datos ejecutada.");
      const economicCalendar = await fetchEconomicCalendar();
      if (
        economicCalendar &&
        economicCalendar.status === 200 &&
        economicCalendar.data.length > 0
      ) {
        const saveOrUpdateData = saveOrUpdateEconomicEvents(
          economicCalendar.data
        );
        logger.info(`economic info actualizada`);
      } else {
        logger.info(`no hay economic info que actualizar`);
      }
    } catch (err) {
      logger.error(err);
      throw err;
    }
  },
  {
    timezone: "America/New_York",
  }
);

const openMarketCron = cron.schedule(
  "30 9 * * 1-5",
  async () => {
    try {
      logger.info("Tarea de envío de mensaje programado ejecutada.");
      const delayTime = 1000;
      const openMarketData = await fetchAllStockPrices(
        fetchStockPrice,
        openSymbols,
        delayTime
      );
      const formattedMarketData = formatMarketData(openMarketData, openSymbols);
      const date = moment().format("DD/MM/YYYY");
      sendMessageToChatAndTopic(
        process.env.CHAT_ID,
        process.env.TOPIC_INFORMES,
        `*Informe apertura de mercado ${date}*\n\n${formattedMarketData}`
      );
      await saveMarketData({ data: openMarketData, time: "open" });
      logger.info("Datos de apertura de mercado guardados correctamente.");
    } catch (err) {
      logger.error(
        `Error en la tarea de envío de mensaje programado: ${err.message}`
      );
      throw new Error(err);
    }
  },
  {
    timezone: "America/New_York",
  }
);

const closeMarketCron = cron.schedule(
  "30 16 * * 1-5",
  async () => {
/*     try {
      logger.info("Tarea de envío de mensaje programado ejecutada.");
      const delayTime = 1000;
      const closeMarketData = await fetchAllStockPrices(
        fetchStockPrice,
        closeSymbols,
        delayTime
      );
      const formattedMarketData = formatMarketData(
        closeMarketData,
        closeSymbols
      );
      const date = moment().format("DD/MM/YYYY");
      sendMessageToChatAndTopic(
        process.env.CHAT_ID,
        process.env.TOPIC_INFORMES,
        `*Informe cierre de mercado ${date}*\n\n${formattedMarketData}`
      );
      await saveMarketData({ data: closeMarketData, time: "close" });
      logger.info("Datos de apertura de mercado guardados correctamente.");
    } catch (err) {
      logger.error(`Error en la tarea de cierre de mercado: ${err.message}`);
      throw new Error(err);
    } */
      const delayTime = 1000;
      let array1 = [];
      let array2 = [];
    
      try {
        array1 = await fetchAllStockPrices(fetchStockPrice, openSymbols, delayTime);
      } catch (err) {
        logger.error(`Error fetching array1: ${err}`);
      }
    
      while (true) {
        try {
          const results = await fetchStockPricesTwelveData();
          console.log(results.status, results.data.code);
          if (results.status === 200 && results.data.code !== 429) {
            logger.info(`data ok`);
            array2 = Object.values(results.data);
            break; // Salir del bucle si la petición fue exitosa
          } else if (results.data.code === 429) {
            logger.info(`delay to fetching stock data`);
            await delay(60000); // Esperar 1 minuto antes de volver a intentar
          } else {
            break; // Salir del bucle si hay otro tipo de error
          }
        } catch (err) {
          logger.error(`${err}`);
          break; // Salir del bucle si ocurre un error no relacionado con el rate limit
        }
      }
    
      const mergedArray = mergeArrays(array1, array2);

      await saveMarketData({ data: mergedArray, time: "close" });
      logger.info("Datos de apertura de mercado guardados correctamente.");
  },
  {
    timezone: "America/New_York",
  }
);



module.exports = {
  openMarketCron,
  closeMarketCron,
  sendMessageToChatAndTopic,
  earningsDataCron,
};
