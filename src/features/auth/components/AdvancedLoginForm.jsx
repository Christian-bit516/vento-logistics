import React, { useState } from 'react';
import FaceScannerPro from './FaceScannerPro';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

const AdvancedLoginForm = () => {
  const [view, setView] = useState('selector'); // selector, biometric, credentials
  const { status, errorMsg, confidenceScore, processBiometrics, startScanning, cancelScanning } = useBiometricAuth();

  const handleCapture = async (base64) => {
    const success = await processBiometrics(base64);
    if (success) {
      setTimeout(() => {
        console.log('[Sistema] Redirigiendo al Socket del Chat P2P...');
        // window.location.href = '/dashboard';
      }, 1500);
    }
  };

  const renderSuccess = () => (
    <div className="flex flex-col items-center p-8 space-y-4 animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
        <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <h3 className="text-xl font-bold text-green-400 font-mono">ACCESO CONCEDIDO</h3>
      <p className="text-gray-400 text-sm">Match biométrico: <span className="text-green-400">{confidenceScore}%</span></p>
    </div>
  );

  return (
    <div className="w-full max-w-lg mx-auto bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
      {/* Efecto de luz de fondo */}
      <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight">
            VENTO <span className="font-light text-white">ID</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest">Protocolo de Seguridad P2P</p>
        </div>

        {status === 'success' ? (
          renderSuccess()
        ) : (
          <div className="space-y-6">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm font-mono animate-pulse">
                [ERR] {errorMsg}
              </div>
            )}

            {view === 'selector' && (
              <div className="grid gap-4">
                <button onClick={() => { setView('biometric'); startScanning(); }} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 hover:border-cyan-500 rounded-xl group transition-all">
                  <span className="text-gray-300 font-medium group-hover:text-cyan-400">Reconocimiento Facial IA</span>
                  <span className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:shadow-[0_0_10px_rgba(0,255,255,0.5)]">👁</span>
                </button>
                <button onClick={() => setView('credentials')} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 hover:border-blue-500 rounded-xl group transition-all">
                  <span className="text-gray-300 font-medium group-hover:text-blue-400">Credenciales Clásicas</span>
                  <span className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">⌨</span>
                </button>
              </div>
            )}

            {view === 'biometric' && (
              <div className="animate-in fade-in duration-300">
                <FaceScannerPro onCapture={handleCapture} isProcessing={status === 'processing'} />
                <button onClick={() => { setView('selector'); cancelScanning(); }} className="w-full mt-6 text-sm text-gray-500 hover:text-white transition-colors">
                  ← Volver a métodos de acceso
                </button>
              </div>
            )}

            {view === 'credentials' && (
              <form className="space-y-5 animate-in slide-in-from-right-4 duration-300" onSubmit={e => e.preventDefault()}>
                <div>
                  <input type="email" placeholder="ID de Usuario / Email" className="w-full bg-gray-950 border border-gray-800 text-gray-200 p-4 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />
                </div>
                <div>
                  <input type="password" placeholder="Clave de Acceso" className="w-full bg-gray-950 border border-gray-800 text-gray-200 p-4 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />
                </div>
                <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all">
                  INICIAR SESIÓN
                </button>
                <button type="button" onClick={() => setView('selector')} className="w-full text-sm text-gray-500 hover:text-white transition-colors">
                  ← Volver a métodos de acceso
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedLoginForm;