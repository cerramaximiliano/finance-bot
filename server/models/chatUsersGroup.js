const mongoose = require('mongoose');

const usersGroupSchema = new mongoose.Schema({
    userId: { type: Number, unique: true },
    username: String,
    first_name: String,
    last_name: String,
    date_added: { type: Date, default: Date.now }
});

const ChatUserGroup = mongoose.model('User', usersGroupSchema);