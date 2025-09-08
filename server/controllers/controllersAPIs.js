const axios = require("axios");
const fs = require("fs");
const path = require("path");
const {
  getToday,
  getTomorrow,
  getUnixStartOfDay,
  getUnixEndOfDay,
  readableDate,
  getClosestDate,
} = require("../utils/dates");
const {
  rapidApiKey,
  rapidApiKeyIubilare,
  rapidApiTradingViewHost,
  rapidApiSeekingAlphaHost,
  rapidApiYahooFinance,
  rapidApiFinvizHost,
} = require("../config/configAPIs");
const {logger} = require("../utils/logger");
const { rotateApiKey, updateApiUsageCount } = require("../config/rotateAPI");
const { transformData } = require("../utils/formatData");

// Tradign View
const fetchEconomicCalendar = async (
  indicatorFilter = [],
  minImportance = "1",
  from = getToday(),
  to = getTomorrow()
) => {
  logger.info("economic calendar controller");
  const options = {
    method: "GET",
    url: "https://trading-view.p.rapidapi.com/calendars/get-economic-calendar",
    params: {
      from: from,
      to: to,
      countries: "US",
      lang: "en",
      minImportance: minImportance,
    },
    headers: {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": rapidApiTradingViewHost,
    },
  };
  try {
    const response = await axios.request(options);
    const { result } = response.data;

    if (result) {
      const uniqueIndicators = [
        ...new Set(result.map((item) => item.indicator)),
      ];
      let filterData = result;
      if (indicatorFilter.length > 0) {
        filterData = result.filter((item) =>
          indicatorFilter.includes(item.indicator)
        );
      }
      return {
        status: 200,
        data: filterData,
        uniqueIndicators: uniqueIndicators,
      };
    }
    return { status: 204, data: [] };
  } catch (error) {
    throw new Error(`Error fetching economic calendar data: ${error.message}`);
  }
};

const fetchEarningCalendar = async (
  from = getUnixStartOfDay(),
  to = getUnixEndOfDay()
) => {
  const options = {
    method: "GET",
    url: "https://trading-view.p.rapidapi.com/calendars/get-earning-calendar",
    params: {
      from: from,
      to: to,
      screenerName: "america",
      lang: "en",
    },
    headers: {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": rapidApiTradingViewHost,
    },
  };

  try {
    const { data } = await axios.request(options);

    if (data.data) {
      return data.data;
    } else {
      return [];
    }
  } catch (error) {
    console.log(error)
    throw new Error(`Error fetching earning calendar data: ${error.message}`);
  }
};

// Finviz
const fetchMarketCapStocks = async (marketCap = "cap_mega") => {
  const apiKey = rotateApiKey("API3", 100);
  const options = {
    method: "GET",
    url: "https://finviz-screener.p.rapidapi.com/table",
    params: {
      order: "ticker",
      desc: "false",
      filters: marketCap,
    },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": rapidApiFinvizHost,
    },
  };
  try {
    const response = await axios.request(options);
    const { data } = response;
    const usageAPI =
      response.headers["x-ratelimit-requests-limit"] -
      response.headers["x-ratelimit-requests-remaining"];
    if (typeof usageAPI === "number") {
      updateApiUsageCount("API3_USAGE_COUNT", usageAPI);
    }

    const transformedData = transformData(data);

    return transformedData;
  } catch (error) {
    throw new Error(`Error fetching marketcap data: ${error.message}`);
  }
};

const fecthGainersOrLosers = async (
  gainersOrLosers = "ta_topgainers",
  order = "change"
) => {
  const apiKey = rotateApiKey("API3", 100);
  const options = {
    method: "GET",
    url: "https://finviz-screener.p.rapidapi.com/table",
    params: {
      order: order,
      desc: "true",
      signal: gainersOrLosers,
      filters: "geo_usa",
    },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": rapidApiFinvizHost,
    },
  };

  try {
    const response = await axios.request(options);
    const usageAPI =
      response.headers["x-ratelimit-requests-limit"] -
      response.headers["x-ratelimit-requests-remaining"];
    if (typeof usageAPI === "number") {
      updateApiUsageCount("API3_USAGE_COUNT", usageAPI);
    }
    return response;
  } catch (err) {
    console.log(err);
    logger.error(`Error fetching top gainers or losers data: ${err.message}`);
    throw new Error(
      `Error fetching top gainers or losers data: ${err.message}`
    );
  } 
};

// Seeking Alpha
const fetchMarketCap = async (marketCap = 100000000000) => {
  const apiKey = rotateApiKey("API2", 500);
  const options = {
    method: "POST",
    url: "https://seeking-alpha.p.rapidapi.com/screeners/get-results",
    params: {
      page: "1",
      per_page: "100",
      sort: "-marketcap_display",
      type: "stock",
    },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "seeking-alpha.p.rapidapi.com",
      "Content-Type": "application/json",
    },
    data: {
      marketcap_display: { gte: marketCap },
      country_id: { in: [213] },
    },
  };
  try {
    const response = await axios.request(options);
    const usageAPI =
      response.headers["x-ratelimit-requests-limit"] -
      response.headers["x-ratelimit-requests-remaining"];
    if (typeof usageAPI === "number") {
      updateApiUsageCount("API2_USAGE_COUNT", usageAPI);
    }
    const data = response.data;
    const getNames = (data) => {
      return data.data.map((item) => item.attributes.name);
    };
    const names = getNames(data);
    return names;
  } catch (error) {
    throw new Error(`Error fetching marketcap data: ${error.message}`);
  }
};

const fetchDayWath = async () => {
  const apiKey = rotateApiKey("API2", 500);
  const options = {
    method: "GET",
    url: "https://seeking-alpha.p.rapidapi.com/market/get-day-watch",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": rapidApiSeekingAlphaHost,
    },
  };
  try {
    const response = await axios.request(options);
    const usageAPI =
      response.headers["x-ratelimit-requests-limit"] -
      response.headers["x-ratelimit-requests-remaining"];
    if (typeof usageAPI === "number") {
      updateApiUsageCount("API2_USAGE_COUNT", usageAPI);
    }
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching day watch data: ${error.message}`);
  }
};

const marketOpen = async () => {
  const apiKey = rotateApiKey("API2", 500);
  const options = {
    method: "GET",
    url: "https://seeking-alpha.p.rapidapi.com/market/get-market-open",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": rapidApiSeekingAlphaHost,
    },
  };
  try {
    const response = await axios.request(options);
    const usageAPI =
      response.headers["x-ratelimit-requests-limit"] -
      response.headers["x-ratelimit-requests-remaining"];
    if (typeof usageAPI === "number") {
      updateApiUsageCount("API2_USAGE_COUNT", usageAPI);
    }
    return response.data;
  } catch (error) {
    throw new Error(`Error fetching market open data: ${error.message}`);
  }
};

const fetchStockSeekingAlpha = async (symbols) => {
  const apiKey = rotateApiKey("API2", 500);
  const options = {
    method: "GET",
    url: "https://seeking-alpha.p.rapidapi.com/market/get-realtime-quotes",
    params: { sa_ids: symbols },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "seeking-alpha.p.rapidapi.com",
    },
  };
  try {
    const response = await axios.request(options);
    const usageAPI =
      response.headers["x-ratelimit-requests-limit"] -
      response.headers["x-ratelimit-requests-remaining"];
    if (typeof usageAPI === "number") {
      updateApiUsageCount("API2_USAGE_COUNT", usageAPI);
    }
    return response.data;
  } catch (err) {
    throw new Error(err);
  }
};

/* Yahoo Finance */
const fetchStockPrice = async (symbol) => {
  // Usar RAPID_API_KEY_IUBILARE para esta API específica
  const apiKey = rapidApiKeyIubilare || rapidApiKey; // Fallback a rapidApiKey si no existe
  const apiKeyName = rapidApiKeyIubilare ? 'RAPID_API_KEY_IUBILARE' : 'RAPID_API_KEY';
  
  const options = {
    method: "POST",
    url: "https://yahoo-finance160.p.rapidapi.com/info",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": rapidApiYahooFinance,
      "Content-Type": "application/json",
    },
    data: { stock: symbol },
  };
  
  try {
    const response = await axios.request(options);
    const status = response.status === 200 ? 'SUCCESS' : `STATUS:${response.status}`;
    logger.info(`[${symbol}] API:${apiKeyName} - ${status}`);
    return response;
  } catch (error) {
    const errorStatus = error.response?.status || 'NETWORK_ERROR';
    logger.error(`[${symbol}] API:${apiKeyName} - FAILED:${errorStatus}`);
    throw error;
  }
};

/* Twelve Data */
const fetchStockPricesTwelveData = async (symbols) => {
  // Usar rotación de API keys para TwelveData (límite muy bajo: 100/mes)
  // Primero intentar con rotación, si no hay keys configuradas usar IUBILARE o principal
  let apiKey;
  try {
    apiKey = rotateApiKey("TWELVE", 8); // Rotar cada 8 usos (100/mes ÷ 30 días ÷ 4 llamadas diarias aprox)
    logger.info(`TwelveData using rotated key`);
  } catch (err) {
    // Si no hay keys para rotar, usar IUBILARE o la principal
    apiKey = rapidApiKeyIubilare || rapidApiKey;
    logger.info(`TwelveData using fallback key: ${apiKey === rapidApiKeyIubilare ? 'IUBILARE' : 'DEFAULT'}`);
  }
  
  const options = {
    method: "GET",
    url: "https://twelve-data1.p.rapidapi.com/quote",
    params: {
      symbol: "SPX,IXIC,DJI,RUT,TNX,DXY",
      outputsize: "30",
      format: "json",
      interval: "1day",
    },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "twelve-data1.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    
    // Actualizar contador de uso si hay headers de rate limit
    const remaining = response.headers['x-ratelimit-requests-remaining'];
    const limit = response.headers['x-ratelimit-requests-limit'];
    if (remaining && limit) {
      const used = limit - remaining;
      updateApiUsageCount("TWELVE_USAGE_COUNT", used);
    }
    
    logger.info(`TwelveData API Response:`);
    logger.info(`- Status: ${response.status}`);
    logger.info(`- Rate Limit: ${remaining || 'N/A'}/${limit || 'N/A'} remaining`);
    logger.info(`- Headers: ${JSON.stringify(response.headers['x-ratelimit-requests-remaining'] || 'N/A')} requests remaining`);
    
    // Log estructura de la respuesta
    if (response.data) {
      const dataKeys = Object.keys(response.data);
      logger.info(`- Response contains ${dataKeys.length} keys: ${dataKeys.join(', ')}`);
      
      // Si hay error en la respuesta
      if (response.data.code || response.data.status === 'error') {
        logger.error(`- TwelveData API Error: Code ${response.data.code}, Message: ${response.data.message}`);
      } else {
        // Verificar cada símbolo
        let validSymbols = 0;
        dataKeys.forEach(key => {
          const item = response.data[key];
          if (typeof item === 'object') {
            if (item.status === 'error') {
              logger.warn(`- [${key}]: ERROR - ${item.message || 'Symbol not available'}`);
            } else if (item.symbol) {
              validSymbols++;
              const closePrice = item.close || item.previous_close || 'N/A';
              logger.info(`- [${key}]: symbol=${item.symbol}, close=${closePrice}, open=${item.open || 'N/A'}`);
            }
          }
        });
        logger.info(`- Valid symbols: ${validSymbols}/${dataKeys.length}`);
      }
    }
    
    return response;
  } catch (err) {
    logger.error(`TwelveData API Error: ${err.message}`);
    if (err.response) {
      logger.error(`- Response Status: ${err.response.status}`);
      logger.error(`- Response Data: ${JSON.stringify(err.response.data).substring(0, 200)}`);
    }
    throw err;
  }
};

/* Real-Time Finance Data - Single Symbol */
const fetchSingleStockRealTime = async (symbol) => {
  // RealTimeData tiene límite de 100/mes, rotar cada 3 usos para distribuir en el mes
  const apiKey = rotateApiKey("API1", 3); // 100 consultas/mes ÷ 30 días ≈ 3 por día
  const options = {
    method: "GET",
    url: "https://real-time-finance-data.p.rapidapi.com/stock-quote-source-2",
    params: {
      symbol: symbol
    },
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "real-time-finance-data.p.rapidapi.com",
    },
  };
  
  try {
    const response = await axios.request(options);
    const usageAPI =
      response.headers["x-ratelimit-requests-limit"] -
      response.headers["x-ratelimit-requests-remaining"];
    if (typeof usageAPI === "number") {
      updateApiUsageCount("API1_USAGE_COUNT", usageAPI);
    }
    
    logger.info(`[${symbol}] RealTimeData: Status ${response.status}, Remaining: ${response.headers["x-ratelimit-requests-remaining"]}`);
    
    if (response.data && response.data.status === "OK" && response.data.data) {
      return response.data.data; // Retornar solo los datos del símbolo
    }
    return null;
  } catch (err) {
    logger.error(`[${symbol}] RealTimeData Error: ${err.message}`);
    return null;
  }
};

/* Real-Time Finance Data - Multiple Symbols */
const fetchStockPricesRealTimeData = async (symbols) => {
  const symbolList = [
    "^GDAXI", "000001.SS", "^N225", "^BVSP", "^MERV", 
    "ZS=F", "GC=F", "SI=F", "CL=F", "BTC-USD", "ETH-USD"
  ];
  
  logger.info(`RealTimeData: Fetching ${symbolList.length} symbols individually`);
  
  const results = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  // Hacer peticiones individuales con delay para no exceder límites
  for (const symbol of symbolList) {
    const data = await fetchSingleStockRealTime(symbol);
    if (data) {
      results.push(data);
      logger.info(`- [${symbol}]: OK - price=${data.price}, open=${data.regularMarketOpen}`);
    } else {
      logger.warn(`- [${symbol}]: FAILED`);
    }
    
    // Delay de 500ms entre peticiones para evitar rate limiting
    if (symbolList.indexOf(symbol) < symbolList.length - 1) {
      await delay(500);
    }
  }
  
  logger.info(`RealTimeData: Fetched ${results.length}/${symbolList.length} symbols successfully`);
  
  // Retornar en el mismo formato que antes esperaba el código
  return {
    status: 200,
    data: {
      status: "OK",
      data: results
    }
  };
};

module.exports = {
  fetchEconomicCalendar,
  fetchEarningCalendar,
  fetchDayWath,
  marketOpen,
  fetchStockPrice,
  fetchStockPricesTwelveData,
  fetchStockPricesRealTimeData,
  fetchStockSeekingAlpha,
  fetchMarketCapStocks,
  fetchMarketCap,
  fecthGainersOrLosers,
};
