import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Persistent Storage Paths
const DATA_DIR = path.join(__dirname, 'data');
const BLACKLIST_FILE = path.join(DATA_DIR, 'blacklist.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initial Data Load
let BLACKLISTED_NUMBERS = [];
try {
  if (fs.existsSync(BLACKLIST_FILE)) {
    BLACKLISTED_NUMBERS = JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf8'));
  } else {
    BLACKLISTED_NUMBERS = ["987654321", "123456789", "555123456"];
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(BLACKLISTED_NUMBERS));
  }
} catch (e) {
  console.error("Error loading blacklist:", e);
}

let systemLogs = [];
try {
  if (fs.existsSync(LOGS_FILE)) {
    systemLogs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
  }
} catch (e) {
  console.error("Error loading logs:", e);
}

const saveLogs = () => {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(systemLogs, null, 2));
};

const saveBlacklist = () => {
  fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(BLACKLISTED_NUMBERS, null, 2));
};

// AI NLP SECURITY LAYER
const detectPhoneNumber = (text) => {
  const numberWordMap = {
    'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
    'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9'
  };
  
  let normalizedText = text.toLowerCase();
  
  // Replace words with digits
  for (const [word, digit] of Object.entries(numberWordMap)) {
    normalizedText = normalizedText.replace(new RegExp(word, 'g'), digit);
  }
  
  // Remove common camouflage characters
  const cleanedText = normalizedText.replace(/[\-\.\s\(\)]/g, '');
  
  // Extract patterns that look like phone numbers (7 to 11 digits)
  const phonePattern = /\d{7,11}/g;
  const matches = cleanedText.match(phonePattern);
  
  if (matches && matches.length > 0) {
    return { detected: true, digits: matches[0] };
  }
  
  return { detected: false, digits: null };
};

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
  });

  socket.on('send_message', (data) => {
    const { room, message, sender } = data;

    // AI SECURITY CHECK
    const aiAnalysis = detectPhoneNumber(message);
    
    if (aiAnalysis.detected) {
      const isBlacklisted = BLACKLISTED_NUMBERS.includes(aiAnalysis.digits);
      
      const logEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sender,
        message,
        detectedNumber: aiAnalysis.digits,
        status: isBlacklisted ? 'INTERCEPTED' : 'SUSPICIOUS_ALLOWED'
      };
      
      systemLogs.unshift(logEntry);
      if (systemLogs.length > 100) systemLogs.pop(); // Keep last 100
      saveLogs();

      if (isBlacklisted) {
        io.to(room).emit('ai_alert', {
          originalMessage: message,
          detectedNumber: aiAnalysis.digits,
          alertText: "⚠️ Número detectado con reportes de fraude previos.",
          sender
        });
        return; 
      }
    }

    io.to(room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
  });
});

// REST API for Admin Dashboard
app.get('/api/logs', (req, res) => {
  res.json(systemLogs);
});

app.post('/api/blacklist', (req, res) => {
  const { number } = req.body;
  if (number && !BLACKLISTED_NUMBERS.includes(number)) {
    BLACKLISTED_NUMBERS.push(number);
    saveBlacklist();
    return res.json({ success: true, message: 'Added to blacklist' });
  }
  res.status(400).json({ success: false, message: 'Invalid or already exists' });
});

app.delete('/api/logs', (req, res) => {
  systemLogs = [];
  saveLogs();
  res.json({ success: true });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`\x1b[36m%s\x1b[0m`, `[Vento AI Core] Server running on http://localhost:${PORT}`);
});

