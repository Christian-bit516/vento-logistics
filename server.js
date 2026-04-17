import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

// Mocked Database of reported phone numbers
const BLACKLISTED_NUMBERS = [
  "987654321", "123456789", "555123456"
];

// NLP Simulation (Regex for detecting obscured numbers)
const detectPhoneNumber = (text) => {
  // Simple regex to find sequences of digits, even if separated by spaces or words
  // e.g., "nueve 8 siete" -> "987"
  const numberWordMap = {
    'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
    'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9'
  };
  
  let normalizedText = text.toLowerCase();
  for (const [word, digit] of Object.entries(numberWordMap)) {
    normalizedText = normalizedText.replace(new RegExp(word, 'g'), digit);
  }
  
  // Extract all digits
  const digits = normalizedText.replace(/\D/g, '');
  
  // Check if length looks like a phone number (e.g., 9 digits)
  if (digits.length >= 7) {
    return { detected: true, digits };
  }
  return { detected: false, digits: null };
};

// In-memory logs for Admin Dashboard
let systemLogs = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a specific room (e.g., negotiation between user A and courier B)
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on('send_message', (data) => {
    console.log('Message received:', data);
    const { room, message, sender } = data;

    // AI SECURITY LAYER
    const aiAnalysis = detectPhoneNumber(message);
    
    if (aiAnalysis.detected) {
      console.warn('⚠️ [AI Alert] Potential phone number detected:', aiAnalysis.digits);
      
      const isBlacklisted = BLACKLISTED_NUMBERS.includes(aiAnalysis.digits);
      
      if (isBlacklisted) {
        // Log the fraud attempt
        systemLogs.push({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          sender,
          message,
          detectedNumber: aiAnalysis.digits,
          status: 'INTERCEPTED'
        });

        // Intercept message and alert the receiver
        io.to(room).emit('ai_alert', {
          originalMessage: message,
          detectedNumber: aiAnalysis.digits,
          alertText: "⚠️ Número con reportes. ¿Desea continuar o bloquear a este usuario?",
          sender
        });
        return; // Stop the message from reaching normally
      } else {
        // If it's a number but not blacklisted, we could log it as 'SUSPICIOUS' but still send it.
        systemLogs.push({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          sender,
          message,
          detectedNumber: aiAnalysis.digits,
          status: 'SUSPICIOUS_ALLOWED'
        });
      }
    }

    // Standard message delivery
    io.to(room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// REST API for Admin Dashboard
app.get('/api/logs', (req, res) => {
  res.json(systemLogs);
});

app.post('/api/blacklist', express.json(), (req, res) => {
  const { number } = req.body;
  if (number && !BLACKLISTED_NUMBERS.includes(number)) {
    BLACKLISTED_NUMBERS.push(number);
    return res.json({ success: true, message: 'Number added to blacklist' });
  }
  res.status(400).json({ success: false, message: 'Invalid or existing number' });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
