import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-gray-600 opacity-75" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 bg-white h-full">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />
        
        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none" style={{ backgroundColor: '#F7F6F1' }}>
          {/* Fondo animado sutil */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ left: 256 }}>
            <div style={{
              position: 'absolute', top: '-20%', right: '-10%',
              width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,64,133,0.04) 0%, transparent 70%)',
              animation: 'bgBlob1 20s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', bottom: '-10%', left: '10%',
              width: 400, height: 400, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(169,194,217,0.06) 0%, transparent 70%)',
              animation: 'bgBlob2 25s ease-in-out infinite',
            }} />
          </div>
          <div className="relative z-10 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
          <style>{`
            @keyframes bgBlob1 {
              0%,100% { transform: translate(0,0) scale(1); }
              50% { transform: translate(-30px, 20px) scale(1.1); }
            }
            @keyframes bgBlob2 {
              0%,100% { transform: translate(0,0) scale(1); }
              50% { transform: translate(20px, -30px) scale(1.08); }
            }
          `}</style>
        </main>
      </div>
    </div>
  );
};

export default Layout;