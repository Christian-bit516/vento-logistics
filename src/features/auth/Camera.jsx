// src/components/auth/Camera.jsx
import React, { useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const Camera = ({ videoRef, canvasRef, faceMatch }) => {
  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoRef]);

  const drawFaceBox = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const displaySize = { width: 640, height: 480 };
    
    faceapi.matchDimensions(canvas, displaySize);
    
    const detections = await faceapi
      .detectAllFaces(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    resizedDetections.forEach(detection => {
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        boxColor: faceMatch === true ? '#10b981' : faceMatch === false ? '#ef4444' : '#3b82f6'
      });
      drawBox.draw(canvas);
    });
  }, [videoRef, canvasRef, faceMatch]);

  useEffect(() => {
    const interval = setInterval(drawFaceBox, 100);
    return () => clearInterval(interval);
  }, [drawFaceBox]);

  return (
    <div className="camera-container">
      <video 
        ref={videoRef}
        autoPlay 
        muted 
        playsInline 
        className="video-feed"
      />
      <canvas 
        ref={canvasRef}
        className="detection-canvas"
      />
    </div>
  );
};

export default Camera;