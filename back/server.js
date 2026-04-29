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
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json({ limit: '5mb' })); // descriptors can be large

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE ADMIN — Configuración para Railway y Local
// ═══════════════════════════════════════════════════════════════════════════════
let db = null;
let firebaseReady = false;

try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Modo Railway: usamos la variable de entorno
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Modo Local: buscamos el archivo JSON
    const keyPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
  }

  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    firebaseReady = true;
    console.log('\x1b[32m%s\x1b[0m', '✅ [Vento] Firebase Admin conectado con éxito.');
  } else {
    throw new Error('No se encontraron credenciales de Firebase (JSON o Env Var).');
  }
} catch (error) {
  console.warn('\x1b[33m%s\x1b[0m', `⚠️ [Vento] Firebase no disponible: ${error.message}`);
  console.warn('\x1b[33m%s\x1b[0m', '[Vento] Funcionando en modo ALMACENAMIENTO LOCAL — los datos no persistirán en la DB.');
}

// ─── In-memory fallback store (cuando Firebase no está disponible) ──────────
const localUsers = new Map(); 

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

if (firebaseReady && db) {
  db.collection('blacklist').onSnapshot(snap => {
    BLACKLISTED_NUMBERS = snap.docs.map(d => d.id);
  }, err => console.error('[Vento] Error en sincronización de lista negra:', err));

  db.collection('logs').orderBy('timestamp', 'desc').limit(100).onSnapshot(snap => {
    systemLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }, err => console.error('[Vento] Error en sincronización de logs:', err));
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
  console.log('[Vento] Socket conectado:', socket.id);

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
    console.log('[Vento] Socket desconectado:', socket.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BIOMETRIC AUTH API
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/auth/status', (_req, res) => {
  res.json({ firebaseReady, mode: firebaseReady ? 'firestore' : 'local' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { descriptor, name } = req.body;
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length < 128 || !name?.trim()) {
      return res.status(400).json({ success: false, message: 'descriptor y name son requeridos.' });
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
            message: `Este rostro ya está registrado como "${user.name}".`
          });
        }
      }
    }

    const userId = `user_${Date.now()}`;
    const userData = {
      name: name.trim(),
      descriptor: Array.from(descriptor),
      registeredAt: new Date().toISOString(),
      loginCount: 0,
      lastLogin: null
    };

    await saveUserToDB(userId, userData);
    return res.status(201).json({ success: true, userId, name: name.trim() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al registrar.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { descriptor } = req.body;
    const allUsers = await getAllUsersFromDB();

    if (!allUsers.length) {
      return res.status(404).json({ success: false, message: 'No hay usuarios registrados.' });
    }

    const THRESHOLD = 0.55;
    let bestDist = Infinity;
    let bestUser = null;

    for (const user of allUsers) {
      const dist = euclideanDistance(descriptor, user.descriptor);
      if (dist < bestDist) { bestDist = dist; bestUser = user; }
    }

    if (!bestUser || bestDist > THRESHOLD) {
      return res.status(401).json({ success: false, message: 'Rostro no reconocido.' });
    }

    const matchPercent = Math.round((1 - bestDist / THRESHOLD) * 100);
    await updateUserInDB(bestUser.id, { loginCount: (bestUser.loginCount || 0) + 1, lastLogin: new Date().toISOString() });

    return res.json({ success: true, name: bestUser.name, matchPercent });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al autenticar.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API
// ═══════════════════════════════════════════════════════════════════════════════

// Health check — útil para verificar que el backend responde correctamente
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    firebase: firebaseReady ? 'connected' : 'local-memory',
    logs: systemLogs.length,
    blacklist: BLACKLISTED_NUMBERS.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/logs', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(systemLogs);
});

app.get('/api/blacklist', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(BLACKLISTED_NUMBERS);
});

app.post('/api/blacklist', async (req, res) => {
  const { number } = req.body;
  if (number && !BLACKLISTED_NUMBERS.includes(number)) {
    await saveBlacklistToDB(number);
    return res.json({ success: true });
  }
  res.status(400).send();
});

app.delete('/api/logs', async (_req, res) => {
  try {
    if (firebaseReady && db) {
      const batch = db.batch();
      const snap = await db.collection('logs').get();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    systemLogs = [];
    res.json({ success: true });
  } catch (err) {
    res.status(500).send();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('\x1b[36m%s\x1b[0m', `🚀 [Vento AI Core] Servidor corriendo en el puerto ${PORT}`);
  console.log('\x1b[36m%s\x1b[0m', `[Vento AI Core] Modo Base de Datos: ${firebaseReady ? '🔥 Firestore' : '💾 Memoria Local'}`);
});
