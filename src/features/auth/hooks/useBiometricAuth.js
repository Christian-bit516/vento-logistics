import { useState, useCallback, useEffect, useRef } from 'react';
import API_URL_BASE from '../../../config/api';

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

  const extractDescriptor = async (base64Image) => {
    const img = await window.faceapi.fetchImage(base64Image);
    const detection = await window.faceapi
      .detectSingleFace(img, new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor) : null;
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
        setStatus('ready');
        return { success: false, reason: 'no_face' };
      }

      // API Call to Backend (Railway)
      const response = await fetch(`${API_URL_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `User_${Date.now().toString().slice(-4)}`, // Default name
          descriptor: descriptor
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMsg(result.message || 'Error al registrar.');
        return { success: false, reason: result.reason || 'error' };
      }

      setSuccessMode('register');
      setStatus('success');
      setConfidenceScore(100);
      return { success: true };

    } catch (err) {
      console.error('[VentoAuth] Register error', err);
      setStatus('error');
      setErrorMsg('Error de conexión con el servidor de seguridad.');
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

      // API Call to Backend (Railway)
      const response = await fetch(`${API_URL_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setStatus('unrecognized');
          return { success: false, reason: 'unrecognized' };
        }
        setStatus('error');
        setErrorMsg(result.message || 'Error al autenticar.');
        return { success: false, reason: 'error' };
      }

      setSuccessMode('login');
      setStatus('success');
      setConfidenceScore(result.matchPercent || 95);
      return { success: true };

    } catch (err) {
      console.error('[VentoAuth] Login error', err);
      setStatus('error');
      setErrorMsg('Error de conexión con el servidor de seguridad.');
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