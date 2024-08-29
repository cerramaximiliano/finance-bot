const express = require('express');
const { usersGetLastDate } = require('../handlers/usersHandlers');
const router = express.Router();



// Define las rutas y asigna los controladores correspondientes
router.get('/data', usersGetLastDate);

module.exports = router;