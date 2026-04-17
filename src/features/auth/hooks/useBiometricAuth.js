import { useState, useCallback, useEffect, useRef } from 'react';

export const useBiometricAuth = () => {
  const [status, setStatus] = useState('idle'); // idle | loading_models | ready | processing | success | error | unrecognized
  const [errorMsg, setErrorMsg] = useState(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [successMode, setSuccessMode] = useState(null); // 'register' | 'login'
  const modelsLoadedRef = useRef(false);
  const [modelsReady, setModelsReady] = useState(false);

  // Load face-api.js models once on mount
  useEffect(() => {
    setStatus('loading_models');

    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
        await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        modelsLoadedRef.current = true;
        setModelsReady(true);
        setStatus('ready');
        console.log('[VentoAuth] Models loaded ✓');
      } catch (e) {
        console.error('[VentoAuth] Error loading models', e);
        setStatus('error');
        setErrorMsg('No se pudo cargar el motor biométrico. Revise su conexión.');
      }
    };

    // Wait for face-api.js script tag to execute
    const check = setInterval(() => {
      if (window.faceapi) {
        clearInterval(check);
        loadModels();
      }
    }, 100);

    return () => clearInterval(check);
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getStoredUsers = () => {
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vento_user_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.descriptor) {
            users.push({ key, data });
          }
        } catch (_) { /* ignore corrupt entries */ }
      }
    }
    return users;
  };

  const extractDescriptor = async (base64Image) => {
    const img = await window.faceapi.fetchImage(base64Image);
    const detection = await window.faceapi
      .detectSingleFace(img, new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor) : null;
  };

  const findBestMatch = (descriptor, users) => {
    let bestDistance = Infinity;
    let matchedKey = null;

    const currentVec = new Float32Array(descriptor);
    for (const { key, data } of users) {
      const storedVec = new Float32Array(data.descriptor);
      const dist = window.faceapi.euclideanDistance(storedVec, currentVec);
      if (dist < bestDistance) {
        bestDistance = dist;
        matchedKey = key;
      }
    }
    return { bestDistance, matchedKey };
  };

  // ─── Public Actions ───────────────────────────────────────────────────────────

  const resetToReady = useCallback(() => {
    setStatus(modelsLoadedRef.current ? 'ready' : 'loading_models');
    setErrorMsg(null);
    setConfidenceScore(0);
    setSuccessMode(null);
  }, []);

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
        // No face detected — reset to ready so scanner can retry
        setStatus('ready');
        return { success: false, reason: 'no_face' };
      }

      // Check if face already exists
      const users = getStoredUsers();
      if (users.length > 0) {
        const { bestDistance } = findBestMatch(descriptor, users);
        if (bestDistance < 0.55) {
          setStatus('error');
          setErrorMsg('Este rostro ya está registrado en el sistema. Use Iniciar Sesión.');
          return { success: false, reason: 'already_registered' };
        }
      }

      // Save new identity
      const newId = `vento_user_${Date.now()}`;
      localStorage.setItem(newId, JSON.stringify({ faceRegistered: true, descriptor }));
      console.log(`[VentoAuth] New user registered: ${newId}`);

      setSuccessMode('register');
      setStatus('success');
      setConfidenceScore(100);
      return { success: true };

    } catch (err) {
      console.error('[VentoAuth] Register error', err);
      setStatus('error');
      setErrorMsg('Error en el análisis biométrico. Intente de nuevo.');
      return { success: false, reason: 'error' };
    }
  }, []);

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
        setStatus('ready');
        return { success: false, reason: 'no_face' };
      }

      const users = getStoredUsers();

      if (users.length === 0) {
        setStatus('error');
        setErrorMsg('No hay usuarios registrados. Registrese primero en la pestaña "Registro".');
        return { success: false, reason: 'no_users' };
      }

      const { bestDistance, matchedKey } = findBestMatch(descriptor, users);
      console.log(`[VentoAuth] Best match distance: ${bestDistance.toFixed(4)} (key: ${matchedKey})`);

      if (bestDistance > 0.55 || !matchedKey) {
        setStatus('unrecognized');
        return { success: false, reason: 'unrecognized' };
      }

      const matchPercent = Math.max(60, Math.min(99, Math.round((1 - bestDistance / 0.55) * 39) + 60));

      setSuccessMode('login');
      setStatus('success');
      setConfidenceScore(matchPercent);
      return { success: true };

    } catch (err) {
      console.error('[VentoAuth] Login error', err);
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
    registerFace,
    loginFace,
    resetToReady,
  };
};