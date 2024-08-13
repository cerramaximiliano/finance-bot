const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  }
});

const usersSiteDataSchema = new mongoose.Schema({
  users: {
    type: [userSchema], // Array de objetos con propiedades name y phone
    required: true
  },
  totalCount: {
    type: Number, // Total de usuarios
    required: true
  },
  trading: {
    type: Boolean,
    default: false
  },
  wealth: {
    type: Boolean,
    default: false
  },
  clubmember: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date, // Fecha de creación del documento
    default: Date.now
  }
});

const UsersSiteData = mongoose.model('UsersSiteData', usersSiteDataSchema);

module.exports = UsersSiteData;
