import React, { useState } from 'react';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';

interface AuthViewProps {
  onLoginSuccess?: (user: { name: string; email: string; role: 'Owner' | 'Admin' | 'Editor' | 'Viewer' }) => void;
  onBackToLanding?: () => void;
  isDarkMode?: boolean;
  accentClass?: string;
  members?: any[];
}

export default function AuthView({}: AuthViewProps) {
  const [screen, setScreen] = useState<'signin' | 'signup' | 'forgot'>('signin');

  if (screen === 'signup') {
    return <Register />;
  }

  if (screen === 'forgot') {
    return <ForgotPassword />;
  }

  return <Login />;
}
