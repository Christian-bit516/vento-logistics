import { useState, useCallback, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:3001';
const FETCH_TIMEOUT_MS = 6000;
const THRESHOLD = 0.55;

// Fetch with timeout (works in all browsers, no AbortSignal.timeout needed)
const fetchWithTimeout = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timeout'));
    }, FETCH_TIMEOUT_MS);

    fetch(url, { ...options, signal: controller.signal })
      .then(r => { clearTimeout(timer); resolve(r); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
};

// Euclidean distance between two float arrays
const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
};

// LocalStorage helpers (offline fallback)
const getLocalUsers = () => {
  const users = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('vento_user_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data?.descriptor) users.push({ id: key, ...data });
      } catch (_) { /* skip corrupt */ }
    }
  }
  return users;
};

const saveLocalUser = (userId, data) => {
  localStorage.setItem(`vento_user_${userId}`, JSON.stringify(data));
};

const findBestLocalMatch = (descriptor, users) => {
  let bestDist = Infinity;
  let bestUser = null;
  for (const user of users) {
    const dist = euclideanDistance(descriptor, user.descriptor);
    if (dist < bestDist) { bestDist = dist; bestUser = user; }
  }
  return { bestDist, bestUser };
};

// =============================================================================

export const useBiometricAuth = () => {
  // status: idle | loading_models | ready | processing | success | error | unrecognized
  const [status, setStatus]           = useState('idle');
  const [errorMsg, setErrorMsg]       = useState(null);
  const [confidenceScore, setScore]   = useState(0);
  const [successMode, setSuccessMode] = useState(null); // 'register' | 'login'
  const [modelsReady, setModelsReady] = useState(false);
  const modelsLoadedRef               = useRef(false);
  // dbMode: 'firestore' | 'server_local' | 'offline'
  const [dbMode, setDbMode]           = useState('offline');
  const [serverOnline, setServerOnline] = useState(false);
  const mountedRef = useRef(true);

  // Unmount guard
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load face-api.js models once on mount
  useEffect(() => {
    setStatus('loading_models');

    const load = async () => {
      try {
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
        await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        modelsLoadedRef.current = true;
        setModelsReady(true);
        setStatus('ready');
        console.log('[VentoAuth] Models loaded OK');
      } catch (e) {
        console.error('[VentoAuth] Error loading models', e);
        setStatus('error');
        setErrorMsg('No se pudo cargar el motor biométrico. Revise su conexión.');
      }
    };

    const poll = setInterval(() => {
      if (window.faceapi) { clearInterval(poll); load(); }
    }, 100);

    return () => clearInterval(poll);
  }, []);

  // Ping server every 15 s to detect availability and DB mode
  useEffect(() => {
    const ping = () => {
      fetchWithTimeout(`${API_BASE}/api/auth/status`)
        .then(r => r.json())
        .then(d => {
          setServerOnline(true);
          // d.firebaseReady = true  → Firestore connected
          // d.firebaseReady = false → server running in local/in-memory mode
          setDbMode(d.firebaseReady ? 'firestore' : 'server_local');
        })
        .catch(() => {
          setServerOnline(false);
          setDbMode('offline');
        });
    };
    ping();
    const iv = setInterval(ping, 15000);
    return () => clearInterval(iv);
  }, []);

  // Extract 128D face descriptor from a base64 image
  // Lower confidence (0.35) helps in poor lighting / webcam conditions
  const extractDescriptor = async (base64Image) => {
    const img = await window.faceapi.fetchImage(base64Image);
    const det = await window.faceapi
      .detectSingleFace(img, new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return det ? Array.from(det.descriptor) : null;
  };

  // Reset to scanner-ready state
  const resetToReady = useCallback(() => {
    setStatus(modelsLoadedRef.current ? 'ready' : 'loading_models');
    setErrorMsg(null);
    setScore(0);
    setSuccessMode(null);
  }, []);

  // ===========================================================================
  // REGISTER Step 1 — Scan face, check for duplicates
  // ===========================================================================
  const registerFace = useCallback(async (base64Image) => {
    if (!modelsLoadedRef.current) {
      setStatus('error');
      setErrorMsg('El motor de IA aún está cargando. Espere un momento.');
      return { success: false, reason: 'models_loading' };
    }

    setStatus('processing');
    setErrorMsg(null);

    try {
      const descriptor = await extractDescriptor(base64Image);
      if (!descriptor) {
        // Show brief error then go back to ready
        setErrorMsg('No se pudo capturar el rostro. Acérquese e intente de nuevo.');
        setStatus('error');
        // Auto-clear after 2.5s so user can retry
        setTimeout(() => {
          if (mountedRef.current) {
            setStatus('ready');
            setErrorMsg(null);
          }
        }, 2500);
        return { success: false, reason: 'no_face' };
      }

      // Check duplicates via server, fallback to local
      try {
        const resp = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptor }),
        });
        const data = await resp.json();

        if (data.success) {
          setStatus('error');
          setErrorMsg(`Este rostro ya está registrado como "${data.name}". Use Iniciar Sesión.`);
          return { success: false, reason: 'already_registered' };
        }
        // 'unrecognized' or 'no_users' => safe to register
        setServerOnline(true);

      } catch (_fetchErr) {
        setServerOnline(false);
        setDbMode('offline');
        const local = getLocalUsers();
        if (local.length > 0) {
          const { bestDist, bestUser } = findBestLocalMatch(descriptor, local);
          if (bestDist < THRESHOLD) {
            setStatus('error');
            setErrorMsg(`Este rostro ya está registrado como "${bestUser?.name}". Use Iniciar Sesión.`);
            return { success: false, reason: 'already_registered' };
          }
        }
      }

      setStatus('ready');
      return { success: true, descriptor };

    } catch (err) {
      console.error('[VentoAuth] registerFace error:', err);
      setStatus('error');
      setErrorMsg('Error en el análisis biométrico. Intente de nuevo.');
      return { success: false, reason: 'error' };
    }
  }, []);

  // ===========================================================================
  // REGISTER Step 2 — Save with name to Firestore/server/local
  // ===========================================================================
  const finalizeRegistration = useCallback(async (descriptor, name) => {
    if (!name?.trim()) {
      setStatus('error');
      setErrorMsg('Debe ingresar un nombre para registrarse.');
      return { success: false, reason: 'no_name' };
    }

    setStatus('processing');

    try {
      const resp = await fetchWithTimeout(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor, name: name.trim() }),
      });
      const data = await resp.json();

      if (!data.success) {
        setStatus('error');
        setErrorMsg(data.message || 'Error al registrar.');
        return { success: false, reason: data.reason || 'server_error' };
      }

      // Cache locally as well
      saveLocalUser(data.userId, {
        name: name.trim(),
        descriptor,
        registeredAt: new Date().toISOString(),
        serverId: data.userId
      });

      console.log(`[VentoAuth] Registered: ${data.userId} (mode: ${data.mode})`);
      setSuccessMode('register');
      setStatus('success');
      setScore(100);
      return {
        success: true,
        user: { name: name.trim(), userId: data.userId },
        offline: data.mode === 'local'
      };

    } catch (_fetchErr) {
      // Server offline — save to localStorage only
      console.warn('[VentoAuth] Server offline — saving to localStorage only');
      const userId = `offline_${Date.now()}`;
      saveLocalUser(userId, {
        name: name.trim(),
        descriptor,
        registeredAt: new Date().toISOString(),
        offline: true
      });

      setSuccessMode('register');
      setStatus('success');
      setScore(100);
      return { success: true, user: { name: name.trim(), userId }, offline: true };
    }
  }, []);

  // ===========================================================================
  // LOGIN — Authenticate face against server DB, fallback to local
  // ===========================================================================
  const loginFace = useCallback(async (base64Image) => {
    if (!modelsLoadedRef.current) {
      setStatus('error');
      setErrorMsg('El motor de IA aún está cargando. Espere un momento.');
      return { success: false, reason: 'models_loading' };
    }

    setStatus('processing');
    setErrorMsg(null);

    try {
      const descriptor = await extractDescriptor(base64Image);
      if (!descriptor) {
        setErrorMsg('No se pudo capturar el rostro. Acérquese e intente de nuevo.');
        setStatus('error');
        setTimeout(() => {
          if (mountedRef.current) {
            setStatus('ready');
            setErrorMsg(null);
          }
        }, 2500);
        return { success: false, reason: 'no_face' };
      }

      try {
        const resp = await fetchWithTimeout(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptor }),
        });
        const data = await resp.json();
        setServerOnline(true);

        if (data.success) {
          setSuccessMode('login');
          setStatus('success');
          setScore(data.matchPercent);
          return { success: true, user: { name: data.name, userId: data.userId }, offline: false };
        }

        if (data.reason === 'no_users') {
          setStatus('error');
          setErrorMsg('No hay usuarios registrados. Regístrese primero.');
          return { success: false, reason: 'no_users' };
        }

        if (data.reason === 'unrecognized') {
          setStatus('unrecognized');
          return { success: false, reason: 'unrecognized' };
        }

        setStatus('error');
        setErrorMsg(data.message || 'Error del servidor.');
        return { success: false, reason: 'server_error' };

      } catch (_fetchErr) {
        setServerOnline(false);
        setDbMode('offline');
        console.warn('[VentoAuth] Server offline — localStorage fallback');

        const local = getLocalUsers();
        if (!local.length) {
          setStatus('error');
          setErrorMsg('No hay usuarios registrados. Regístrese primero.');
          return { success: false, reason: 'no_users' };
        }

        const { bestDist, bestUser } = findBestLocalMatch(descriptor, local);
        console.log(`[VentoAuth] Local match dist: ${bestDist?.toFixed(4)}`);

        if (bestDist > THRESHOLD || !bestUser) {
          setStatus('unrecognized');
          return { success: false, reason: 'unrecognized' };
        }

        const matchPercent = Math.max(60, Math.min(99, Math.round((1 - bestDist / THRESHOLD) * 39) + 60));
        setSuccessMode('login');
        setStatus('success');
        setScore(matchPercent);
        return { success: true, user: { name: bestUser.name }, offline: true };
      }

    } catch (err) {
      console.error('[VentoAuth] loginFace error:', err);
      setStatus('error');
      setErrorMsg('Error en el análisis biométrico. Intente de nuevo.');
      return { success: false, reason: 'error' };
    }
  }, []);

  return {
    status,
    errorMsg,
    confidenceScore,
    successMode,
    modelsReady,
    serverOnline,
    dbMode,
    registerFace,
    finalizeRegistration,
    loginFace,
    resetToReady,
  };
};