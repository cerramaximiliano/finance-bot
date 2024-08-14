const mongoose = require('mongoose');

const taskLogSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true,
  },
  message: {
    type: String,
  },
  executedAt: {
    type: Date,
    default: Date.now,
  },
});

const TaskLog = mongoose.model('TaskLog', taskLogSchema);

module.exports = TaskLog;
