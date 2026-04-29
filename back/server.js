import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Permitir cualquier origen para Railway
    methods: ["GET", "POST"]
  }
});

// Initialize Firebase Admin
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Ahora que estamos dentro de /back, el archivo está en la misma carpeta
    serviceAccount = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8')
    );
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully.');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
}

const db = admin.firestore();

// Persistent Storage State (Cached locally for blazing fast NLP checks)
let BLACKLISTED_NUMBERS = [];
let systemLogs = [];

// Sync Blacklist from Firestore in real-time
db.collection('blacklist').onSnapshot(snapshot => {
  BLACKLISTED_NUMBERS = snapshot.docs.map(doc => doc.id);
}, err => console.error('Error syncing blacklist:', err));

// Sync Logs from Firestore in real-time (order by timestamp desc, limit 100)
db.collection('logs').orderBy('timestamp', 'desc').limit(100).onSnapshot(snapshot => {
  systemLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}, err => console.error('Error syncing logs:', err));

const saveLogToFirestore = async (logEntry) => {
  try {
    await db.collection('logs').doc(logEntry.id).set(logEntry);
  } catch (error) {
    console.error('Error saving log to Firestore:', error);
  }
};

const saveBlacklistToFirestore = async (number) => {
  try {
    await db.collection('blacklist').doc(number).set({ addedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error saving to blacklist:', error);
  }
};

const removeBlacklistFromFirestore = async (number) => {
  try {
    await db.collection('blacklist').doc(number).delete();
  } catch (error) {
    console.error('Error removing from blacklist:', error);
  }
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
      
      saveLogToFirestore(logEntry);

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

app.get('/api/blacklist', (req, res) => {
  res.json(BLACKLISTED_NUMBERS);
});

app.post('/api/blacklist', async (req, res) => {
  const { number } = req.body;
  if (number && !BLACKLISTED_NUMBERS.includes(number)) {
    await saveBlacklistToFirestore(number);
    return res.json({ success: true, message: 'Added to blacklist' });
  }
  res.status(400).json({ success: false, message: 'Invalid or already exists' });
});

app.delete('/api/blacklist/:number', async (req, res) => {
  const { number } = req.params;
  
  if (BLACKLISTED_NUMBERS.includes(number)) {
    await removeBlacklistFromFirestore(number);
    return res.json({ success: true, message: 'Removed from blacklist' });
  }
  res.status(404).json({ success: false, message: 'Number not found in blacklist' });
});

app.delete('/api/logs', async (req, res) => {
  try {
    const batch = db.batch();
    const snapshot = await db.collection('logs').get();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear logs' });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\x1b[36m%s\x1b[0m`, `🚀 [Vento AI Core] Server running on port ${PORT}`);
});
