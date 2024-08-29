const UsersSiteData = require("../models/phoneData");

exports.usersGetLastDate = async (req, res) => {

 try {
    const { date } = req.query;
    let query = {};
    if (date) {
        query = { createdAt: new Date(date) };
    }
    const record = await UsersSiteData.findOne(query).sort({ createdAt: -1 });
    if (!record) {
        return res.status(404).json({ message: 'No se encontró el registro.' });
    }
    res.status(200).json(record);
 } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos.', error: error.message });
}
};