const express = require('express');
const router = express.Router();
const moment = require("moment");
const { fetchAllStockPrices } = require("../utils/delay");
const { formatMarketData } = require("../utils/formatData");
const {
  fetchStockPrice,
  fetchStockPricesTwelveData,
  fetchStockPricesRealTimeData,
  marketOpen,
} = require("../controllers/controllersAPIs");
const { sendMessageToChatAndTopic } = require("../tasks/cronJobs");
const { logger } = require("../utils/logger");
const { isMarketOpenToday } = require("../utils/dates");
const { didMarketOpenToday } = require("../controllers/marketDataController");

// Símbolos para apertura
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

// Símbolos para cierre
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
  { description: "Merval", symbol: "^MERV" },
  { description: "US Dólar Index", symbol: "DXY" },
  { description: "Futuros Soja", symbol: "ZS=F" },
  { description: "Futuros Oro", symbol: "GC=F" },
  { description: "Futuros Plata", symbol: "SI=F" },
  { description: "Futuros Petróleo", symbol: "CL=F" },
  { description: "Bitcoin/USD", symbol: "BTC-USD" },
  { description: "Etherum/USD", symbol: "ETH-USD" },
];

// Helper para merge arrays
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
  
  // Asegurar que los parámetros son arrays
  const arr1 = Array.isArray(array1) ? array1 : [];
  const arr2 = Array.isArray(array2) ? array2 : [];
  
  // Procesar primer array
  arr1.forEach((item) => {
    if (item && item.symbol) {
      map.set(item.symbol, mapProperties(item));
    }
  });
  
  // Procesar segundo array
  arr2.forEach((item) => {
    if (item && item.symbol) {
      const mappedItem = mapProperties(item);
      if (map.has(item.symbol)) {
        map.set(item.symbol, { ...map.get(item.symbol), ...mappedItem });
      } else {
        map.set(item.symbol, mappedItem);
      }
    }
  });

  return Array.from(map.values());
}

// Test apertura de mercado
router.get('/test-open-market', async (req, res) => {
  try {
    logger.info("TEST: Iniciando test de apertura de mercado");
    const date = moment().format("DD/MM/YYYY");
    
    // Obtener datos de apertura
    const delayTime = 1000;
    const openMarketData = await fetchAllStockPrices(
      fetchStockPrice,
      openSymbols,
      delayTime,
      3
    );
    
    // Preparar mensaje
    let messageToSend = `*TEST - Informe apertura de mercado ${date}*\n\n`;
    
    if (openMarketData && openMarketData.length > 0) {
      const formattedMarketData = formatMarketData(
        openMarketData,
        openSymbols,
        "open"
      );
      
      if (formattedMarketData && formattedMarketData.trim() !== "") {
        messageToSend += formattedMarketData;
        
        // Log interno si no se obtuvieron todos los datos
        if (openMarketData.length < openSymbols.length) {
          const successRate = `${openMarketData.length}/${openSymbols.length}`;
          logger.info(`TEST: Datos parciales: ${successRate} símbolos obtenidos`);
        }
      }
    } else {
      // Si no hay datos, no enviar mensaje
      logger.error("TEST: No se obtuvieron datos de apertura de mercado");
      return res.json({
        success: false,
        message: "No se obtuvieron datos - mensaje no enviado",
        data: []
      });
    }
    
    // Enviar mensaje de prueba
    if (req.query.send === 'true') {
      await sendMessageToChatAndTopic(
        process.env.CHAT_ID,
        process.env.TOPIC_INFORMES,
        messageToSend
      );
      logger.info("TEST: Mensaje enviado a Telegram");
    }
    
    res.json({
      success: true,
      message: "Test de apertura completado",
      dataCount: openMarketData.length,
      totalSymbols: openSymbols.length,
      preview: messageToSend,
      sent: req.query.send === 'true'
    });
    
  } catch (error) {
    logger.error(`TEST: Error en test de apertura: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test cierre de mercado
router.get('/test-close-market', async (req, res) => {
  try {
    logger.info("TEST: Iniciando test de cierre de mercado");
    const date = moment().format("DD/MM/YYYY");
    
    let array1 = [];
    let array2 = [];
    
    // Obtener datos de TwelveData
    try {
      const results = await fetchStockPricesTwelveData();
      logger.info(`TEST: TwelveData response status: ${results.status}`);
      
      if (results.status === 200) {
        logger.info(`TEST: Data fetched successfully from TwelveData`);
        
        // Log para ver estructura exacta de la respuesta
        logger.info(`TEST: TwelveData response type: ${typeof results.data}`);
        logger.info(`TEST: TwelveData response keys: ${Object.keys(results.data || {}).join(', ')}`);
        
        // Si hay un código de error
        if (results.data && results.data.code) {
          logger.warn(`TEST: TwelveData returned code: ${results.data.code}, message: ${results.data.message || 'No message'}`);
        }
        
        // Verificar que results.data sea un objeto con los símbolos
        if (results.data && typeof results.data === 'object' && !results.data.code) {
          // Mostrar primer elemento para debugging
          const firstKey = Object.keys(results.data)[0];
          if (firstKey) {
            logger.info(`TEST: TwelveData sample - Key: ${firstKey}, Value type: ${typeof results.data[firstKey]}`);
            if (typeof results.data[firstKey] === 'object') {
              logger.info(`TEST: TwelveData sample data: ${JSON.stringify(results.data[firstKey]).substring(0, 200)}`);
            }
          }
          
          // Filtrar solo los valores que son objetos (los símbolos)
          const dataValues = Object.values(results.data).filter(item => 
            item && typeof item === 'object' && item.symbol
          );
          array2 = dataValues;
          logger.info(`TEST: TwelveData processed - ${array2.length} symbols found from ${Object.keys(results.data).length} keys`);
        }
      }
    } catch (err) {
      logger.error(`TEST: Error fetching data from TwelveData: ${err.message}`);
      array2 = [];
    }
    
    // Obtener datos de RealTimeData
    try {
      const results = await fetchStockPricesRealTimeData();
      logger.info(`TEST: RealTimeData response status: ${results.status}`);
      
      // Log para ver estructura exacta
      if (results.data) {
        logger.info(`TEST: RealTimeData response type: ${typeof results.data}`);
        logger.info(`TEST: RealTimeData has status: ${results.data.status}`);
        logger.info(`TEST: RealTimeData keys: ${Object.keys(results.data).join(', ')}`);
        
        // Si tiene data.data, verificar si es array
        if (results.data.data) {
          logger.info(`TEST: RealTimeData data.data is array: ${Array.isArray(results.data.data)}, type: ${typeof results.data.data}`);
          if (Array.isArray(results.data.data)) {
            logger.info(`TEST: RealTimeData data.data length: ${results.data.data.length}`);
            if (results.data.data.length > 0) {
              logger.info(`TEST: RealTimeData sample: ${JSON.stringify(results.data.data[0]).substring(0, 200)}`);
            }
          } else {
            logger.info(`TEST: RealTimeData data.data content: ${JSON.stringify(results.data.data).substring(0, 200)}`);
          }
        }
      }
      
      if (results.data && results.data.status === "OK" && results.data.data) {
        // RealTimeData puede devolver un objeto único o un array
        if (Array.isArray(results.data.data)) {
          array1 = results.data.data;
          logger.info(`TEST: Data fetched successfully from RealTimeData - ${array1.length} symbols (array)`);
        } else if (typeof results.data.data === 'object') {
          // Si es un objeto único, convertirlo a array
          array1 = [results.data.data];
          logger.info(`TEST: Data fetched successfully from RealTimeData - 1 symbol (single object)`);
        } else {
          array1 = [];
          logger.warn(`TEST: RealTimeData data.data has unexpected type: ${typeof results.data.data}`);
        }
      } else {
        array1 = [];
        logger.warn(`TEST: RealTimeData returned error status: ${results.data?.status || 'No status'}`);
      }
    } catch (err) {
      logger.error(`TEST: Error fetching data from RealTimeData: ${err.message}`);
      array1 = [];
    }
    
    // Verificar que ambos son arrays antes de merge
    if (!Array.isArray(array1)) array1 = [];
    if (!Array.isArray(array2)) array2 = [];
    
    logger.info(`TEST: Before merge - array1: ${array1.length} items, array2: ${array2.length} items`);
    
    // Merge arrays
    const mergedArray = mergeArrays(array2, array1);
    logger.info(`TEST: Merged array length: ${mergedArray.length}`);
    
    // Preparar mensaje
    let messageToSend = `*TEST - Informe de cierre de mercado ${date}*\n\n`;
    
    if (mergedArray && mergedArray.length > 0) {
      const formattedMarketData = formatMarketData(
        mergedArray,
        closeSymbols,
        "close"
      );
      
      if (formattedMarketData && formattedMarketData.trim() !== "") {
        messageToSend += formattedMarketData;
        
        // Log interno si no se obtuvieron todos los datos
        if (mergedArray.length < closeSymbols.length) {
          const successRate = `${mergedArray.length}/${closeSymbols.length}`;
          logger.info(`TEST: Datos parciales: ${successRate} símbolos obtenidos`);
        }
      }
    } else {
      // Si no hay datos, no enviar mensaje
      logger.error("TEST: No se obtuvieron datos de cierre de mercado");
      return res.json({
        success: false,
        message: "No se obtuvieron datos - mensaje no enviado",
        data: []
      });
    }
    
    // Enviar mensaje de prueba si se solicita
    if (req.query.send === 'true') {
      await sendMessageToChatAndTopic(
        process.env.CHAT_ID,
        process.env.TOPIC_INFORMES,
        messageToSend
      );
      logger.info("TEST: Mensaje enviado a Telegram");
    }
    
    res.json({
      success: true,
      message: "Test de cierre completado",
      dataCount: mergedArray.length,
      totalSymbols: closeSymbols.length,
      preview: messageToSend,
      sent: req.query.send === 'true'
    });
    
  } catch (error) {
    logger.error(`TEST: Error en test de cierre: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test con datos simulados
router.get('/test-market-message', async (req, res) => {
  try {
    const { type = 'open', symbols = 3 } = req.query;
    const date = moment().format("DD/MM/YYYY");
    
    // Datos simulados
    const mockData = [
      { symbol: "BTC-USD", currency: "USD", open: 45000, close: 45500, previousClose: 44000, currentPrice: 45500 },
      { symbol: "ETH-USD", currency: "USD", open: 3200, close: 3250, previousClose: 3150, currentPrice: 3250 },
      { symbol: "ES=F", currency: "USD", open: 4500, close: 4520, previousClose: 4480, currentPrice: 4520 },
      { symbol: "GC=F", currency: "USD", open: 1850, close: 1860, previousClose: 1840, currentPrice: 1860 },
      { symbol: "CL=F", currency: "USD", open: 75.50, close: 76.20, previousClose: 74.80, currentPrice: 76.20 },
    ].slice(0, parseInt(symbols));
    
    const symbolList = type === 'close' ? closeSymbols : openSymbols;
    
    let messageToSend = `*TEST SIMULADO - Informe ${type === 'close' ? 'de cierre' : 'apertura'} de mercado ${date}*\n\n`;
    
    if (mockData.length > 0) {
      const formattedMarketData = formatMarketData(
        mockData,
        symbolList,
        type
      );
      
      if (formattedMarketData && formattedMarketData.trim() !== "") {
        messageToSend += formattedMarketData;
      }
    }
    
    // Enviar mensaje si se solicita
    if (req.query.send === 'true') {
      await sendMessageToChatAndTopic(
        process.env.CHAT_ID,
        process.env.TOPIC_INFORMES,
        messageToSend
      );
    }
    
    res.json({
      success: true,
      message: "Test simulado completado",
      preview: messageToSend,
      mockDataCount: mockData.length,
      sent: req.query.send === 'true'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;