import React from 'react';
import AdvancedLoginForm from '../features/auth/components/AdvancedLoginForm';

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 relative">
      {/* Malla de fondo estilo Cyber/Matrix */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
      
      <AdvancedLoginForm />
      
      <p className="mt-12 text-xs text-gray-600 font-mono z-10">
        © {new Date().getFullYear()} VENTO SOFTWARE DEVELOPMENT. VERSIÓN DEL NÚCLEO: 2.1.0
      </p>
    </div>
  );
};

export default Login;