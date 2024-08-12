const mongoose = require('mongoose');

const phoneSchema = new mongoose.Schema({
  phoneNumbers: {
    type: [String], // Array de números de teléfono
    required: true
  },
  totalCount: {
    type: Number, // Total de números de teléfono
    required: true
  },
  createdAt: {
    type: Date, // Fecha de creación del documento
    default: Date.now
  }
});

const Phone = mongoose.model('Phone', phoneSchema);

module.exports = Phone;