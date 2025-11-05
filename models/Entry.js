const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  journalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Journal', required: true },
  title: { type: String, default: 'Untitled Entry' },
  content: { type: String, default: '' },
  isPasswordProtected: { type: Boolean, default: false },
  entryPassword: { type: String },
  emojis: [String],
  mood: { type: String, default: 'neutral' },
  images: [{ url: String, caption: String }],
  voiceNote: { url: String },
  videoNote: { url: String },
  lastSaved: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Entry', entrySchema);
