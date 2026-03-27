const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db.js");
const routes = require("./routes");
const { startReminderCron } = require('./services/reminderService'); // Reminder cron

dotenv.config();

connectDB();

const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  // origin: "https://abhishekjudicialacademy-admin.vercel.app",
  origin: "http://localhost:8080",
  credentials: true
}));

app.use(routes);

app.get("/", (req, res) => {
  res.send("Law LMS API Running ✅ with Live Classes & Reminders");
});

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: process.env.cors, 
    credentials: true
  }
});

global.io = io;

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.userId);
  socket.join(`user_${socket.userId}`);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.userId);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  const { stopReminderCron } = require('./services/reminderService');
  stopReminderCron();
  process.exit(0);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
  startReminderCron();
});

