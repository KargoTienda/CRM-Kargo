import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMensajes } from '../../contexts/MensajesContext';
import {
  HomeIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard',    href: '/dashboard',    icon: HomeIcon },
  { name: 'Catálogo',     href: '/catalogo',     icon: ArchiveBoxIcon },
  { name: 'Finanzas',     href: '/finanzas',     icon: BanknotesIcon },
  { name: 'MercadoLibre', href: '/mercadolibre', icon: ShoppingBagIcon },
  { name: 'Instagram',    href: '/instagram',    icon: ChartBarIcon },
  { name: 'Flex',         href: '/flex',         icon: TruckIcon },
  { name: 'Mensajes',     href: '/mensajes',     icon: ChatBubbleLeftRightIcon },
];

/* Mini floating particles inside the sidebar */
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: `${Math.round(10 + (i * 73) % 80)}%`,
  delay: `${(i * 1.3) % 8}s`,
  duration: `${8 + (i * 1.7) % 10}s`,
  drift: `${(i % 2 === 0 ? '' : '-')}${8 + (i * 7) % 18}px`,
}));

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { pendientes } = useMensajes();

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
  };

  return (
    <div
      className="flex flex-col w-64 h-full relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #000d1a 0%, #001428 50%, #001a38 100%)',
        borderRight: '1px solid rgba(0,102,204,0.2)',
      }}
    >
      {/* Aurora background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 120% 50% at 50% 0%, rgba(0,64,133,0.5) 0%, transparent 60%),
          radial-gradient(ellipse 80% 40% at 20% 100%, rgba(0,102,204,0.3) 0%, transparent 60%)
        `,
      }} />

      {/* Floating particles */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            bottom: '-4px',
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: 'rgba(169,194,217,0.6)',
            animationName: 'particleDrift',
            animationDuration: p.duration,
            animationDelay: p.delay,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            ['--drift' as any]: p.drift,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Logo */}
      <div className="relative flex items-center h-16 px-5" style={{ borderBottom: '1px solid rgba(0,102,204,0.2)' }}>
        <div className="flex items-center space-x-3">
          {/* Glowing K logo */}
          <div className="relative animate-pulseGlow" style={{ borderRadius: 10 }}>
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="18" fill="url(#logoGrad)" />
              <rect x="20" y="14" width="18" height="72" rx="3" fill="white"/>
              <path d="M38 50 L74 14 L96 14 L56 50Z" fill="white"/>
              <path d="M38 50 L74 86 L96 86 L56 50Z" fill="rgba(169,194,217,0.85)"/>
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#004085"/>
                  <stop offset="100%" stopColor="#0066cc"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-widest leading-none text-gradient">KARGO</h1>
            <p className="text-xs tracking-widest" style={{ color: 'rgba(169,194,217,0.7)' }}>CRM</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-3 py-4 space-y-1">
        {navigation.map((item, idx) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-250 group relative overflow-hidden animate-fadeInLeft`
              + (isActive ? ' nav-active text-white' : ' text-blue-200 hover:text-white')
            }
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            {({ isActive }) => (
              <>
                {/* Shimmer on active */}
                {isActive && (
                  <div className="absolute inset-0 shimmer opacity-40 pointer-events-none rounded-xl" />
                )}
                <item.icon
                  className="mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ color: isActive ? 'white' : 'rgba(169,194,217,0.7)' }}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
                {item.href === '/mensajes' && pendientes > 0 && (
                  <span
                    className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold animate-pulseGlow"
                    style={{ backgroundColor: '#D35400', color: 'white', fontSize: 9 }}
                  >
                    {pendientes > 9 ? '9+' : pendientes}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3" style={{ borderTop: '1px solid rgba(0,102,204,0.18)' }} />

      {/* Settings + Logout */}
      <div className="relative px-3 py-3 space-y-1">
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            `flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group`
            + (isActive ? ' nav-active text-white' : ' text-blue-200 hover:text-white hover:bg-white hover:bg-opacity-5')
          }
        >
          {({ isActive }) => (
            <>
              <Cog6ToothIcon
                className="mr-3 h-5 w-5 transition-transform duration-500 group-hover:rotate-90"
                style={{ color: isActive ? 'white' : 'rgba(169,194,217,0.7)' }}
                aria-hidden="true"
              />
              Configuración
            </>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-xl text-blue-200 hover:text-red-300 transition-all duration-200 group"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>

      {/* User card */}
      <div className="relative px-3 pb-4">
        <div
          className="glass flex items-center space-x-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,102,204,0.2)' }}
        >
          <div
            className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm text-white"
            style={{
              background: user?.avatar ? 'transparent' : `linear-gradient(135deg, ${user?.color || '#D35400'}, #FF6B35)`,
              boxShadow: '0 0 12px rgba(211,84,0,0.4)',
            }}
          >
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="h-full w-full object-cover" />
              : (user?.displayName || user?.username || 'K').charAt(0).toUpperCase()
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.displayName || user?.username || 'Usuario'}
            </p>
            <p className="text-xs truncate" style={{ color: 'rgba(169,194,217,0.6)' }}>Kargo CRM</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
