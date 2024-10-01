const {
  fetchEconomicCalendar,
  fetchStockPricesRealTimeData,
  fetchDayWath,
  marketOpen,
  fecthGainersOrLosers,
} = require("../controllers/controllersAPIs");
const { getTomorrow, getToday } = require("../utils/dates");
const { transformData } = require("../utils/formatData");
const {logger} = require("../utils/logger");


const calendarHandler = async (req, res) => {
  const {
    indicatorFilter = "",
    minImportance = "1",
    from = getTomorrow(),
    to = getToday(),
  } = req.query;

  // Configurar indicatorFilter como un array
  const indicatorFilterArray = indicatorFilter
    ? indicatorFilter.split(",")
    : [];
  console.log(from, to, indicatorFilterArray, minImportance);
  try {
    let result = await fetchEconomicCalendar(
      indicatorFilter,
      minImportance,
      from,
      to
    );
    res.json(result);
  } catch (err) {
    throw new Error(err);
  }
};

const stockRealTimeHandler = async (req, res) => {
  try {
    let result = await fetchStockPricesRealTimeData();
    res.json(result.data);
  } catch (err) {
    throw new Error(err);
  }
};

const dayWatchHandler = async (req, res) => {
  try {
    let result = await fetchDayWath();
    res.json(result.data);
  } catch (err) {
    throw new Error(err);
  }
};

const marketOpenHandler = async (req, res) => {
  try {
    let result = await marketOpen();
    console.log(result);
    res.json(result.data);
  } catch (err) {
    throw new Error(err);
  }
};

const gainersLosersHandler = async (req, res) => {
  let { filter } = req.query;
  try {
    let result = await fecthGainersOrLosers(filter);

    if (result && result.data) {
      let transformedData = transformData(
        result.data.headers,
        result.data.rows
      );
      res.json(transformedData);
    } else {
      res.json({ ok: false, data: [] });
    }
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = {
  calendarHandler,
  stockRealTimeHandler,
  dayWatchHandler,
  marketOpenHandler,
  gainersLosersHandler,
};
