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
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json({ limit: '5mb' })); // descriptors can be large

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE ADMIN — graceful init (server stays up even without credentials)
// ═══════════════════════════════════════════════════════════════════════════════

let db = null;
let firebaseReady = false;

try {
  const { default: admin } = await import('firebase-admin');
  const keyPath = path.join(__dirname, 'back', 'serviceAccountKey.json');

  if (!fs.existsSync(keyPath)) {
    throw new Error(`serviceAccountKey.json not found at: ${keyPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  firebaseReady = true;
  console.log('\x1b[32m%s\x1b[0m', '[Vento] ✓ Firebase Admin connected to Firestore');
} catch (error) {
  console.warn('\x1b[33m%s\x1b[0m', `[Vento] ⚠ Firebase not available: ${error.message}`);
  console.warn('\x1b[33m%s\x1b[0m', '[Vento] Running in LOCAL STORAGE ONLY mode — biometric data will not persist to DB');
}

// ─── In-memory fallback store (used when Firebase is not available) ──────────
const localUsers = new Map(); // userId → { name, descriptor, registeredAt, loginCount, lastLogin }

// ─── Firestore helpers ───────────────────────────────────────────────────────
const getAllUsersFromDB = async () => {
  if (firebaseReady && db) {
    const snap = await db.collection('biometric_users').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  return Array.from(localUsers.values());
};

const saveUserToDB = async (userId, data) => {
  if (firebaseReady && db) {
    await db.collection('biometric_users').doc(userId).set(data);
    return;
  }
  localUsers.set(userId, { id: userId, ...data });
};

const updateUserInDB = async (userId, updates) => {
  if (firebaseReady && db) {
    await db.collection('biometric_users').doc(userId).update(updates);
    return;
  }
  if (localUsers.has(userId)) {
    localUsers.set(userId, { ...localUsers.get(userId), ...updates });
  }
};

// ─── Euclidean distance ──────────────────────────────────────────────────────
const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};

// ─── Persistent state (chat/logs) ────────────────────────────────────────────
let BLACKLISTED_NUMBERS = [];
let systemLogs = [];

// Sync from Firestore if available
if (firebaseReady && db) {
  db.collection('blacklist').onSnapshot(snap => {
    BLACKLISTED_NUMBERS = snap.docs.map(d => d.id);
  }, err => console.error('[Vento] Blacklist sync error:', err));

  db.collection('logs').orderBy('timestamp', 'desc').limit(100).onSnapshot(snap => {
    systemLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }, err => console.error('[Vento] Logs sync error:', err));
}

const saveLogToDB = async (entry) => {
  if (firebaseReady && db) {
    try { await db.collection('logs').doc(entry.id).set(entry); } catch (_) {}
  } else {
    systemLogs.unshift(entry);
    if (systemLogs.length > 100) systemLogs.pop();
  }
};

const saveBlacklistToDB = async (number) => {
  if (firebaseReady && db) {
    try { await db.collection('blacklist').doc(number).set({ addedAt: new Date().toISOString() }); } catch (_) {}
  } else {
    if (!BLACKLISTED_NUMBERS.includes(number)) BLACKLISTED_NUMBERS.push(number);
  }
};

const removeBlacklistFromDB = async (number) => {
  if (firebaseReady && db) {
    try { await db.collection('blacklist').doc(number).delete(); } catch (_) {}
  } else {
    BLACKLISTED_NUMBERS = BLACKLISTED_NUMBERS.filter(n => n !== number);
  }
};

// ─── NLP Phone Detection ─────────────────────────────────────────────────────
const detectPhoneNumber = (text) => {
  const wordMap = {
    'cero':'0','uno':'1','dos':'2','tres':'3','cuatro':'4',
    'cinco':'5','seis':'6','siete':'7','ocho':'8','nueve':'9'
  };
  let normalized = text.toLowerCase();
  for (const [word, digit] of Object.entries(wordMap)) {
    normalized = normalized.replace(new RegExp(word, 'g'), digit);
  }
  const cleaned = normalized.replace(/[\-\.\s\(\)]/g, '');
  const matches = cleaned.match(/\d{7,11}/g);
  return matches?.length > 0
    ? { detected: true, digits: matches[0] }
    : { detected: false, digits: null };
};

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET.IO — Real-time chat
// ═══════════════════════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  console.log('[Vento] Socket connected:', socket.id);

  socket.on('join_room', (room) => socket.join(room));

  socket.on('send_message', (data) => {
    const { room, message, sender } = data;
    const ai = detectPhoneNumber(message);

    if (ai.detected) {
      const isBlacklisted = BLACKLISTED_NUMBERS.includes(ai.digits);
      const entry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        sender, message,
        detectedNumber: ai.digits,
        status: isBlacklisted ? 'INTERCEPTED' : 'SUSPICIOUS_ALLOWED'
      };
      saveLogToDB(entry);

      if (isBlacklisted) {
        io.to(room).emit('ai_alert', {
          originalMessage: message,
          detectedNumber: ai.digits,
          alertText: '⚠️ Número detectado con reportes de fraude previos.',
          sender
        });
        return;
      }
    }

    io.to(room).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('[Vento] Socket disconnected:', socket.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BIOMETRIC AUTH API
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/auth/status — check if Firestore is connected
app.get('/api/auth/status', (_req, res) => {
  res.json({ firebaseReady, mode: firebaseReady ? 'firestore' : 'local' });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { descriptor, name } = req.body;
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length < 128 || !name?.trim()) {
      return res.status(400).json({ success: false, message: 'descriptor (128 floats) y name son requeridos.' });
    }

    const allUsers = await getAllUsersFromDB();
    const THRESHOLD = 0.55;

    for (const user of allUsers) {
      if (user.descriptor && Array.isArray(user.descriptor)) {
        const dist = euclideanDistance(descriptor, user.descriptor);
        if (dist < THRESHOLD) {
          return res.status(409).json({
            success: false,
            reason: 'already_registered',
            message: `Este rostro ya está registrado como "${user.name}". Use Iniciar Sesión.`
          });
        }
      }
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const userData = {
      name: name.trim(),
      descriptor: Array.from(descriptor),
      registeredAt: new Date().toISOString(),
      loginCount: 0,
      lastLogin: null
    };

    await saveUserToDB(userId, userData);

    console.log(`[VentoAuth] ✓ Registered: "${name.trim()}" (${userId}) via ${firebaseReady ? 'Firestore' : 'local'}`);
    return res.status(201).json({ success: true, userId, name: name.trim(), mode: firebaseReady ? 'firestore' : 'local' });

  } catch (err) {
    console.error('[VentoAuth] Register error:', err);
    return res.status(500).json({ success: false, message: 'Error interno al registrar.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length < 128) {
      return res.status(400).json({ success: false, message: 'descriptor (128 floats) es requerido.' });
    }

    const allUsers = await getAllUsersFromDB();

    if (!allUsers.length) {
      return res.status(404).json({ success: false, reason: 'no_users', message: 'No hay usuarios registrados. Regístrese primero.' });
    }

    const THRESHOLD = 0.55;
    let bestDist = Infinity;
    let bestUser = null;

    for (const user of allUsers) {
      if (user.descriptor && Array.isArray(user.descriptor)) {
        const dist = euclideanDistance(descriptor, user.descriptor);
        if (dist < bestDist) { bestDist = dist; bestUser = user; }
      }
    }

    if (!bestUser || bestDist > THRESHOLD) {
      console.log(`[VentoAuth] ✗ Unrecognized face (best dist: ${bestDist?.toFixed(4)})`);
      return res.status(401).json({ success: false, reason: 'unrecognized', message: 'Rostro no reconocido en el sistema.' });
    }

    const matchPercent = Math.max(60, Math.min(99, Math.round((1 - bestDist / THRESHOLD) * 39) + 60));
    const newLoginCount = (bestUser.loginCount || 0) + 1;

    await updateUserInDB(bestUser.id, { loginCount: newLoginCount, lastLogin: new Date().toISOString() });

    console.log(`[VentoAuth] ✓ Login OK: "${bestUser.name}" dist=${bestDist.toFixed(4)} match=${matchPercent}%`);
    return res.json({
      success: true,
      userId: bestUser.id,
      name: bestUser.name,
      matchPercent,
      loginCount: newLoginCount,
      mode: firebaseReady ? 'firestore' : 'local'
    });

  } catch (err) {
    console.error('[VentoAuth] Login error:', err);
    return res.status(500).json({ success: false, message: 'Error interno al autenticar.' });
  }
});

// GET /api/auth/users — admin: list registered users
app.get('/api/auth/users', async (_req, res) => {
  try {
    const allUsers = await getAllUsersFromDB();
    return res.json({
      success: true,
      total: allUsers.length,
      mode: firebaseReady ? 'firestore' : 'local',
      users: allUsers.map(u => ({
        id: u.id,
        name: u.name,
        registeredAt: u.registeredAt,
        loginCount: u.loginCount || 0,
        lastLogin: u.lastLogin
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al obtener usuarios.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API — logs, blacklist
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/logs', (_req, res) => res.json(systemLogs));

app.get('/api/blacklist', (_req, res) => res.json(BLACKLISTED_NUMBERS));

app.post('/api/blacklist', async (req, res) => {
  const { number } = req.body;
  if (number && !BLACKLISTED_NUMBERS.includes(number)) {
    await saveBlacklistToDB(number);
    return res.json({ success: true, message: 'Added to blacklist' });
  }
  res.status(400).json({ success: false, message: 'Invalid or already exists' });
});

app.delete('/api/blacklist/:number', async (req, res) => {
  const { number } = req.params;
  if (BLACKLISTED_NUMBERS.includes(number)) {
    await removeBlacklistFromDB(number);
    return res.json({ success: true, message: 'Removed from blacklist' });
  }
  res.status(404).json({ success: false, message: 'Number not found in blacklist' });
});

app.delete('/api/logs', async (_req, res) => {
  try {
    if (firebaseReady && db) {
      const batch = db.batch();
      const snap = await db.collection('logs').get();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } else {
      systemLogs = [];
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear logs' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `[Vento AI Core] Server running on http://localhost:${PORT}`);
  console.log('\x1b[36m%s\x1b[0m', `[Vento AI Core] Biometric DB mode: ${firebaseReady ? '🔥 Firestore' : '💾 In-Memory'}`);
});
