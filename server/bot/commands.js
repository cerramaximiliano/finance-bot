const TelegramBot = require("node-telegram-bot-api");
const { telegramToken } = require("../config/configAPIs");
const TelegramUser = require("../models/telegramUserGroup");

const bot = new TelegramBot(telegramToken, { polling: true });


module.exports = bot;
