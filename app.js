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

bot.on("polling_error", console.log);
mongoose
  .connect(URL_DB)
  .then(() => logger.info("Conectado a MongoDB"))
  .catch((err) => logger.error("Error al conectar a MongoDB", err));

require("./server/tasks/cronJobs");
const logger = require("./server/utils/logger");
const { checkTaskSuccess } = require("./server/controllers/tasksControllers");
logger.info(`Running on ${process.env.NODE_ENV} enviroment`);
app.listen(PORT, () => {
  logger.info(`Servidor ejecutándose en el puerto ${PORT}`);
});

checkTaskSuccess()
