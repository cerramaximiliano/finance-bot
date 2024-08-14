const moment = require('moment');
const TaskLog = require('../models/taskLog');

async function checkTaskSuccess(taskName) {
  try {
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();

    const taskLog = await TaskLog.findOne({
      taskName,
      status: 'success',
      executedAt: { $gte: todayStart, $lte: todayEnd },
    }).sort({ executedAt: -1 });

    if (taskLog) {
      return {
        success: true,
        message: `La tarea "${taskName}" se ejecutó exitosamente el ${taskLog.executedAt}.`,
      };
    } else {
      return {
        success: false,
        message: `No se encontró una ejecución exitosa para la tarea "${taskName}" en el día de hoy.`,
      };
    }
  } catch (err) {
    throw new Error(`Error al verificar la tarea: ${err.message}`);
  }
}

async function logTaskExecution(taskName, status, message = '') {
    try {
      const logEntry = new TaskLog({
        taskName,
        status,
        message,
      });
      await logEntry.save();
    } catch (err) {
      console.error(`Error logging task execution: ${err.message}`);
    }
  }

module.exports = {
  checkTaskSuccess,
  logTaskExecution
};
