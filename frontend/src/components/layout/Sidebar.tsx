import React from 'react';
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
  badge?: string;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Catálogo', href: '/catalogo', icon: ArchiveBoxIcon },
  { name: 'Finanzas', href: '/finanzas', icon: BanknotesIcon },
  { name: 'MercadoLibre', href: '/mercadolibre', icon: ShoppingBagIcon },
  { name: 'Instagram', href: '/instagram', icon: ChartBarIcon },
  { name: 'Flex', href: '/flex', icon: TruckIcon },
  { name: 'Mensajes', href: '/mensajes', icon: ChatBubbleLeftRightIcon },
];

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { pendientes } = useMensajes();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex flex-col w-64 h-full" style={{ backgroundColor: '#004085' }}>
      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-blue-800">
        <div className="flex items-center space-x-2.5">
          {/* K logo — fiel al original */}
          <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="18" y="12" width="22" height="76" rx="4" fill="white"/>
            <path d="M40 50 L78 12 L100 12 L58 50Z" fill="white"/>
            <path d="M40 50 L78 88 L100 88 L58 50Z" fill="#A9C2D9"/>
          </svg>
          <div>
            <h1 className="text-lg font-black text-white tracking-widest leading-none">KARGO</h1>
            <p className="text-xs tracking-widest" style={{ color: '#A9C2D9' }}>CRM</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-white bg-white bg-opacity-20 border border-white border-opacity-20'
                : 'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors duration-150'
            }
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {item.name}
            {item.href === '/mensajes' && pendientes > 0 && (
              <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#D35400', color: 'white' }}>
                {pendientes > 9 ? '9+' : pendientes}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-blue-800" />

      {/* Settings + User */}
      <div className="px-3 py-4 space-y-1">
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            isActive
              ? 'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-white bg-white bg-opacity-20'
              : 'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-blue-100 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors duration-150'
          }
        >
          <Cog6ToothIcon className="mr-3 h-5 w-5" aria-hidden="true" />
          Configuración
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg text-blue-100 hover:bg-red-500 hover:bg-opacity-20 hover:text-red-300 transition-colors duration-150"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>

      {/* User info */}
      <div className="px-3 pb-4">
        <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white bg-opacity-10">
          <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: '#D35400' }}>
            {user?.username?.charAt(0).toUpperCase() || 'K'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.username || 'Usuario'}
            </p>
            <p className="text-xs truncate" style={{ color: '#A9C2D9' }}>
              Kargo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
