import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const schema = yup.object({
  username: yup.string().required('El usuario es requerido'),
  password: yup.string().required('La contraseña es requerida'),
});

interface FormData {
  username: string;
  password: string;
}

const KargoLogo: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="18" y="12" width="22" height="76" rx="4" fill="#004085" />
    <path d="M40 50 L78 12 L100 12 L58 50Z" fill="#004085" />
    <path d="M40 50 L78 88 L100 88 L58 50Z" fill="#A9C2D9" />
  </svg>
);

// Partículas flotantes tipo luz en el agua
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 5.5) % 90}%`,
  size: 3 + (i % 4),
  duration: 6 + (i % 7),
  delay: -(i * 1.1),
  opacity: 0.15 + (i % 5) * 0.07,
}));

const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      await login(data.username, data.password);
      toast.success('Bienvenido a Kargo');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">

      {/* ══════════════════════════════════════════
          FONDO: cielo → mar animado
      ══════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #87CEEB 0%, #5BA3D9 18%, #2E7CB8 35%, #1a5f94 52%, #0d4070 68%, #004085 82%, #002a5c 100%)',
        }}
      >
        {/* Sol / reflejo de luz en el horizonte */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,220,120,0.35) 0%, rgba(255,180,60,0.12) 45%, transparent 70%)',
          animation: 'sunPulse 6s ease-in-out infinite',
        }} />

        {/* Reflejo del sol en el agua */}
        <div style={{
          position: 'absolute',
          top: '38%',
          left: '40%',
          width: 220,
          height: 60,
          background: 'radial-gradient(ellipse, rgba(255,220,120,0.18) 0%, transparent 70%)',
          animation: 'shimmer 4s ease-in-out infinite',
          borderRadius: '50%',
        }} />

        {/* Partículas: espuma / luz en el agua */}
        {PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute',
            bottom: '-10px',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: 'rgba(169,194,217,0.8)',
            opacity: p.opacity,
            animation: `floatUp ${p.duration}s ease-in infinite`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}

        {/* ── OLAS: 3 capas ── */}

        {/* Ola de fondo (más lenta, más opaca) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 220,
          overflow: 'hidden',
        }}>
          <svg viewBox="0 0 1440 220" preserveAspectRatio="none"
            style={{ width: '200%', height: '100%', animation: 'wave1 14s linear infinite' }}>
            <path d="M0,80 C180,140 360,20 540,80 C720,140 900,20 1080,80 C1260,140 1440,20 1440,80 L1440,220 L0,220 Z"
              fill="rgba(0,64,133,0.5)" />
          </svg>
        </div>

        {/* Ola media */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 160,
          overflow: 'hidden',
        }}>
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none"
            style={{ width: '200%', height: '100%', animation: 'wave2 10s linear infinite' }}>
            <path d="M0,60 C200,110 400,10 600,60 C800,110 1000,10 1200,60 C1350,95 1440,40 1440,60 L1440,160 L0,160 Z"
              fill="rgba(0,42,92,0.65)" />
          </svg>
        </div>

        {/* Ola delantera (más rápida, más oscura) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          overflow: 'hidden',
        }}>
          <svg viewBox="0 0 1440 100" preserveAspectRatio="none"
            style={{ width: '200%', height: '100%', animation: 'wave3 7s linear infinite reverse' }}>
            <path d="M0,40 C160,70 320,10 480,40 C640,70 800,10 960,40 C1120,70 1280,10 1440,40 L1440,100 L0,100 Z"
              fill="rgba(0,26,63,0.85)" />
          </svg>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PANEL IZQUIERDO — branding (desktop)
      ══════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative z-10"
        style={{
          transition: 'opacity 1s ease, transform 1s ease',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-40px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <KargoLogo size={46} />
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest drop-shadow-lg">KARGO</h1>
            <p className="text-xs tracking-widest" style={{ color: '#A9C2D9' }}>CRM</p>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#A9C2D9', border: '1px solid rgba(255,255,255,0.2)' }}>
            ✦ Marroquinería · MercadoLibre
          </div>
          <h2 className="text-5xl font-black text-white leading-tight mb-5 drop-shadow-lg">
            Vendé más.<br />
            <span style={{ color: '#A9C2D9' }}>Gestioná</span><br />
            mejor.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Stock, finanzas, mensajes de ML<br />
            e Instagram — todo en un lugar.
          </p>
        </div>

        {/* Píldoras de módulos */}
        <div className="flex flex-wrap gap-2">
          {['MercadoLibre', 'Instagram', 'Finanzas', 'IA'].map(m => (
            <span key={m} className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CARD LOGIN — glassmorphism
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div
          className="w-full max-w-sm rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            transition: 'opacity 1s ease 0.25s, transform 1s ease 0.25s',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(40px)',
          }}
        >
          {/* Mobile logo */}
          <div className="flex items-center space-x-2 mb-8 lg:hidden">
            <KargoLogo size={34} />
            <span className="text-xl font-black text-white tracking-widest">KARGO</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white mb-1">Iniciar sesión</h2>
            <p className="text-sm" style={{ color: 'rgba(169,194,217,0.75)' }}>
              Ingresá tus datos para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-white">Usuario</label>
              <input
                {...register('username')}
                type="text"
                autoComplete="username"
                placeholder="Tu usuario"
                className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: errors.username ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.18)',
                  color: 'white',
                }}
              />
              {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-white">Contraseña</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: errors.password ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.18)',
                    color: 'white',
                  }}
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword
                    ? <EyeSlashIcon className="h-4 w-4" style={{ color: 'rgba(169,194,217,0.7)' }} />
                    : <EyeIcon className="h-4 w-4" style={{ color: 'rgba(169,194,217,0.7)' }} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 mt-2"
              style={{
                background: 'linear-gradient(135deg, #004085 0%, #0052a8 100%)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 4px 20px rgba(0,64,133,0.5)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Ingresando...</span>
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-xs text-center" style={{ color: 'rgba(169,194,217,0.35)' }}>
            Kargo CRM &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          KEYFRAMES
      ══════════════════════════════════════════ */}
      <style>{`
        @keyframes wave1 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave2 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave3 {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-85vh) scale(0.4); opacity: 0; }
        }
        @keyframes sunPulse {
          0%, 100% { transform: translateX(-50%) scale(1);    opacity: 1; }
          50%       { transform: translateX(-50%) scale(1.12); opacity: 0.8; }
        }
        @keyframes shimmer {
          0%, 100% { transform: translateX(0) scaleX(1);   opacity: 0.7; }
          50%       { transform: translateX(20px) scaleX(1.3); opacity: 1; }
        }
        input::placeholder { color: rgba(169,194,217,0.45); }
      `}</style>
    </div>
  );
};

export default LoginForm;
