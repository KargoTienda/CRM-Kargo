import React, { useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { XMarkIcon } from '@heroicons/react/24/outline';

/* Particles generated once */
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 83) % 90}%`,
  delay: `${(i * 1.9) % 12}s`,
  duration: `${10 + (i * 2.1) % 14}s`,
  drift: `${(i % 2 === 0 ? '' : '-')}${10 + (i * 11) % 30}px`,
}));

const AnimatedBackground: React.FC = () => (
  <div className="bg-animated">
    <div className="bg-aurora" />
    <div className="orb orb-1" />
    <div className="orb orb-2" />
    <div className="orb orb-3" />
    <div className="orb orb-4" />
    <div className="bg-mesh" />
    {PARTICLES.map(p => (
      <div
        key={p.id}
        className="particle"
        style={{
          left: p.left,
          animationDuration: p.duration,
          animationDelay: p.delay,
          ['--drift' as any]: p.drift,
        }}
      />
    ))}
  </div>
);

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen relative" style={{ background: '#000d1a' }}>
      {/* Full-screen animated background */}
      <AnimatedBackground />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 h-full z-10">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 relative z-10">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="relative z-10 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
