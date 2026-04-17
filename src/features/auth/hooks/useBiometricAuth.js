import { useState, useCallback } from 'react';

export const useBiometricAuth = () => {
  const [authState, setAuthState] = useState({
    status: 'idle', // idle, scanning, processing, success, error
    errorMsg: null,
    confidenceScore: 0,
  });

  const startScanning = () => setAuthState({ status: 'scanning', errorMsg: null, confidenceScore: 0 });
  const cancelScanning = () => setAuthState({ status: 'idle', errorMsg: null, confidenceScore: 0 });

  const processBiometrics = useCallback(async (base64Image) => {
    setAuthState(prev => ({ ...prev, status: 'processing' }));

    try {
      // 1. Simulación de envío del payload pesado al motor de IA
      const payloadSize = Math.round((base64Image.length * 3) / 4 / 1024); // Tamaño en KB
      console.info(`[Vento Auth] Transmitiendo vector facial: ${payloadSize}KB`);

      await new Promise(resolve => setTimeout(resolve, 2500)); // Latencia de red
      
      // 2. Simulación de cruce de base de datos y validación de Liveness
      const randomConfidence = Math.floor(Math.random() * (99 - 85 + 1) + 85); 
      
      if (randomConfidence > 88) {
        setAuthState({ status: 'success', errorMsg: null, confidenceScore: randomConfidence });
        return true;
      } else {
        throw new Error(`Nivel de coincidencia insuficiente (${randomConfidence}%). Intente nuevamente.`);
      }
    } catch (err) {
      setAuthState({ 
        status: 'error', 
        errorMsg: err.message || 'El motor de IA rechazó la captura biométrica.',
        confidenceScore: 0 
      });
      return false;
    }
  }, []);

  return { 
    ...authState, 
    startScanning, 
    cancelScanning, 
    processBiometrics 
  };
};