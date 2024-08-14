const mongoose = require('mongoose');
const UsersSiteData = require('../models/phoneData'); // Asegúrate de que la ruta al modelo sea correcta
const logger = require('../utils/logger');

async function saveDataBasePhones(data, memberType) {
  try {
    // Obtener la fecha de hoy en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Buscar un registro existente para la fecha de hoy
    let usersDocument = await UsersSiteData.findOne({
      createdAt: {
        $gte: new Date(`${today}T00:00:00Z`),
        $lt: new Date(`${today}T23:59:59Z`)
      }
    });

    if (usersDocument) {
      // Si el documento existe, actualizar el array de usuarios y el totalCount
      usersDocument.users.push(...data);
      usersDocument.totalCount += data.length;

      // Actualizar las propiedades booleanas según el memberType
      if (memberType === "2") {
        usersDocument.trading = true;
      }
      if (memberType === "3") {
        usersDocument.wealth = true;
      }
      if (memberType === "4") {
        usersDocument.clubmember = true;
      }
      await usersDocument.save();
      logger.info('Datos actualizados en el registro existente del día.');
    } else {
      // Si no existe un documento para hoy, crear uno nuevo con las propiedades booleanas establecidas
      const newDocument = {
        users: data,
        totalCount: data.length,
        trading: memberType === "2",
        wealth: memberType === "3",
        clubmember: memberType === "4",
      };
      usersDocument = new UsersSiteData(newDocument);
      await usersDocument.save();
      logger.info('Nuevo registro creado para el día actual.');
    }

  } catch (err) {
    logger.error(`Error al guardar en base de datos usuarios del sitio: ${err}`)
    throw new Error(`Error al guardar los datos en la base de datos: ${err.message}`);
  }
}

module.exports = {
  saveDataBasePhones,
};
