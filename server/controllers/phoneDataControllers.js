const mongoose = require('mongoose');
const Phone = require('../models/phoneData'); // Asegúrate de que la ruta al modelo sea correcta

async function saveDataBasePhones(phones) {
  try {

    const phoneDocument = new Phone({
      phoneNumbers: phones,
      totalCount: phones.length,
    });

    await phoneDocument.save();

    console.log('Datos guardados en la base de datos:', phoneDocument);

  } catch (err) {
    throw new Error(err)
  }
}

module.exports = {
    saveDataBasePhones,
};
