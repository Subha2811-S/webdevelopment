const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  cover: { type: String, default: 'default' },
  background: { type: String, default: '#ffffff' },
  font: { type: String, default: 'default' },
  color: { type: String, default: '#667eea' },
}, { timestamps: true });

module.exports = mongoose.model('Journal', journalSchema);
