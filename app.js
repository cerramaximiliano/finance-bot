const dotenv = require("dotenv");
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });
const bot = require("./server/bot/commands");
const mongoose = require("mongoose");
const URL_DB = process.env.MONGO_URI;
const cron = require("node-cron");
const app = require("./server/server");
const PORT = process.env.PORT || 3002;
const {logger} = require("./server/utils/logger");

logger.info(`Running on ${process.env.NODE_ENV} enviroment`);

bot.on("polling_error", (err) => {
  logger.error(`Error Telegram Bot ${err}`)
});

// Conectar a MongoDB y luego iniciar los cron jobs
mongoose
  .connect(URL_DB)
  .then(() => {
    logger.info("Conectado a MongoDB");
    
    // Cargar cron jobs solo después de conectar a MongoDB
    require("./server/tasks/cronJobs");
    logger.info("Cron jobs iniciados");
    
    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("Error al conectar a MongoDB", err);
    process.exit(1); // Salir si no se puede conectar a la BD
  });
