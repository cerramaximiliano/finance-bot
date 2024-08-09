const moment = require("moment");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const {
  fetchEconomicCalendar,
  fetchEarningCalendar,
  fetchDayWath,
  fetchStockSeekingAlpha,
  fetchMarketCap,
} = require("../controllers/controllersAPIs");
const bot = require("./commands");
const {
  formatData,
  formatDataEarnings,
  formatMarketData,
  formatDayWatch,
  getIdsString,
} = require("../utils/formatData");
const {
  delay,
  fetchStockPriceWithDelay,
  fetchAllStockPrices,
} = require("../utils/delay");
const { getLastMarketData } = require("../controllers/marketDataController");
const {
  findStockDataByDateRange,
} = require("../controllers/earningsDataController");
const { getClosestDate, readableDate } = require("../utils/dates");
const {
  findEconomicEventsByDateRange,
} = require("../controllers/economicEventController");
const { configTopicName } = require("../config/configAPIs");

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
  { description: "Futuros Dólar Index", symbol: "DX=F" },
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

function sendMainMenu(chatId, messageId, topicId) {
  const options = {
    chat_id: chatId,
    message_id: messageId,
    text: "Menú Principal:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Informe Apertura", callback_data: "option1" }],
        [{ text: "Informe Cierre", callback_data: "option2" }],
        [{ text: "Earnings Calendar", callback_data: "option3" }],
        [{ text: "Economic Calendar", callback_data: "option4" }],
        [
          { text: "Top Gainers", callback_data: "option5" },
          { text: "Top Losers", callback_data: "option6" },
        ],
        [
          { text: "S&P 500 Gainers ", callback_data: "option7" },
          { text: "S&P 500 Losers", callback_data: "option8" },
        ],
      ],
    },
    message_thread_id: topicId,
  };

  bot.editMessageText(options.text, options).catch((error) => {
    logger.error(`Error al enviar menú principal: ${error.message}`);
  });
}

function sendSubMenu(chatId, messageId, menuTitle, options, topicId) {
  const keyboard = options.map((option) => [
    { text: option.text, callback_data: option.callback_data },
  ]);
  keyboard.push([{ text: "<< Volver Atrás", callback_data: "back" }]);

  const sendOptions = {
    chat_id: chatId,
    message_id: messageId,
    text: menuTitle,
    reply_markup: {
      inline_keyboard: keyboard,
    },
    message_thread_id: topicId,
    parse_mode: "Markdown",
  };

  bot.editMessageText(menuTitle, sendOptions).catch((error) => {
    logger.error(`Error al enviar submenú: ${error.message}`);
  });
}

async function sendTemporaryMessage(chatId, text, options, delay = 5000) {
  try {
    const message = await bot.sendMessage(chatId, text, options);
    setTimeout(() => {
      bot.deleteMessage(chatId, message.message_id).catch((error) => {
        logger.error(`Error al eliminar mensaje: ${error.message}`);
      });
    }, delay);
  } catch (error) {
    logger.error(`Error al enviar mensaje temporal: ${error.message}`);
  }
}

bot.onText(/\/informes/, (msg) => {
  const chatId = msg.chat.id;
  const topicId = msg.is_topic_message ? msg.message_thread_id : undefined;
  if (topicId) {
    const topicName = msg.reply_to_message.forum_topic_created.name;
    if (topicName === configTopicName) {
      bot
        .sendMessage(chatId, "Menú Principal:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Informe Apertura", callback_data: "option1" }],
              [{ text: "Informe Cierre", callback_data: "option2" }],
              [{ text: "Earnings Calendar", callback_data: "option3" }],
              [{ text: "Economic Calendar", callback_data: "option4" }],
              [
                { text: "Top Gainers", callback_data: "option5" },
                { text: "Top Losers", callback_data: "option6" },
              ],
              [
                { text: "S&P 500 Gainers ", callback_data: "option7" },
                { text: "S&P 500 Losers", callback_data: "option8" },
              ],
            ],
          },
          message_thread_id: topicId,
        })
        .catch((error) => {
          logger.error(
            `Error al enviar mensaje del menú principal: ${error.message}`
          );
        });
    }
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;
  const topicId = message.is_topic_message
    ? message.message_thread_id
    : undefined;

  if (topicId) {
    const topicName = message.reply_to_message.forum_topic_created.name;
    if (topicName !== configTopicName) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Este comando solo está disponible en el topic 'Menú test'.",
      });
      return;
    }
  } else {
    bot.answerCallbackQuery(callbackQuery.id, {
      text: "Este comando solo está disponible en el topic 'Menú test'.",
    });
    return;
  }

  try {
    switch (data) {
      case "option1":
        let textOpen;
        let date;
        const openMarketData = await getLastMarketData("open");
        if (
          openMarketData &&
          openMarketData.symbols &&
          openMarketData.symbols.length > 0
        ) {
          logger.info("bot request - open market data on database");
          textOpen = formatMarketData(
            openMarketData.symbols,
            openSymbols,
            "open"
          );
          date = moment(openMarketData.date).format("DD/MM/YYYY");
        } else {
          logger.info("bot request - open market data no available");
          textOpen = "No se han encontrado resultados.";
          date = moment().format("DD/MM/YYYY");
        }

        sendSubMenu(
          message.chat.id,
          message.message_id,
          `*Informe apertura de mercado ${date}*\n\n${textOpen}`,
          [],
          topicId
        );
        break;
      case "option2":
        let textClose;
        let dateClose;
        const closeMarketData = await getLastMarketData("close");
        if (
          closeMarketData &&
          closeMarketData.symbols &&
          closeMarketData.symbols.length > 0
        ) {
          logger.info("bot request - close market data on database");
          textClose = formatMarketData(
            closeMarketData.symbols,
            closeSymbols,
            "close"
          );
          dateClose = moment(closeMarketData.date).format("DD/MM/YYYY");
        } else {
          logger.info("bot request - close market data no available");
          textClose = "No se han encontrado resultados.";
          dateClose = moment().format("DD/MM/YYYY");
        }
        sendSubMenu(
          message.chat.id,
          message.message_id,
          `*Informe cierre de mercado ${dateClose}*\n\n${textClose}`,
          [],
          topicId
        );
        break;
      case "option3":
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
        } else {
          logger.info("bot request - earnings Calendar API");
          const earningsCalendar = await fetchEarningCalendar();
          text = earningsCalendar.map((element) => {
            const closestTimestamp = getClosestDate(element.d[2], element.d[4]);
            return {
              symbol: element.d[0],
              name: element.d[1],
              date: readableDate(closestTimestamp),
            };
          });
        }
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
        sendSubMenu(
          message.chat.id,
          message.message_id,
          earningsCalendarText,
          [],
          topicId
        );
        break;
      case "option4":
        logger.info("bot request - economic Calendar");
        let results = await findEconomicEventsByDateRange();
        let economicCalendarText = `*Economic Calendar ${moment().format(
          "DD/MM/YYYY"
        )}*\n\n`;
        if (results && results.length > 0) {
          logger.info("economic Calendar ddbb results");
          false;
        } else {
          const economicCalendar = await fetchEconomicCalendar(
            ["Interest Rate", "Inflation Rate"],
            1
          );
          if (
            economicCalendar &&
            economicCalendar.status === 200 &&
            economicCalendar.data.length > 0
          ) {
            logger.info("economic Calendar API results");
            results = economicCalendar.data;
          }
        }
        if (results.length > 0) {
          let formattedData = formatData(results);
          economicCalendarText = economicCalendarText + formattedData;
        } else {
          economicCalendarText =
            economicCalendarText + "No hay eventos para la fecha";
        }

        sendSubMenu(
          message.chat.id,
          message.message_id,
          economicCalendarText,
          [],
          topicId
        );
        break;
      case "option5":
        let textGainers = `*Ganadores del día ${moment().format(
          "DD/MM/YYYY"
        )}*\n\n`;
        let topGainers = await fetchDayWath();
        let attributesGainers = topGainers.data.attributes.top_gainers;
        if (attributesGainers && attributesGainers.length > 0) {
          textGainers += formatDayWatch(attributesGainers, 5);
        } else {
          textGainers += "No se encontraron resultados.";
        }
        sendSubMenu(
          message.chat.id,
          message.message_id,
          textGainers,
          [],
          topicId
        );
        break;
      case "option6":
        let textLosers = `*Perdedores del día ${moment().format(
          "DD/MM/YYYY"
        )}*\n\n`;
        let topLosers = await fetchDayWath();
        let attributesLosers = topLosers.data.attributes.top_losers;
        const idsString = getIdsString(attributesLosers);
        let percent_change = [];

        let stockLosers = await fetchStockSeekingAlpha(idsString);
        console.log(stockLosers.real_time_quotes);

        if (attributesLosers && attributesLosers.length > 0) {
          textLosers += formatDayWatch(attributesLosers, 5);
        } else {
          textLosers += "No se han encontrado resultados.";
        }

        sendSubMenu(
          message.chat.id,
          message.message_id,
          textLosers,
          [],
          topicId
        );
        break;
      case "option7":
        let textSP500Gainers = `*Ganadores del día ${moment().format(
          "DD/MM/YYYY"
        )}*\n\n`;
        let sp500Gainers = await fetchDayWath();
        let attributesSP500Gainers = sp500Gainers.data.attributes.sp500_gainers;
        if (attributesSP500Gainers && attributesSP500Gainers.length > 0) {
          textSP500Gainers += formatDayWatch(attributesSP500Gainers, 5);
        } else {
          textSP500Gainers += "No se han encontrado resultados.";
        }

        sendSubMenu(
          message.chat.id,
          message.message_id,
          textSP500Gainers,
          [],
          topicId
        );
        break;
      case "option8":
        let textSP500Losers = `*Perdedores del día ${moment().format(
          "DD/MM/YYYY"
        )}*\n\n`;
        let sp500Losers = await fetchDayWath();
        let attributesSP500Losers = sp500Losers.data.attributes.sp500_losers;
        if (attributesSP500Losers && attributesSP500Losers.length > 0) {
          textSP500Losers += formatDayWatch(attributesSP500Losers, 5);
        } else {
          textSP500Losers += "No se han encontrado resultados.";
        }
        sendSubMenu(
          message.chat.id,
          message.message_id,
          textSP500Losers,
          [],
          topicId
        );
        break;
      case "back":
        sendMainMenu(message.chat.id, message.message_id, topicId);
        break;
      default:
        await sendTemporaryMessage(
          message.chat.id,
          "Opción no reconocida. Vuelve a intentarlo más tarde.",
          {
            ...(topicId && { message_thread_id: topicId }),
          },
          5000
        );
    }
  } catch (err) {
    logger.error(err);
    await sendTemporaryMessage(
      message.chat.id,
      "Opción no reconocida. Vuelve a intentarlo más tarde.",
      {
        ...(topicId && { message_thread_id: topicId }),
      },
      5000
    );
  }
  bot.answerCallbackQuery(callbackQuery.id).catch((error) => {
    logger.error(`Error al finalizar el callback query: ${error.message}`);
  }); // Finaliza el callback query
});

module.exports = bot;
