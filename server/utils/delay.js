const {logger} = require("./logger");

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const fetchStockPriceWithRetry = async (fetchStockPrice, symbol, delayTime, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await delay(delayTime);
      const result = await fetchStockPrice(symbol);
      return result.data; // Si la llamada tiene éxito, retorna el resultado.
    } catch (err) {
      const errorCode = err.response?.status || 'UNKNOWN';
      if (i < retries - 1) {
        logger.warn(`[${symbol}] Retry ${i + 1}/${retries} - Error:${errorCode}`);
        await delay(1000); // Retraso entre reintentos
      } else {
        logger.error(`[${symbol}] Failed after ${retries} attempts - Final error:${errorCode}`);
        throw err; // Si se agotaron los reintentos, lanza el error.
      }
    }
  }
};

const fetchAllStockPrices = async (fetchStockPrice, symbols, delayTime, retries = 3) => {
  const results = [];
  const failedSymbols = [];
  
  for (let i = 0; i < symbols.length; i++) {
    try {
      const result = await fetchStockPriceWithRetry(fetchStockPrice, symbols[i].symbol, delayTime, retries);
      // Agregar el símbolo al resultado para poder identificarlo
      if (result) {
        result.symbol = symbols[i].symbol;
        result.description = symbols[i].description;
        results.push(result);
      }
    } catch (err) {
      const errorCode = err.response?.status || err.message || 'UNKNOWN';
      logger.error(`[${symbols[i].symbol}] Final failure - Error:${errorCode}`);
      failedSymbols.push(symbols[i].symbol);
      // Continuar con los demás símbolos aunque haya un fallo
    }
  }
  
  // Loguear resumen
  if (results.length > 0) {
    logger.info(`Summary: SUCCESS ${results.length}/${symbols.length} symbols fetched`);
  }
  if (failedSymbols.length > 0) {
    logger.warn(`Summary: FAILED ${failedSymbols.length} symbols: [${failedSymbols.join(', ')}]`);
  }
  
  return results;
};

module.exports = { delay, fetchStockPriceWithRetry, fetchAllStockPrices };


//module.exports = { delay, fetchStockPriceWithDelay, fetchAllStockPrices };