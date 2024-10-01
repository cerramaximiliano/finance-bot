const {logger} = require("./logger");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const fetchStockPriceWithRetry = async (fetchStockPrice, symbol, delayTime, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await delay(delayTime);
      const result = await fetchStockPrice(symbol);
      return result.data; // Si la llamada tiene éxito, retorna el resultado.
    } catch (err) {
      if (i < retries - 1) {
        logger.info(`Error al obtener el precio para ${symbol}, reintentando... (${i + 1}/${retries})`);
        await delay(1000); // Retraso entre reintentos
      } else {
        logger.error(`Error después de ${retries} intentos para ${symbol}:`, err.message);
        throw err; // Si se agotaron los reintentos, lanza el error.
      }
    }
  }
};

const fetchAllStockPrices = async (fetchStockPrice, symbols, delayTime, retries = 3) => {
  const results = [];
  for (let i = 0; i < symbols.length; i++) {
    try {
      const result = await fetchStockPriceWithRetry(fetchStockPrice, symbols[i].symbol, delayTime, retries);
      results.push(result);
    } catch (err) {
      logger.error(`Fallo al obtener el precio de ${symbols[i].symbol}, error capturado: ${err.message}`);
      // Si deseas continuar con las demás acciones aunque haya un fallo, omite el `throw`
      // Si quieres que se detenga el proceso completo en caso de error, puedes lanzar el error
    }
  }
  return results;
};

module.exports = { delay, fetchStockPriceWithRetry, fetchAllStockPrices };


//module.exports = { delay, fetchStockPriceWithDelay, fetchAllStockPrices };