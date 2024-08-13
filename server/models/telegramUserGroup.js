const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    username: String,
    first_name: String,
    last_name: String,
    phoneNumber: String,
    date_added: { type: Date, default: Date.now }
});

const TelegramUser = mongoose.model('User', userSchema);

module.exports = TelegramUser;
