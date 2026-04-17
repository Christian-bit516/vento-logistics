import React, { useState } from 'react';
import FaceScanner from './FaceScanner';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

const LoginForm = () => {
  const [loginMethod, setLoginMethod] = useState('biometric'); // 'biometric' | 'password'
  const { verifyFace, isLoading, error, isAuthenticated } = useBiometricAuth();

  const handleFaceCapture = async (imageSrc) => {
    const success = await verifyFace(imageSrc);
    if (success) {
      console.log('¡Acceso concedido! Redirigiendo...');
      // Aquí usarías useNavigate() de react-router-dom para ir al Dashboard
    }
  };

  if (isAuthenticated) {
    return (
      <div className="p-6 bg-green-100 text-green-800 rounded-lg text-center font-bold">
        Autenticación exitosa. Cargando entorno de trabajo...
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Plataforma Logística</h2>
        <p className="text-gray-500 mt-2">Ingresa a tu cuenta para continuar</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {loginMethod === 'biometric' ? (
        <div className="space-y-4">
          {isLoading ? (
             <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-lg">
               <span className="text-blue-600 font-semibold animate-pulse">Analizando biometría...</span>
             </div>
          ) : (
            <FaceScanner onCapture={handleFaceCapture} />
          )}
          
          <button 
            onClick={() => setLoginMethod('password')}
            className="w-full text-sm text-gray-500 hover:text-blue-600 transition"
          >
            ¿Problemas con la cámara? Usar contraseña
          </button>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
            <input type="email" className="mt-1 w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="usuario@correo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input type="password" className="mt-1 w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 transition">
            Ingresar
          </button>
          <button 
            type="button"
            onClick={() => setLoginMethod('biometric')}
            className="w-full text-sm text-blue-600 hover:text-blue-800 transition"
          >
            Volver al escáner facial
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginForm;