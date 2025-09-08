const express = require('express');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/apiRoutes');
const usersRoutes = require("./routes/usersRoutes");
const testRoutes = require('./routes/testRoutes');
const {logger} = require('./utils/logger');
const telegramErrorHandler = require('./middleware/errorHandler');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rutas
app.use('/api', apiRoutes);
app.use('/users', usersRoutes);
app.use('/test', testRoutes);
// Middleware para manejo de errores de Telegram
app.use(telegramErrorHandler);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: err.message });
});

module.exports = app;