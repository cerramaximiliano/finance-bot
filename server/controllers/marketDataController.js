const {logger} = require("../utils/logger");
const MarketData = require("../models/marketData");
const MarketOpen = require("../models/maketStatus");
const moment = require("moment");

const saveMarketData = async ({ data, time }) => {
  try {
    const marketDataDocument = new MarketData({
      date: new Date(),
      time: time,
      symbols: data.map((item) => ({
        symbol: item.symbol,
        underlyingSymbol: item.underlyingSymbol,
        currency: item.currency,
        description: item.description,
        previousClose: item.previousClose,
        regularMarketPrice: item.regularMarketPrice,
        regularMarketPreviousClose: item.regularMarketPreviousClose,
        open: item.open,
        close: item.close,
        bid: item.bid,
        ask: item.ask,
        currentPrice: item.currentPrice,
      })),
    });

    await marketDataDocument.save();
    logger.info("Market data saved successfully.");
  } catch (error) {
    logger.error(`Error saving market data: ${error.message}`);
    throw error;
  }
};

const getLastMarketData = async (time) => {
  try {
    return await MarketData.findOne({ time }).sort({ date: -1 }).exec();
  } catch (error) {
    logger.error(`Error fetching last market data: ${error.message}`);
    throw error;
  }
};

const saveMarketOpen = async (data) => {
  const marketOpenEntry = new MarketOpen({
    marketOpen: data.attributes.marketOpen,
    nextMarketOpen: data.attributes.nextMarketOpen,
    nextMarketClose: data.attributes.nextMarketClose,
  });
  try {
    logger.info("Registro de apertura de mercado guardado correctamente");
    return await marketOpenEntry.save();
  } catch (err) {
    logger.error("Error al guardar el registro de apertura de mercado:", err);
    throw err;
  }
};

const didMarketOpenToday = async () => {
  const startOfToday = moment().startOf("day").toDate();
  const endOfToday = moment().endOf("day").toDate();
  try {
    const record = await MarketOpen.findOne({
      date: {
        $gte: startOfToday,
        $lt: endOfToday,
      },
    });
    const startOfDayUnix = moment().startOf('day').unix();
    console.log(startOfDayUnix); // Imprime el inicio del día en formato Unix
    const endOfDayUnix = moment().endOf('day').unix();
    console.log(endOfDayUnix); // Imprime el fin del día en formato Unix
    console.log(startOfToday, endOfToday)
    if (record && startOfDayUnix < record.nextMarketOpen && endOfDayUnix > record.nextMarketClose) {
      return true;
    } else {
      console.log("No se encontró un registro para el día de hoy");
      return false;
    }
  } catch (err) {
    console.error("Error al consultar si el mercado abrió hoy:", err);
    return false;
  }
};

module.exports = {
  saveMarketData,
  getLastMarketData,
  saveMarketOpen,
  didMarketOpenToday,
};
