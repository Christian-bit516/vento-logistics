import React, { useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';

const FaceScannerPro = ({ onCapture, isProcessing }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const videoConstraints = {
    width: { min: 640, ideal: 1280 },
    height: { min: 480, ideal: 720 },
    facingMode: "user",
  };

  // Dibujo del láser estilo "Escaneo Neón"
  const drawScanningEffect = useCallback(() => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let yPos = 0;
    let direction = 1;

    const renderLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Malla de enfoque biométrico
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 120, 0, 2 * Math.PI);
      ctx.stroke();

      // Láser dinámico neón
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff';
      ctx.fillRect(0, yPos, canvas.width, 3);
      
      yPos += 4 * direction;
      if (yPos > canvas.height || yPos < 0) direction *= -1;

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }, []);

  useEffect(() => {
    drawScanningEffect();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [drawScanningEffect]);

  const executeCapture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) onCapture(imageSrc);
  }, [onCapture]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.2)] border border-cyan-500/30 bg-gray-900 group">
        
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/webp"
          screenshotQuality={0.92}
          videoConstraints={videoConstraints}
          className={`w-full h-auto object-cover transition-opacity duration-500 ${isProcessing ? 'opacity-40 grayscale' : 'opacity-100'}`}
          onUserMediaError={() => alert("Hardware de cámara no detectado o denegado.")}
        />
        
        {/* Capa Canvas para la interpolación visual */}
        {!isProcessing && (
          <canvas
            ref={canvasRef}
            width={384}
            height={288}
            className="absolute top-0 left-0 w-full h-full pointer-events-none mix-blend-screen"
          />
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,255,0.5)]"></div>
            <p className="mt-4 text-cyan-400 font-mono text-sm tracking-widest animate-pulse">EXTRAYENDO VECTORES...</p>
          </div>
        )}
      </div>

      <button 
        onClick={executeCapture}
        disabled={isProcessing}
        className="mt-8 relative group overflow-hidden px-8 py-3 rounded-full bg-transparent border border-cyan-500 text-cyan-400 font-bold tracking-wider transition-all hover:bg-cyan-500/10 hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="relative z-10">{isProcessing ? 'SISTEMA OCUPADO' : 'INICIAR AUTENTICACIÓN'}</span>
      </button>
    </div>
  );
};

export default FaceScannerPro;