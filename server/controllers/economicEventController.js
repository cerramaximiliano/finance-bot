const EconomicEvent = require("../models/economicData");
const { getToday, getTomorrow } = require("../utils/dates");
const {logger} = require("../utils/logger");

const saveOrUpdateEconomicEvents = async (events) => {
  const operations = events.map((event) => ({
    updateOne: {
      filter: { id: event.id },
      update: { $set: event },
      upsert: true,
    },
  }));

  try {
    const result = await EconomicEvent.bulkWrite(operations);
    return result;
  } catch (error) {
    logger.error("Error al guardar o actualizar eventos económicos:", error);
    throw new Error(error);
  }
};

const findEconomicEventsByDateRange = async (
  startDate = getToday(),
  endDate = getTomorrow()
) => {
  if (!startDate || !endDate) {
    return "Faltan parámetros startDate o endDate";
  }

  try {
    const events = await EconomicEvent.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    return events;
  } catch (err) {
    logger.error(
      "Error al buscar eventos económicos por rango de fechas:",
      error
    );
    throw err;
  }
};

module.exports = {
  saveOrUpdateEconomicEvents,
  findEconomicEventsByDateRange,
};
