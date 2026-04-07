import React, { useState, useRef } from 'react';
import { CameraIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const COLORES = [
  '#004085', '#D35400', '#16a34a', '#7c3aed', '#db2777',
  '#0891b2', '#b45309', '#1d4ed8', '#be123c', '#374151',
];

const Configuracion: React.FC = () => {
  const { user, updatePerfil } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [color, setColor] = useState(user?.color || '#004085');
  const [guardando, setGuardando] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGuardar = async () => {
    if (!displayName.trim()) { toast.error('El nombre no puede estar vacío'); return; }
    setGuardando(true);
    try {
      await updatePerfil(displayName.trim(), avatar, color);
      toast.success('Perfil actualizado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#004085' }}>Configuración de perfil</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div
              className="h-24 w-24 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold cursor-pointer hover:opacity-90 transition-opacity"
              style={{ backgroundColor: avatar ? 'transparent' : color }}
              onClick={() => imgRef.current?.click()}
            >
              {avatar
                ? <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
                : (displayName.charAt(0) || user?.username?.charAt(0) || '?').toUpperCase()
              }
            </div>
            <button
              onClick={() => imgRef.current?.click()}
              className="absolute bottom-0 right-0 h-7 w-7 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: '#004085' }}
            >
              <CameraIcon className="h-4 w-4 text-white" />
            </button>
          </div>
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          {avatar && (
            <button onClick={() => setAvatar(null)} className="text-xs text-red-500 hover:underline">
              Quitar foto
            </button>
          )}
          <p className="text-xs text-gray-400">Hacé clic en la foto para cambiarla</p>
        </div>

        {/* Usuario (solo lectura) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
          <div className="px-3 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-500 border border-gray-100">
            {user?.username}
          </div>
        </div>

        {/* Nombre para mostrar */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre a mostrar</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Tu nombre"
          />
        </div>

        {/* Color de avatar */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Color de avatar</label>
          <div className="flex gap-2 flex-wrap">
            {COLORES.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
              >
                {color === c && <CheckIcon className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Guardar */}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: '#004085' }}
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
};

export default Configuracion;
