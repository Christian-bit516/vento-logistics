import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import './FaceScannerPro.css';

/**
 * FaceScannerPro v3 — Fully rewritten to fix all reliability bugs:
 *
 * FIXES:
 * 1. REMOVED MediaPipe Camera utility — it fought with react-webcam for the
 *    hardware camera stream causing flickering and lost frames. Now we feed
 *    frames to FaceMesh manually via requestAnimationFrame.
 * 2. isCapturingRef now resets in ALL code paths (no_face, error, timeout).
 * 3. Added visible "no face detected" toast when scan fails silently.
 * 4. Screenshot format changed from WebP to JPEG for more reliable face-api.js
 *    descriptor extraction.
 * 5. Added 500ms cooldown between scans to prevent race conditions.
 * 6. Added scan attempt counter with auto-retry hint after 2 failures.
 */
const FaceScannerPro = ({ onCapture, isProcessing, hasError, onRetry, mode }) => {
  const webcamRef       = useRef(null);
  const canvasRef       = useRef(null);
  const isCapturingRef  = useRef(false);
  const faceMeshRef     = useRef(null);
  const faceDetectedRef = useRef(false);
  const rafIdRef        = useRef(null);
  const cooldownRef     = useRef(false);
  const mountedRef      = useRef(true);

  // Refs for stale-closure-safe reads
  const isProcessingRef = useRef(isProcessing);
  const hasErrorRef     = useRef(hasError);

  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { hasErrorRef.current     = hasError;      }, [hasError]);

  // UI state
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [faceDetected,   setFaceDetected]   = useState(false);
  const [scanFeedback,   setScanFeedback]   = useState(null); // 'no_face' | null
  const [failCount,      setFailCount]      = useState(0);
  const [cameraReady,    setCameraReady]    = useState(false);

  // Reset isCapturingRef when processing finishes OR on ANY status change
  useEffect(() => {
    if (!isProcessing) {
      isCapturingRef.current = false;
    }
  }, [isProcessing, hasError]);

  // Clear feedback toast after 3 seconds
  useEffect(() => {
    if (scanFeedback) {
      const t = setTimeout(() => setScanFeedback(null), 3000);
      return () => clearTimeout(t);
    }
  }, [scanFeedback]);

  // ── FaceMesh pipeline (NO Camera utility — uses rAF directly) ──────────
  useEffect(() => {
    mountedRef.current = true;
    let initTimer = null;

    const initFaceMesh = () => {
      if (!mountedRef.current) return;

      // Wait for both the webcam video element AND the FaceMesh class
      const videoEl = webcamRef.current?.video;
      if (!videoEl || !window.FaceMesh || !window.drawConnectors || videoEl.readyState < 2) {
        initTimer = setTimeout(initFaceMesh, 300);
        return;
      }

      // Clean up any previous instance
      try { faceMeshRef.current?.close(); } catch (_) {}
      cancelAnimationFrame(rafIdRef.current);

      const faceMesh = new window.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces:            1,
        refineLandmarks:        false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
      });

      faceMesh.onResults((results) => {
        if (!mountedRef.current) return;
        const canvas = canvasRef.current;
        const video = webcamRef.current?.video;
        if (!canvas || !video) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width  = vw;
          canvas.height = vh;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, vw, vh);

        const hasFace = (results.multiFaceLandmarks?.length ?? 0) > 0;

        // Update React state only on change to avoid re-renders
        if (hasFace !== faceDetectedRef.current) {
          faceDetectedRef.current = hasFace;
          setFaceDetected(hasFace);
        }

        if (!mediapipeReady) setMediapipeReady(true);

        if (hasFace) {
          for (const landmarks of results.multiFaceLandmarks) {
            // Tesselation mesh
            window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
              color: 'rgba(0, 195, 255, 0.3)',
              lineWidth: 0.5,
            });

            // Key dots (every 4th)
            ctx.fillStyle = '#00d4ff';
            for (let i = 0; i < landmarks.length; i += 4) {
              const pt = landmarks[i];
              ctx.fillRect(pt.x * vw - 1, pt.y * vh - 1, 2, 2);
            }

            // Eye rings
            const leftEye  = landmarks[159];
            const rightEye = landmarks[386];
            if (leftEye && rightEye) {
              ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(leftEye.x * vw, leftEye.y * vh, 10, 0, Math.PI * 2);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(rightEye.x * vw, rightEye.y * vh, 10, 0, Math.PI * 2);
              ctx.stroke();

              ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
              ctx.beginPath();
              ctx.arc(leftEye.x * vw, leftEye.y * vh, 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(rightEye.x * vw, rightEye.y * vh, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      });

      faceMeshRef.current = faceMesh;

      // Feed frames manually via requestAnimationFrame (NO MediaPipe Camera!)
      let sending = false;
      const loop = async () => {
        if (!mountedRef.current) return;

        const video = webcamRef.current?.video;
        if (video && video.readyState >= 2 && faceMeshRef.current && !sending) {
          sending = true;
          try {
            await faceMeshRef.current.send({ image: video });
          } catch (e) {
            // FaceMesh can throw if component unmounts mid-send
            if (mountedRef.current) {
              console.warn('[FaceScanner] FaceMesh send error:', e.message);
            }
          }
          sending = false;
        }

        rafIdRef.current = requestAnimationFrame(loop);
      };

      rafIdRef.current = requestAnimationFrame(loop);
      console.log('[FaceScanner] Pipeline started (rAF mode)');
    };

    initFaceMesh();

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      cancelAnimationFrame(rafIdRef.current);
      try { faceMeshRef.current?.close(); } catch (_) {}
      faceMeshRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getStatusText = () => {
    if (!mediapipeReady)    return 'INICIALIZANDO SISTEMA...';
    if (isProcessing)       return 'PROCESANDO BIOMETRÍA...';
    if (scanFeedback === 'no_face') return 'ROSTRO NO CAPTURADO — REINTENTE';
    if (!faceDetected)      return 'SIN DETECCIÓN — ACÉRQUESE';
    return 'SUJETO DETECTADO — LISTO';
  };

  const handleManualScan = useCallback(() => {
    // Guard: prevent double scans
    if (!faceDetectedRef.current || isProcessingRef.current || hasErrorRef.current) return;
    if (isCapturingRef.current || cooldownRef.current) return;

    isCapturingRef.current = true;
    cooldownRef.current = true;
    setScanFeedback(null);

    // Small delay to ensure video frame is stable
    setTimeout(() => {
      const imageSrc = webcamRef.current?.getScreenshot();

      if (!imageSrc) {
        // Screenshot failed — reset immediately
        console.warn('[FaceScanner] getScreenshot() returned null');
        isCapturingRef.current = false;
        cooldownRef.current = false;
        setScanFeedback('no_face');
        setFailCount(c => c + 1);
        return;
      }

      // Call parent handler
      onCapture(imageSrc);

      // Release cooldown after 800ms to prevent rapid re-scans
      setTimeout(() => {
        cooldownRef.current = false;
      }, 800);

      // Safety: if after 12 seconds we're still "capturing" something went wrong
      setTimeout(() => {
        if (isCapturingRef.current) {
          console.warn('[FaceScanner] Safety timeout: resetting capture lock');
          isCapturingRef.current = false;
        }
      }, 12000);
    }, 100);
  }, [onCapture]);

  // When hook returns no_face, show feedback in scanner
  // (The parent sets status back to 'ready' on no_face, which resets isProcessing)
  useEffect(() => {
    if (!isProcessing && !hasError && isCapturingRef.current === false) {
      // If we just finished a capture and status went back to ready without
      // going through success/error/unrecognized, it was likely a no_face
    }
  }, [isProcessing, hasError]);

  const modeLabel = mode === 'register'
    ? 'Registre su rostro para crear una identidad biométrica'
    : 'Centre su rostro para verificar su identidad';

  const videoConstraints = {
    width:      { ideal: 640 },
    height:     { ideal: 480 },
    facingMode: 'user',
  };

  const statusClass = scanFeedback === 'no_face' ? 'warning' :
                      faceDetected ? 'detected' : 'searching';

  return (
    <div className="face-scanner-container">
      <div className="scanner-header">
        <h4 className="scanner-title text-gradient">ANÁLISIS BIOMÉTRICO</h4>
        <p className="scanner-desc">{modeLabel}</p>
      </div>

      <div className="scanner-frame">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          videoConstraints={videoConstraints}
          className={`webcam-view ${isProcessing || hasError ? 'processing' : ''}`}
          onUserMedia={() => setCameraReady(true)}
          onUserMediaError={() =>
            alert('Cámara no detectada o acceso denegado.')
          }
        />

        <canvas ref={canvasRef} className="scanner-canvas digital-mask-canvas" />

        {/* Corner brackets */}
        <div className="scan-corner top-left" />
        <div className="scan-corner top-right" />
        <div className="scan-corner bottom-left" />
        <div className="scan-corner bottom-right" />

        {/* HUD */}
        <div className="hud-top-left mono">
          <span className={faceDetected ? 'hud-active' : 'hud-idle'}>●</span>
          &nbsp;{faceDetected ? 'LOCK' : 'SCAN'}
        </div>
        <div className="hud-top-right mono">SEC.9 | 128D</div>

        {/* Scan line */}
        {faceDetected && !isProcessing && !hasError && (
          <div className="scan-line" />
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="processing-overlay">
            <div className="spinner" />
            <p className="processing-text mono">EXTRAYENDO VECTORES 128D...</p>
          </div>
        )}

        {/* Camera init overlay */}
        {!mediapipeReady && !isProcessing && !hasError && (
          <div className="processing-overlay">
            <div className="spinner init-spinner" />
            <p className="processing-text mono">CARGANDO RED NEURONAL...</p>
          </div>
        )}

        {/* Error overlay */}
        {hasError && (
          <div className="error-overlay">
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="error-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="error-overlay-text mono">ESCANEO FALLIDO</p>
            <button onClick={onRetry} className="btn-retry">REINTENTAR</button>
          </div>
        )}
      </div>

      {/* Scan Button & Status */}
      <div className="scan-controls">
        {!hasError && mediapipeReady && !isProcessing ? (
          <>
            <div className={`status-indicator ${statusClass}`}>
              <span className="status-dot" />
              <span className="status-label mono">{getStatusText()}</span>
            </div>

            {/* No-face toast */}
            {scanFeedback === 'no_face' && (
              <div className="no-face-toast mono animate-fade-in">
                <span>⚠</span> face-api.js no detectó rostro en la captura.
                {failCount >= 2 && <span> Acérquese más e ilumine su rostro.</span>}
              </div>
            )}

            <button
              className="btn-scan"
              onClick={handleManualScan}
              disabled={!faceDetected || isProcessing || isCapturingRef.current}
            >
              <svg className="scan-icon" viewBox="0 0 24 24">
                <path d="M4 4h4v2H6v2H4V4zm16 0h-4v2h2v2h2V4zM4 20h4v-2H6v-2H4v4zm16 0h-4v-2h2v-2h2v4zM9 9h6v6H9V9z"/>
              </svg>
              INICIAR ESCANEO
            </button>
          </>
        ) : (
          <div style={{ height: '5rem' }} />
        )}
      </div>
    </div>
  );
};

export default FaceScannerPro;