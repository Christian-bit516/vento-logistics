import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import './FaceScannerPro.css';

/**
 * FaceScannerPro
 *
 * CRITICAL FIX: isProcessing and hasError are read inside a MediaPipe closure
 * that is only registered once. We keep refs in sync with props so the closure
 * always sees the latest values (avoids stale-closure double-capture bug).
 */
const FaceScannerPro = ({ onCapture, isProcessing, hasError, onRetry, mode }) => {
  const webcamRef        = useRef(null);
  const canvasRef        = useRef(null);
  const progressRef      = useRef(0);
  const isCapturingRef   = useRef(false);
  const cameraRef        = useRef(null);
  const faceMeshRef      = useRef(null);

  // ── Refs that mirror props for stale-closure-safe reads ──────────────────
  const isProcessingRef  = useRef(isProcessing);
  const hasErrorRef      = useRef(hasError);
  const onCaptureRef     = useRef(onCapture);

  // Keep refs in sync on every render
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { hasErrorRef.current     = hasError;      }, [hasError]);
  useEffect(() => { onCaptureRef.current    = onCapture;     }, [onCapture]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [scanProgress,   setScanProgress]   = useState(0);
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [faceDetected,   setFaceDetected]   = useState(false);

  // Reset progress when processing finishes (status went back to 'ready')
  useEffect(() => {
    if (!isProcessing && !hasError) {
      isCapturingRef.current = false;
      progressRef.current    = 0;
      setScanProgress(0);
    }
  }, [isProcessing, hasError]);

  // ── MediaPipe pipeline (mounts once, reads state via refs) ────────────────
  useEffect(() => {
    let mounted    = true;
    let retryTimer = null;

    const startPipeline = () => {
      if (!mounted) return;

      const videoEl = webcamRef.current?.video;
      if (!videoEl || !window.FaceMesh || !window.Camera) {
        retryTimer = setTimeout(startPipeline, 500);
        return;
      }

      // Tear down any previous instance
      try { cameraRef.current?.stop();  } catch (_) {}
      try { faceMeshRef.current?.close(); } catch (_) {}

      const faceMesh = new window.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces:            1,
        refineLandmarks:        true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
      });

      faceMesh.onResults((results) => {
        if (!mounted) return;
        if (!canvasRef.current || !webcamRef.current?.video) return;

        // ── Draw mesh ────────────────────────────────────────────────────────
        const vw = webcamRef.current.video.videoWidth;
        const vh = webcamRef.current.video.videoHeight;
        canvasRef.current.width  = vw;
        canvasRef.current.height = vh;

        const ctx = canvasRef.current.getContext('2d');
        ctx.save();
        ctx.clearRect(0, 0, vw, vh);

        const hasFace = (results.multiFaceLandmarks?.length ?? 0) > 0;
        setFaceDetected(hasFace);

        if (hasFace) {
          if (!mediapipeReady) setMediapipeReady(true);

          for (const landmarks of results.multiFaceLandmarks) {
            window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
              color:     'rgba(34, 211, 238, 0.45)',
              lineWidth: 0.7,
            });
            window.drawConnectors(ctx, landmarks, window.FACEMESH_FACE_OVAL, {
              color:     'rgba(14, 165, 233, 0.9)',
              lineWidth: 1.5,
            });
          }

          // ── Auto-capture logic (reads state via REFS — no stale closure) ──
          const processing = isProcessingRef.current;
          const errored    = hasErrorRef.current;

          if (!isCapturingRef.current && !processing && !errored) {
            progressRef.current = Math.min(100, progressRef.current + 2.5);
            setScanProgress(progressRef.current);

            if (progressRef.current >= 100) {
              isCapturingRef.current = true; // gate: fires only once per cycle

              const imageSrc = webcamRef.current?.getScreenshot();
              if (imageSrc) {
                onCaptureRef.current(imageSrc); // call latest onCapture via ref
              }
            }
          }
        } else {
          // Decay when face is lost
          const processing = isProcessingRef.current;
          if (!isCapturingRef.current && !processing) {
            progressRef.current = Math.max(0, progressRef.current - 4);
            setScanProgress(progressRef.current);
          }
          setMediapipeReady(true); // pipeline works even without a face
        }

        ctx.restore();
      });

      faceMeshRef.current = faceMesh;

      const camera = new window.Camera(videoEl, {
        onFrame: async () => {
          if (faceMeshRef.current && webcamRef.current?.video) {
            await faceMeshRef.current.send({ image: webcamRef.current.video });
          }
        },
        width:  1280,
        height: 720,
      });

      cameraRef.current = camera;
      camera.start();
    };

    startPipeline();

    return () => {
      mounted = false;
      clearTimeout(retryTimer);
      try { cameraRef.current?.stop();   } catch (_) {}
      try { faceMeshRef.current?.close(); } catch (_) {}
    };
  // Intentionally empty deps — pipeline starts once and reads live state via refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getStatusText = () => {
    if (!mediapipeReady)    return 'Inicializando cámara...';
    if (isProcessing)       return 'Analizando biometría...';
    if (!faceDetected)      return 'Rostro no detectado — acérquese a la cámara';
    if (scanProgress < 100) return `Escaneando rostro...`;
    return 'Captura completada ✓';
  };

  const getStatusColor = () => {
    if (!faceDetected && mediapipeReady) return 'var(--danger)';
    if (scanProgress >= 100)             return 'var(--accent)';
    return 'var(--secondary)';
  };

  const modeLabel = mode === 'register'
    ? 'Registre su rostro para crear una identidad biométrica'
    : 'Centre su rostro para verificar su identidad';

  const videoConstraints = {
    width:      { min: 640, ideal: 1280 },
    height:     { min: 480, ideal: 720  },
    facingMode: 'user',
  };

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
          screenshotFormat="image/webp"
          screenshotQuality={0.92}
          videoConstraints={videoConstraints}
          className={`webcam-view ${isProcessing || hasError ? 'processing' : ''}`}
          onUserMediaError={() =>
            alert('Cámara no detectada o acceso denegado. Verifique los permisos del navegador.')
          }
        />

        {/* Mesh canvas */}
        <canvas ref={canvasRef} className="scanner-canvas digital-mask-canvas" />

        {/* Corner frame decorations */}
        <div className="scan-corner top-left"     />
        <div className="scan-corner top-right"    />
        <div className="scan-corner bottom-left"  />
        <div className="scan-corner bottom-right" />

        {/* Animated scan line — only when face is visible and idle */}
        {faceDetected && !isProcessing && !hasError && scanProgress < 100 && (
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

        {/* Error overlay (terminal errors only — shown by parent) */}
        {hasError && (
          <div className="error-overlay">
            <svg
              width="40" height="40"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              className="error-icon"
            >
              <path
                strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="error-overlay-text mono">ESCANEO FALLIDO</p>
            <button onClick={onRetry} className="btn-retry">REINTENTAR</button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="scan-status-container">
        {!hasError && mediapipeReady && !isProcessing ? (
          <>
            <div className="status-text mono" style={{ color: getStatusColor() }}>
              <span>{getStatusText()}</span>
              <span style={{ float: 'right', color: 'var(--text-primary)' }}>
                {Math.round(scanProgress)}%
              </span>
            </div>
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${scanProgress}%`,
                  background:
                    scanProgress >= 100
                      ? 'var(--accent)'
                      : 'linear-gradient(to right, var(--primary), var(--secondary))',
                }}
              />
            </div>
          </>
        ) : (
          <div className="status-placeholder" />
        )}
      </div>
    </div>
  );
};

export default FaceScannerPro;