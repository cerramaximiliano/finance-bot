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
  rapidApiTradingViewHost,
  rapidApiSeekingAlphaHost,
  rapidApiYahooFinance,
  rapidApiFinvizHost,
} = require("../config/configAPIs");
const logger = require("../utils/logger");
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
  const options = {
    method: "POST",
    url: "https://yahoo-finance160.p.rapidapi.com/info",
    headers: {
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": rapidApiYahooFinance,
      "Content-Type": "application/json",
    },
    data: { stock: symbol },
  };
  return axios.request(options);
};

/* Twelve Data */
const fetchStockPricesTwelveData = async (symbols) => {
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
      "x-rapidapi-key": rapidApiKey,
      "x-rapidapi-host": "twelve-data1.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    logger.info(`twelve data stock, indices, request fetch controller`);
    return response;
  } catch (err) {
    logger.error(err);
    throw err;
  }
};

/* Real-Time Finance Data */
const fetchStockPricesRealTimeData = async (symbols) => {
  const apiKey = rotateApiKey("API1");
  const options = {
    method: "GET",
    url: "https://real-time-finance-data.p.rapidapi.com/stock-quote-source-2",
    params: {
      symbol:
        "^GDAXI,000001.SS,^N225,^BVSP,^MERV,ZS=F,GC=F,SI=F,CL=F,BTC-USD,ETH-USD",
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

    logger.info(
      `real time finance data, futures, indices, request fetch controller`
    );
    return response;
  } catch (err) {
    logger.error(err);
    throw err;
  }
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
