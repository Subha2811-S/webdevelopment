const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is not set in .env file");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env file");
  process.exit(1);
}

const app = express();

// Models
const User = require("./models/User");
const Journal = require("./models/Journal");
const Entry = require("./models/Entry");

// Middleware
const { authenticate } = require("./middleware/auth");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend and uploads
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// File upload config
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("   Please check your MONGODB_URI in .env file");
  });

// ---------- AUTH ROUTES ----------
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return res.status(400).json({ error: "User already exists" });

  const user = new User({ username, email, password });
  await user.save();
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password)))
    return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user });
});

app.get("/api/auth/me", authenticate, (req, res) => res.json(req.user));

// ---------- JOURNAL ROUTES ----------
app.get("/api/journals", authenticate, async (req, res) => {
  const journals = await Journal.find({ userId: req.user._id });
  res.json(journals);
});

app.post("/api/journals", authenticate, async (req, res) => {
  const journal = new Journal({ userId: req.user._id, title: req.body.title || "New Journal" });
  await journal.save();
  res.json(journal);
});

app.put("/api/journals/:id", authenticate, async (req, res) => {
  const journal = await Journal.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  res.json(journal);
});

app.delete("/api/journals/:id", authenticate, async (req, res) => {
  await Entry.deleteMany({ journalId: req.params.id });
  await Journal.deleteOne({ _id: req.params.id });
  res.json({ message: "Deleted" });
});

// ---------- ENTRY ROUTES ----------
app.get("/api/entries", authenticate, async (req, res) => {
  const query = { userId: req.user._id };
  if (req.query.journalId) query.journalId = req.query.journalId;
  const entries = await Entry.find(query).sort({ createdAt: -1 });
  res.json(entries);
});

app.post("/api/entries", authenticate, async (req, res) => {
  const entry = new Entry({ userId: req.user._id, ...req.body });
  await entry.save();
  res.json(entry);
});

app.put("/api/entries/:id", authenticate, async (req, res) => {
  const entry = await Entry.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  res.json(entry);
});

app.post("/api/entries/:id/upload", authenticate, upload.single("file"), async (req, res) => {
  const entry = await Entry.findOne({ _id: req.params.id, userId: req.user._id });
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  entry.images.push({ url: `/uploads/${req.file.filename}` });
  await entry.save();
  res.json(entry);
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`   Please either:`);
    console.error(`   1. Stop the process using port ${PORT}`);
    console.error(`   2. Or set a different PORT in your .env file`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});
