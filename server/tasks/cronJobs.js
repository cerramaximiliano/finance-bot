const cron = require("node-cron");
const bot = require("../bot/commands");
const moment = require("moment");
const { fetchAllStockPrices } = require("../utils/delay");
const {
  formatMarketData,
  transformData,
  formatGainersLosersData,
  formatDataEarnings,
  formatData,
} = require("../utils/formatData");
const {
  fetchStockPrice,
  fetchEarningCalendar,
  fetchEconomicCalendar,
  marketOpen,
  fetchStockPricesTwelveData,
  fetchStockPricesRealTimeData,
  fecthGainersOrLosers,
  fetchMarketCap,
  fetchMarketCapStocks,
} = require("../controllers/controllersAPIs");
const MarketData = require("../models/marketData");
const {
  saveMarketData,
  saveMarketOpen,
  didMarketOpenToday,
} = require("../controllers/marketDataController");
const {
  saveOrUpdateData,
  findStockDataByDateRange,
} = require("../controllers/earningsDataController");
const {
  saveOrUpdateEconomicEvents,
  findEconomicEventsByDateRange,
} = require("../controllers/economicEventController");
const logger = require("../utils/logger");
const { delay } = require("../utils/delay");
const {
  isMarketOpenToday,
  getClosestDate,
  readableDate,
} = require("../utils/dates");
const {
  saveGainersOrLosersData,
} = require("../controllers/gainersLosersDataController");

const { loginAndScrape } = require("../scraper/clubScraper");
const {
  checkTaskSuccess,
  logTaskExecution,
} = require("../controllers/tasksControllers");

function mapProperties(item) {
  return {
    symbol: item.symbol || null,
    currency: item.currency || null,
    description: item.description || null,
    open: parseFloat(item.open) || parseFloat(item.regularMarketOpen) || null,
    high: parseFloat(item.high) || parseFloat(item.dayHigh) || null,
    low: parseFloat(item.low) || parseFloat(item.dayLow) || null,
    close: parseFloat(item.close) || null,
    previousClose:
      parseFloat(item.previous_close) || parseFloat(item.previousClose) || null,
    percent_change: parseFloat(item.percent_change) || null,
    bid: parseFloat(item.bid) || null,
    ask: parseFloat(item.ask) || null,
    underlyingSymbol: item.underlyingSymbol || null,
    currentPrice: parseFloat(item.price) || null,
  };
}

function mergeArrays(array1, array2) {
  const map = new Map();

  array1.forEach((item) => map.set(item.symbol, mapProperties(item)));
  array2.forEach((item) => {
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
  { description: "S&P 500", symbol: "SPX" },
  { description: "Nasdaq", symbol: "IXIC" },
  { description: "Dow Jones", symbol: "DJI" },
  { description: "Russell 2000", symbol: "RUT" },
  { description: "Tasa Bonos US 10 años ", symbol: "TNX" },
  { description: "DAX", symbol: "^GDAXI", country: "Germany" },
  { description: "SSE", symbol: "000001.SS", country: "China" },
  { description: "Nikkei", symbol: "^N225" },
  { description: "Bovespa", symbol: "^BVSP" },
  { description: "Merval", symbol: "^MERV" }, // no trae currency
  { description: "US Dólar Index", symbol: "DXY" },
  { description: "Futuros Soja", symbol: "ZS=F" },
  { description: "Futuros Oro", symbol: "GC=F" },
  { description: "Futuros Plata", symbol: "SI=F" },
  { description: "Futuros Petróleo", symbol: "CL=F" },
  { description: "Bitcoin/USD", symbol: "BTC-USD" },
  { description: "Etherum/USD", symbol: "ETH-USD" },
];
// realtimefinance data ^GDAXI,000001.SS,^N225,^BVSP,^MERV
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
  console.log(message);
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
// Cron que envía mensaje de Earnings Calendar
const earningsCalendarNotificationHours = "40 8 * * 1-5";
const earningsNotificationCron = cron.schedule(
  "30 8 * * 1-5",
  async () => {
    try {
      let text = [];
      const dataBaseFound = await findStockDataByDateRange();
      const marketCapData = await fetchMarketCap();
      if (dataBaseFound && dataBaseFound.length > 0) {
        logger.info("bot request - earnings Calendar DDBB");
        text = dataBaseFound.map((element) => {
          const closestTimestamp = getClosestDate(
            element.earnings_release_date,
            element.earnings_release_next_date
          );
          return {
            symbol: element.symbol,
            name: element.name,
            date: readableDate(closestTimestamp),
          };
        });

        const filteredSymbols = text.filter((item) =>
          marketCapData.includes(item.symbol)
        );
        let earningsCalendarText = `*Earnings Calendar ${moment().format(
          "DD/MM/YYYY"
        )}*\n\n`;
        if (filteredSymbols && filteredSymbols.length > 0) {
          earningsCalendarText += formatDataEarnings(filteredSymbols);
        } else {
          earningsCalendarText += `No hay eventos para la fecha`;
        }

        if (earningsCalendarText) {
          sendMessageToChatAndTopic(
            process.env.CHAT_ID,
            process.env.TOPIC_INFORMES,
            earningsCalendarText
          );
        }
      }
    } catch (err) {
      logger.error(`error on notification earnings task: ${err}`);
    }
  },
  {
    timezone: "America/New_York",
  }
);
// Cron que envía mensaje de Economic Calendar
const economicCalendarNotificationHours = "42 8 * * 1-5";
const economicCalendarNotificationCron = cron.schedule(
  economicCalendarNotificationHours,
  async () => {
    try {
      let results = await findEconomicEventsByDateRange();
      let economicCalendarText = `*Economic Calendar ${moment().format(
        "DD/MM/YYYY"
      )}*\n\n`;
      if (results && results.length > 0) {
        logger.info("economic Calendar ddbb results");
        false;
      }
      if (results.length > 0) {
        let formattedData = formatData(results);
        economicCalendarText = economicCalendarText + formattedData;
      } else {
        economicCalendarText =
          economicCalendarText + "No hay eventos para la fecha";
      }
      logger.info(economicCalendarText);
      if (economicCalendarText) {
        sendMessageToChatAndTopic(
          process.env.CHAT_ID,
          process.env.TOPIC_INFORMES,
          economicCalendarText
        );
      }
    } catch (err) {
      logger.err(err);
    }
  },
  {
    timezone: "America/New_York",
  }
);
// Cron que actualiza la base de datos de Earnings Calendar
const earningsUpdateHours = "33 8 * * 1-5";
const earningsDataCron = cron.schedule(
  earningsUpdateHours,
  async () => {
    try {
      const earningsTask = await checkTaskSuccess("earningsDataCron");
      if (earningsTask.success) {
        logger.info(
          "Tarea de actualización de Earnings Calendar ya se encuentra ejecutada"
        );
        return;
      } else {
        logger.info(
          "Tarea de actualización de base de datos ejecutada - Earnings Calendar."
        );
        const earningsCalendar = await fetchEarningCalendar();
        const saveData = await saveOrUpdateData(earningsCalendar);
        logger.info("Tarea de actualización de Earnings Exit");
        await logTaskExecution(
          "earningsDataCron",
          "success",
          "Tarea de earnings calendar realizada exitosamente"
        );
        return saveData;
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
// Cron que actualiza la base de datos de Economic Calendar
const calendarUpdateHours = "35 8 * * 1-5";
const calendarDataCron = cron.schedule(
  calendarUpdateHours,
  async () => {
    try {
      const calendarTask = await checkTaskSuccess("calendarDataCron");
      if (calendarTask.success) {
        logger.info(
          "Tarea de actualización de Calendar ya se encuentra ejecutada"
        );
        return;
      } else {
        logger.info(
          "Tarea de actualización de base de datos ejecutada - Economic Calendar."
        );
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
        await logTaskExecution(
          "calendarDataCron",
          "success",
          "Tarea de calendar economic realizada exitosamente"
        );
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
// Cron que actualiza la base de datos de Open Market Symbols y envía mensaje Telegram
const openHours = "31 12 * * 1-5";
const openMarketCron = cron.schedule(
  openHours,
  async () => {
    try {
      const openMarketTask = await checkTaskSuccess("openMarketDataCron");
      if (openMarketTask.success) {
        logger.info(
          "Tarea de actualización de Open Market ya se encuentra ejecutada"
        );
        return;
      }

      logger.info("Tarea de envío de mensaje programado ejecutada.");
      const date = moment().format("DD/MM/YYYY");
      const { data } = await marketOpen();
      const { nextMarketOpen, nextMarketClose } = data.attributes;

      if (isMarketOpenToday(nextMarketOpen, nextMarketClose)) {
        const saveOpenMarket = await saveMarketOpen(data);
        const delayTime = 1000;
        const openMarketData = await fetchAllStockPrices(
          fetchStockPrice,
          openSymbols,
          delayTime,
          3
        );
        const formattedMarketData = formatMarketData(
          openMarketData,
          openSymbols,
          "open"
        );
        sendMessageToChatAndTopic(
          process.env.CHAT_ID,
          process.env.TOPIC_INFORMES,
          `*Informe apertura de mercado ${date}*\n\n${formattedMarketData}`
        );
        const savedData = await saveMarketData({
          data: openMarketData,
          time: "open",
        });

        logger.info("Datos de apertura de mercado guardados correctamente.");
        await logTaskExecution(
          "openMarketDataCron",
          "success",
          "Tarea de open market realizada exitosamente"
        );
      } else {
        logger.info("El mercado no opera el día de la fecha.");
        await logTaskExecution(
          "openMarketDataCron",
          "success",
          "Tarea de open market realizada exitosamente"
        );
      }
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
// Cron que actualiza la base de datos de Close Market Symbols y envía mensaje Telegram
const closeHour = "30 16 * * 1-5";
const closeMarketCron = cron.schedule(
  closeHour,
  async () => {
    try {
      const closeMarketTask = await checkTaskSuccess("closeMarketDataCron");
      if (closeMarketTask.success) {
        logger.info(
          "Tarea de actualización de Close Market ya se encuentra ejecutada"
        );
        return;
      } else {
        const date = moment().format("DD/MM/YYYY");
        const marketOpen = await didMarketOpenToday();
        if (marketOpen) {
          const delayTime = 1000;
          let array1 = [];
          let array2 = [];

          while (true) {
            try {
              const results = await fetchStockPricesTwelveData();
              if (results.status === 200 && results.data.code !== 429) {
                logger.info(`Data fetched successfully from TwelveData`);
                array2 = Object.values(results.data);
                break; // Salir del bucle si la petición fue exitosa
              } else if (results.data.code === 429) {
                logger.info(`Rate limit reached, delaying for 1 minute`);
                await delay(60000); // Esperar 1 minuto antes de volver a intentar
              } else {
                logger.error(
                  `Unexpected response from TwelveData: ${results.data}`
                );
                break; // Salir del bucle si hay otro tipo de error
              }
            } catch (err) {
              logger.error(`Error fetching data from TwelveData: ${err}`);
              break; // Salir del bucle si ocurre un error no relacionado con el rate limit
            }
          }

          try {
            const results = await fetchStockPricesRealTimeData();
            if (results.data && results.data.status === "OK") {
              array1 = results.data.data;
              logger.info(`Data fetched successfully from RealTimeData`);
            } else {
              array1 = [];
              logger.error(
                `Unexpected response from RealTimeData: ${results.data}`
              );
            }
          } catch (err) {
            logger.error(`Error fetching data from RealTimeData: ${err}`);
          }

          try {
            logger.info(`Merging arrays`);
            const mergedArray = mergeArrays(array2, array1);
            logger.info(`Merged array: ${JSON.stringify(mergedArray)}`);

            logger.info(`Formatting market data`);
            const formattedMarketData = formatMarketData(
              mergedArray,
              closeSymbols,
              "close"
            );
            logger.info(`Formatted market data: ${formattedMarketData}`);

            logger.info(`Sending market report to chat and topic`);
            await sendMessageToChatAndTopic(
              process.env.CHAT_ID,
              process.env.TOPIC_INFORMES,
              `*Informe de cierre de mercado ${date}*\n\n${formattedMarketData}`
            );
            logger.info(`Market report sent successfully.`);

            logger.info(`Saving market data`);
            await saveMarketData({ data: mergedArray, time: "close" });
            logger.info("Datos de cierre de mercado guardados correctamente.");
            await logTaskExecution(
              "closeMarketDataCron",
              "success",
              "Tarea de close market realizada exitosamente"
            );
          } catch (err) {
            logger.error(`Error: ${err}`);
          }
        } else {
          logger.info("El mercado no opera el día de la fecha.");
          await logTaskExecution(
            "closeMarketDataCron",
            "success",
            "Tarea de close market realizada exitosamente"
          );
        }
      }
    } catch (err) {
      logger.error(`Error en la tarea de cierre del mercado: ${err.message}`);
      throw new Error(err);
    }
  },
  {
    timezone: "America/New_York",
  }
);
const losersHour = "35 16 * * 1-5";
const losersCron = cron.schedule(
  losersHour,
  async () => {
    try {
      const losersMarketTask = await checkTaskSuccess("losersMarketDataCron");
      if (losersMarketTask.success) {
        logger.info(
          "Tarea de actualización de Losers Market ya se encuentra ejecutada"
        );
        return;
      } else {
        const marketOpen = await didMarketOpenToday();
        if (marketOpen) {
          const topLosers = await fecthGainersOrLosers("ta_toplosers");
          if (topLosers && topLosers.data) {
            const { headers, rows } = topLosers.data;
            const result = transformData(headers, rows);
            const saveData = await saveGainersOrLosersData("losers", result);
            if (saveData && saveData.data) {
              const formattedText = formatGainersLosersData(saveData.data, 5);
              if (formattedText) {
                const date = moment().format("DD/MM/YYYY");
                await sendMessageToChatAndTopic(
                  process.env.CHAT_ID,
                  process.env.TOPIC_INFORMES,
                  `*Informe de perdedores de la fecha ${date}*\n\n${formattedText}`
                );
                logger.info(`Market Losers report sent successfully.`);
                await logTaskExecution(
                  "losersMarketDataCron",
                  "success",
                  "Tarea de losers market realizada exitosamente"
                );
              }
            } else {
              logger.error(`Error guardando registro de Losers`);
            }
          }
        } else {
          logger.info(
            "No hay update de top losers. El mercado no opera el día de la fecha."
          );
          await logTaskExecution(
            "losersMarketDataCron",
            "success",
            "Tarea de losers market realizada exitosamente"
          );
        }
      }
    } catch (err) {
      logger.error(`Error en la tarea de perdedores del día: ${err.message}`);
      throw new Error(err);
    }
  },
  {
    timezone: "America/New_York",
  }
);
const gainersHour = "37 16 * * 1-5";
const gainersCron = cron.schedule(
  gainersHour,
  async () => {
    try {
      const gainersMarketTask = await checkTaskSuccess("gainersMarketDataCron");
      if (gainersMarketTask.success) {
        logger.info(
          "Tarea de actualización de Gainers Market ya se encuentra ejecutada"
        );
        return;
      }
      const marketOpen = await didMarketOpenToday();
      if (marketOpen) {
        const topGainers = await fecthGainersOrLosers();
        if (topGainers && topGainers.data) {
          const { headers, rows } = topGainers.data;
          const result = transformData(headers, rows);
          const saveData = await saveGainersOrLosersData("gainers", result);
          if (saveData && saveData.data && saveData.data.length > 0) {
            const formattedText = formatGainersLosersData(saveData.data, 5);
            if (formattedText) {
              const date = moment().format("DD/MM/YYYY");
              await sendMessageToChatAndTopic(
                process.env.CHAT_ID,
                process.env.TOPIC_INFORMES,
                `*Informe de ganadores de la fecha ${date}*\n\n${formattedText}`
              );
              await logTaskExecution(
                "gainersMarketDataCron",
                "success",
                "Tarea de gainers market realizada exitosamente"
              );
              logger.info(`Market Gainers report sent successfully.`);
            }
          } else {
            logger.error(`Error guardando registro de Gainers`);
          }
        }
      } else {
        logger.info(
          "No hay update de top gainers. El mercado no opera el día de la fecha."
        );
        await logTaskExecution(
          "gainersMarketDataCron",
          "success",
          "Tarea de gainers market realizada exitosamente"
        );
      }
    } catch (err) {
      logger.error(`Error en la tarea de ganadores del día: ${err.message}`);
      throw new Error(err);
    }
  },
  {
    timezone: "America/New_York",
  }
);

const scrapingHour = "42 14 * * 1-5";
const recordPhones = cron.schedule(
  scrapingHour,
  async () => {
    try {
      const scrapingTask = await checkTaskSuccess("scrapingDataCron");
      if (scrapingTask.success) {
        logger.info(
          "Tarea de actualización de scraping site ya se encuentra ejecutada"
        );
        return;
      }

      logger.info("Tarea de actualización de usuarios ejecutada");
      await loginAndScrape("4");
      await loginAndScrape("3");
      await loginAndScrape("2");
      await logTaskExecution(
        "scrapingDataCron",
        "success",
        "Tarea de scraping realizada exitosamente"
      );
    } catch (err) {
      logger.error(`Error en la tarea de scraping: ${err}`);
      throw new Error(err);
    }
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
  calendarDataCron,
  losersCron,
  gainersCron,
  recordPhones,
  earningsNotificationCron,
  economicCalendarNotificationCron,
};
