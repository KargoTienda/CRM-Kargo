import React, { useState, useEffect } from 'react';
import {
  getProductos, upsertProductos, deleteProducto as dbDeleteProducto,
  getConfig, saveConfig, getTransacciones, insertTransaccion,
} from '../../utils/db';
import {
  PlusIcon, MagnifyingGlassIcon, TrashIcon, Cog6ToothIcon,
  ArchiveBoxIcon, XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import {
  Producto, ConfigParams, CONFIG_DEFAULT, CATEGORIAS, CATEGORIA_EMOJI,
  calcGanBruta, calcMargen, calcStockTotal, TransaccionStock,
} from './types';
import ProductoDrawer from './ProductoDrawer';
import ProductoModal from './ProductoModal';

// ─── Productos Kargo ──────────────────────────────────────
const productosIniciales: Producto[] = [
  { id: 1,  nombre: 'Riñonera 54978', marca: 'Kargo', categoria: 'Riñonera', sku: 'R-54978',   codigoBarras: 'R4978',       imagen: undefined, usd: 2.65, costo: 3882,  precio: 11999, precioSinDesc: 14999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 49,  stockSede: 5,  sku: 'R-54978-N'  }, { color: 'Gris',    stockDeposito: 12, stockSede: 6,  sku: 'R-54978-G'  }, { color: 'Violeta', stockDeposito: 1,  stockSede: 6,  sku: 'R-54978-VI' }] },
  { id: 2,  nombre: 'Morral 54979',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54979',   codigoBarras: 'M4979',       imagen: undefined, usd: 2.97, costo: 4351,  precio: 13999, precioSinDesc: 17499, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 29,  stockSede: 10, sku: 'M-54979-N'  }, { color: 'Gris',    stockDeposito: 0,  stockSede: 8,  sku: 'M-54979-G'  }] },
  { id: 3,  nombre: 'Morral 54980',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54980',   codigoBarras: 'M4980',       imagen: undefined, usd: 3.43, costo: 5025,  precio: 25499, precioSinDesc: 29999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 0,   stockSede: 3,  sku: 'M-54980-N'  }] },
  { id: 4,  nombre: 'Morral 54981',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54981',   codigoBarras: 'M4981',       imagen: undefined, usd: 3.43, costo: 5025,  precio: 25499, precioSinDesc: 29999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 0,   stockSede: 33, sku: 'M-54981-N'  }, { color: 'Marrón',  stockDeposito: 0,  stockSede: 0,  sku: 'M-54981-MA' }] },
  { id: 5,  nombre: 'Pechera 54982',  marca: 'Kargo', categoria: 'Pechera',  sku: 'P-54982',   codigoBarras: 'P4982',       imagen: undefined, usd: 3.66, costo: 5362,  precio: 19974, precioSinDesc: 23499, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 0,   stockSede: 3,  sku: 'P-54982-N'  }] },
  { id: 6,  nombre: 'Mochila 54983',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-54983', codigoBarras: 'MCH-54983-N', imagen: undefined, usd: 5.27, costo: 7721,  precio: 23999, precioSinDesc: 29999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 132, stockSede: 6,  sku: 'MCH-54983-N'}, { color: 'Azul',    stockDeposito: 13, stockSede: 6,  sku: 'MCH-54983-A'}, { color: 'Gris',    stockDeposito: 83, stockSede: 5,  sku: 'MCH-54983-G'}] },
  { id: 7,  nombre: 'Morral 54984',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54984',   codigoBarras: 'M4984',       imagen: undefined, usd: 5.73, costo: 8394,  precio: 27999, precioSinDesc: 32940, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 6,   stockSede: 5,  sku: 'M-54984-N'  }, { color: 'Azul',    stockDeposito: 4,  stockSede: 5,  sku: 'M-54984-A'  }] },
  { id: 8,  nombre: 'Pechera 54985',  marca: 'Kargo', categoria: 'Pechera',  sku: 'P-54985',   codigoBarras: 'P4985',       imagen: undefined, usd: 1.96, costo: 2871,  precio: 14999, precioSinDesc: 19999, promoPorc: 0, colores: [{ color: 'Gris',    stockDeposito: 10,  stockSede: 2,  sku: 'P-54985-G'  }, { color: 'Negro',   stockDeposito: 22, stockSede: 4,  sku: 'P-54985-N'  }] },
  { id: 9,  nombre: 'Pechera 54986',  marca: 'Kargo', categoria: 'Pechera',  sku: 'P-54986',   codigoBarras: 'P4986',       imagen: undefined, usd: 3.43, costo: 5025,  precio: 22499, precioSinDesc: 26469, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 0,   stockSede: 2,  sku: 'P-54986-N'  }] },
  { id: 10, nombre: 'Morral 54987',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54987',   codigoBarras: 'M4987',       imagen: undefined, usd: 3.43, costo: 5025,  precio: 23999, precioSinDesc: 31999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 75,  stockSede: 4,  sku: 'M-54987-N'  }] },
  { id: 11, nombre: 'Morral 54988',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54988',   codigoBarras: 'M4988',       imagen: undefined, usd: 3.43, costo: 5025,  precio: 22999, precioSinDesc: 30665, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 23,  stockSede: 3,  sku: 'M-54988-N'  }] },
  { id: 12, nombre: 'Riñonera 54989', marca: 'Kargo', categoria: 'Riñonera', sku: 'R-54989',   codigoBarras: '54989',       imagen: undefined, usd: 3.43, costo: 5025,  precio: 24999, precioSinDesc: 29411, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 18,  stockSede: 7,  sku: 'R-54989-N'  }, { color: 'Blanco',  stockDeposito: 0,  stockSede: 1,  sku: 'R-54989-B'  }, { color: 'Rosa',    stockDeposito: 0,  stockSede: 1,  sku: 'R-54989-RO' }, { color: 'Verde',   stockDeposito: 0,  stockSede: 1,  sku: 'R-54989-VE' }] },
  { id: 13, nombre: 'Morral 54990',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54990',   codigoBarras: '54990',       imagen: undefined, usd: 3.50, costo: 5128,  precio: 22999, precioSinDesc: 32856, promoPorc: 0, colores: [{ color: 'Azul',    stockDeposito: 2,   stockSede: 5,  sku: 'M-54990-A'  }, { color: 'Negro',   stockDeposito: 91, stockSede: 4,  sku: 'M-54990-N'  }, { color: 'Marrón',  stockDeposito: 3,  stockSede: 2,  sku: 'M-54990-MA' }] },
  { id: 14, nombre: 'Morral 54991',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54991',   codigoBarras: '54991',       imagen: undefined, usd: 4.35, costo: 6373,  precio: 27999, precioSinDesc: 39999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 66,  stockSede: 5,  sku: 'M-54991-N'  }, { color: 'Gris',    stockDeposito: 3,  stockSede: 1,  sku: 'M-54991-G'  }, { color: 'Verde',   stockDeposito: 2,  stockSede: 3,  sku: 'M-54991-VE' }] },
  { id: 15, nombre: 'Morral 54992',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-54992',   codigoBarras: '54992',       imagen: undefined, usd: 5.93, costo: 8687,  precio: 29999, precioSinDesc: 42856, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 52,  stockSede: 5,  sku: 'M-54992-N'  }] },
  { id: 16, nombre: 'Riñonera 54993', marca: 'Kargo', categoria: 'Riñonera', sku: 'R-54993',   codigoBarras: '54993',       imagen: undefined, usd: 3.34, costo: 4893,  precio: 14999, precioSinDesc: 19999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 33,  stockSede: 2,  sku: 'R-54993-N'  }, { color: 'Turquesa',stockDeposito: 7,  stockSede: 4,  sku: 'R-54993-TQ' }, { color: 'Violeta', stockDeposito: 7,  stockSede: 2,  sku: 'R-54993-VI' }] },
  { id: 17, nombre: 'Mochila 54994',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-54994', codigoBarras: '54994',       imagen: undefined, usd: 3.57, costo: 5230,  precio: 22999, precioSinDesc: 30665, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 68,  stockSede: 10, sku: 'MCH-54994-N'}, { color: 'Negro con Rojo',     stockDeposito: 7,  stockSede: 3,  sku: 'MCH-54994-NR'}, { color: 'Negro con Amarillo', stockDeposito: 9,  stockSede: 3,  sku: 'MCH-54994-NA'}, { color: 'Gris',    stockDeposito: 8,  stockSede: 5,  sku: 'MCH-54994-G'}, { color: 'Rosa',    stockDeposito: 11, stockSede: 2,  sku: 'MCH-54994-RO'}, { color: 'Violeta', stockDeposito: 11, stockSede: 2,  sku: 'MCH-54994-VI'}] },
  { id: 18, nombre: 'Mochila 54995',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-54995', codigoBarras: '54995',       imagen: undefined, usd: 3.57, costo: 5230,  precio: 22999, precioSinDesc: 30665, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 118, stockSede: 5,  sku: 'MCH-54995-N'}, { color: 'Gris',    stockDeposito: 29, stockSede: 3,  sku: 'MCH-54995-G'}, { color: 'Rosa',    stockDeposito: 21, stockSede: 2,  sku: 'MCH-54995-RO'}] },
  { id: 19, nombre: 'Mochila 54996',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-54996', codigoBarras: '54996',       imagen: undefined, usd: 5.50, costo: 8058,  precio: 28999, precioSinDesc: 41427, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 0,   stockSede: 1,  sku: 'MCH-54996-N'}, { color: 'Blanco',  stockDeposito: 0,  stockSede: 3,  sku: 'MCH-54996-B'}] },
  { id: 20, nombre: 'Mochila 54997',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-54997', codigoBarras: '54997',       imagen: undefined, usd: 6.79, costo: 9947,  precio: 29999, precioSinDesc: 42856, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 56,  stockSede: 2,  sku: 'MCH-54997-N'}, { color: 'Azul',    stockDeposito: 8,  stockSede: 2,  sku: 'MCH-54997-A'}, { color: 'Gris',    stockDeposito: 25, stockSede: 2,  sku: 'MCH-54997-G'}] },
  { id: 21, nombre: 'Mochila 54998',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-54998', codigoBarras: '54998',       imagen: undefined, usd: 7.34, costo: 10753, precio: 32199, precioSinDesc: 45999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 74,  stockSede: 2,  sku: 'MCH-54998-N'}, { color: 'Gris',    stockDeposito: 74, stockSede: 0,  sku: 'MCH-54998-G'}] },
  { id: 22, nombre: 'Mochila 54999',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-54999', codigoBarras: '54999',       imagen: undefined, usd: 6.49, costo: 9508,  precio: 29599, precioSinDesc: 42284, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 138, stockSede: 4,  sku: 'MCH-54999-N'}] },
  { id: 23, nombre: 'Mochila 55000',  marca: 'Kargo', categoria: 'Mochila',  sku: 'MCH-55000', codigoBarras: '55000',       imagen: undefined, usd: 6.79, costo: 9947,  precio: 31799, precioSinDesc: 45427, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 0,   stockSede: 1,  sku: 'MCH-55000-N'}, { color: 'Azul',    stockDeposito: 23, stockSede: 3,  sku: 'MCH-55000-A'}, { color: 'Naranja', stockDeposito: 0,  stockSede: 1,  sku: 'MCH-55000-OR'}, { color: 'Verde',   stockDeposito: 38, stockSede: 2,  sku: 'MCH-55000-VE'}] },
  { id: 24, nombre: 'Morral 55001',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-55001',   codigoBarras: '55001',       imagen: undefined, usd: 3.66, costo: 5362,  precio: 18899, precioSinDesc: 26999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 68,  stockSede: 5,  sku: 'M-55001-N'  }, { color: 'Azul',    stockDeposito: 14, stockSede: 5,  sku: 'M-55001-A'  }, { color: 'Verde',   stockDeposito: 2,  stockSede: 3,  sku: 'M-55001-VE' }] },
  { id: 25, nombre: 'Morral 55002',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-55002',   codigoBarras: '55002',       imagen: undefined, usd: 3.66, costo: 5362,  precio: 22999, precioSinDesc: 32856, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 0,   stockSede: 0,  sku: 'M-55002-N'  }, { color: 'Azul',    stockDeposito: 0,  stockSede: 3,  sku: 'M-55002-A'  }, { color: 'Gris',    stockDeposito: 0,  stockSede: 0,  sku: 'M-55002-G'  }] },
  { id: 26, nombre: 'Morral 55003',   marca: 'Kargo', categoria: 'Morral',   sku: 'M-55003',   codigoBarras: '55003',       imagen: undefined, usd: 5.52, costo: 8087,  precio: 33999, precioSinDesc: 39999, promoPorc: 0, colores: [{ color: 'Negro',   stockDeposito: 51,  stockSede: 4,  sku: 'M-55003-N'  }, { color: 'Azul',    stockDeposito: 25, stockSede: 5,  sku: 'M-55003-A'  }, { color: 'Gris',    stockDeposito: 0,  stockSede: 2,  sku: 'M-55003-G'  }] },
];

// ─── Panel de configuración global ───────────────────────
const ConfigPanel: React.FC<{ config: ConfigParams; onSave: (c: ConfigParams) => void; onClose: () => void }> = ({ config, onSave, onClose }) => {
  const [local, setLocal] = useState(config);
  const [fetchingDolar, setFetchingDolar] = useState(false);
  const [dolarMsg, setDolarMsg] = useState('');
  const set = (k: keyof ConfigParams, v: number) => setLocal(c => ({ ...c, [k]: v }));

  const fetchDolar = async () => {
    setFetchingDolar(true);
    setDolarMsg('');
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/oficial');
      const data = await res.json();
      const venta = data.venta;
      set('dolarOficial', venta);
      setDolarMsg(`✅ Actualizado: $${venta}`);
    } catch {
      setDolarMsg('❌ No se pudo traer el dólar. Actualizá manualmente.');
    } finally {
      setFetchingDolar(false);
    }
  };

  const campos = [
    { label: 'Comisión ML (%)', key: 'comisionML' as keyof ConfigParams, isPorc: true },
    { label: 'Fijo ML hasta $15.000', key: 'fijoML_15k' as keyof ConfigParams },
    { label: 'Fijo ML hasta $25.000', key: 'fijoML_25k' as keyof ConfigParams },
    { label: 'Fijo ML hasta $33.000', key: 'fijoML_33k' as keyof ConfigParams },
    { label: 'Costo estimado envío gratis ($)', key: 'envioGratis' as keyof ConfigParams },
    { label: 'Umbral envío gratis (precio desde $)', key: 'umbralEnvioGratis' as keyof ConfigParams },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-sm" style={{ color: '#004085' }}>Parámetros ML</h2>
            <p className="text-xs text-gray-400">Configurá comisiones, fijos y envíos</p>
          </div>
          <button onClick={onClose}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">

          {/* Dólar oficial — manual + auto */}
          <div className="p-4 rounded-xl border-2" style={{ borderColor: '#A9C2D9', backgroundColor: '#f0f6fb' }}>
            <label className="block text-xs font-bold mb-2" style={{ color: '#004085' }}>
              Dólar oficial (ARS)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={local.dolarOficial}
                onChange={e => set('dolarOficial', Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
              />
              <button
                onClick={fetchDolar}
                disabled={fetchingDolar}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap"
                style={{ backgroundColor: '#004085' }}
              >
                {fetchingDolar ? '...' : '🔄 Auto'}
              </button>
            </div>
            {dolarMsg && <p className="text-xs mt-1.5" style={{ color: dolarMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>{dolarMsg}</p>}
            <p className="text-xs text-gray-400 mt-1">Fuente: dolarapi.com · Dólar oficial BNA</p>
          </div>

          {campos.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
              <input
                type="number"
                value={f.isPorc ? Math.round(local[f.key] as number * 100) : local[f.key] as number}
                onChange={e => set(f.key, f.isPorc ? Number(e.target.value) / 100 : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => { onSave(local); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#004085' }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de transferencia ───────────────────────────────
const ModalTransferencia: React.FC<{
  producto: Producto;
  onConfirmar: (productoId: number, color: string, cantidad: number, destino: 'sede' | 'afuera') => void;
  onCerrar: () => void;
}> = ({ producto, onConfirmar, onCerrar }) => {
  const [color, setColor] = useState(producto.colores[0]?.color || '');
  const [cantidad, setCantidad] = useState(1);
  const [destino, setDestino] = useState<'sede' | 'afuera'>('sede');

  const colorVariante = producto.colores.find(c => c.color === color);
  const maxCantidad = colorVariante?.stockDeposito || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold" style={{ color: '#004085' }}>Transferir stock</h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="font-semibold text-sm" style={{ color: '#3A3A3A' }}>{producto.nombre}</p>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
            <div className="flex flex-wrap gap-2">
              {producto.colores.map(c => (
                <button key={c.color} onClick={() => setColor(c.color)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={color === c.color
                    ? { backgroundColor: '#004085', color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {c.color}
                  <span className="ml-1 opacity-70">({c.stockDeposito || 0} dep.)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Cantidad (máx. {maxCantidad})</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setCantidad(v => Math.max(1, v - 1))}
                className="w-9 h-9 rounded-xl bg-gray-100 font-bold text-lg hover:bg-gray-200">−</button>
              <input type="number" value={cantidad} min={1} max={maxCantidad}
                onChange={e => setCantidad(Math.min(maxCantidad, Math.max(1, Number(e.target.value))))}
                className="flex-1 text-center py-2 rounded-xl border border-gray-200 text-base font-bold focus:outline-none" />
              <button onClick={() => setCantidad(v => Math.min(maxCantidad, v + 1))}
                className="w-9 h-9 rounded-xl bg-gray-100 font-bold text-lg hover:bg-gray-200">+</button>
            </div>
          </div>

          {/* Destino */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Destino</label>
            <div className="flex gap-2">
              {(['sede', 'afuera'] as const).map(d => (
                <button key={d} onClick={() => setDestino(d)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={destino === d
                    ? { backgroundColor: d === 'sede' ? '#004085' : '#D35400', color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {d === 'sede' ? 'Sede de entrega' : 'Afuera'}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: '#f7f6f1' }}>
            <p className="text-gray-500">Depósito: <b>{maxCantidad}</b> → <b>{Math.max(0, maxCantidad - cantidad)}</b></p>
            {destino === 'sede' && colorVariante && (
              <p className="text-gray-500">Sede: <b>{colorVariante.stockSede || 0}</b> → <b>{(colorVariante.stockSede || 0) + cantidad}</b></p>
            )}
          </div>

          <button
            disabled={cantidad < 1 || maxCantidad < 1}
            onClick={() => onConfirmar(producto.id, color, cantidad, destino)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: '#004085' }}>
            <ArrowRightIcon className="h-4 w-4" />
            Confirmar transferencia
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Catalogo principal ───────────────────────────────────
const Catalogo: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>(productosIniciales);
  const [config, setConfig] = useState<ConfigParams>(CONFIG_DEFAULT);
  const [cargado, setCargado] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos');
  const [drawerProducto, setDrawerProducto] = useState<Producto | null>(null);
  const [modalProducto, setModalProducto] = useState<Producto | null | 'nuevo'>('nuevo' as any);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [configAbierta, setConfigAbierta] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [transferModal, setTransferModal] = useState<{ producto: Producto } | null>(null);
  const [transacciones, setTransacciones] = useState<TransaccionStock[]>([]);
  const [historialAbierto, setHistorialAbierto] = useState(false);

  // Cargar desde Supabase al montar
  useEffect(() => {
    Promise.all([
      getProductos(),
      getConfig(),
      getTransacciones(),
    ]).then(([prods, cfg, txs]) => {
      if (prods.length > 0) {
        setProductos(prods);
      } else {
        // Primera vez: sembrar los productos iniciales
        upsertProductos(productosIniciales);
      }
      if (cfg) setConfig(cfg);
      if (txs.length > 0) setTransacciones(txs);
      setCargado(true);
    });
  }, []);

  // Recargar productos si DatosContext los modificó (ventas ML)
  useEffect(() => {
    const handler = () => {
      getProductos().then(prods => { if (prods.length > 0) setProductos(prods); });
    };
    window.addEventListener('kargo:products-updated', handler);
    return () => window.removeEventListener('kargo:products-updated', handler);
  }, []);

  // Guardar en Supabase cada vez que cambian (solo después de cargar)
  useEffect(() => {
    if (cargado) upsertProductos(productos);
  }, [productos, cargado]);

  const registrarTransferencia = (productoId: number, color: string, cantidad: number, destino: 'sede' | 'afuera') => {
    const prod = productos.find(p => p.id === productoId);
    if (!prod) return;
    setProductos(prev => prev.map(p => {
      if (p.id !== productoId) return p;
      return {
        ...p,
        colores: p.colores.map(c => {
          if (c.color !== color) return c;
          return {
            ...c,
            stockDeposito: Math.max(0, (c.stockDeposito || 0) - cantidad),
            stockSede: destino === 'sede' ? (c.stockSede || 0) + cantidad : (c.stockSede || 0),
          };
        }),
      };
    }));
    const tx: TransaccionStock = {
      id: Date.now().toString(36),
      fecha: new Date().toISOString(),
      productoNombre: prod.nombre,
      sku: prod.colores.find(c => c.color === color)?.sku || prod.sku,
      color,
      cantidad,
      destino,
    };
    setTransacciones(prev => [tx, ...prev].slice(0, 200));
    insertTransaccion(tx);
    setTransferModal(null);
  };

  useEffect(() => {
    if (cargado) saveConfig(config);
  }, [config, cargado]);

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

  const productosFiltrados = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = filtroCategoria === 'Todos' || p.categoria === filtroCategoria;
    return coincideBusqueda && coincideCategoria;
  });

  const sinStock = productos.filter(p => calcStockTotal(p) === 0).length;
  const stockBajo = productos.filter(p => { const s = calcStockTotal(p); return s > 0 && s <= 3; }).length;
  const valorInventario = productos.reduce((s, p) => s + p.costo * calcStockTotal(p), 0);

  const abrirNuevo = () => { setModalProducto(null); setModalAbierto(true); };
  const abrirEditar = (p: Producto) => { setModalProducto(p); setModalAbierto(true); setDrawerProducto(null); };

  const guardar = (form: Omit<Producto, 'id'>) => {
    if (modalProducto && typeof modalProducto !== 'string') {
      setProductos(prev => prev.map(p => p.id === (modalProducto as Producto).id ? { ...form, id: (modalProducto as Producto).id } : p));
      setDrawerProducto({ ...form, id: (modalProducto as Producto).id });
    } else {
      const nuevoId = Math.max(0, ...productos.map(p => p.id)) + 1;
      const nuevo = { ...form, id: nuevoId };
      setProductos(prev => [...prev, nuevo]);
    }
    setModalAbierto(false);
  };

  const eliminar = (id: number) => {
    setProductos(prev => prev.filter(p => p.id !== id));
    dbDeleteProducto(id);
    if (drawerProducto?.id === id) setDrawerProducto(null);
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#004085' }}>Catálogo</h1>
          <p className="text-sm text-gray-400 mt-0.5">{productos.length} productos · Dólar oficial: ${config.dolarOficial.toLocaleString('es-AR')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setHistorialAbierto(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            Historial stock
          </button>
          <button onClick={() => setConfigAbierta(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            <Cog6ToothIcon className="h-4 w-4" /> Parámetros
          </button>
          <button onClick={abrirNuevo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#D35400', boxShadow: '0 4px 12px rgba(211,84,0,0.3)' }}>
            <PlusIcon className="h-4 w-4" /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total productos', value: productos.length, color: '#004085', bg: '#e6edf5' },
          { label: 'Sin stock', value: sinStock, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Stock bajo', value: stockBajo, color: '#d97706', bg: '#fffbeb' },
          { label: 'Valor inventario', value: fmt(valorInventario), color: '#059669', bg: '#ecfdf5' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: s.bg }}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre o SKU..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-white" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todos', ...CATEGORIAS].map(cat => (
            <button key={cat} onClick={() => setFiltroCategoria(cat)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={filtroCategoria === cat
                ? { backgroundColor: '#004085', color: 'white' }
                : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {cat !== 'Todos' && CATEGORIA_EMOJI[cat as keyof typeof CATEGORIA_EMOJI]} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-16">
          <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-3" style={{ color: '#A9C2D9' }} />
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productosFiltrados.map(p => {
            const ganBruta = calcGanBruta(p, config);
            const margen = calcMargen(ganBruta, p.precio);
            const precioMostrar = p.promoPorc > 0 ? Math.round(p.precio * (1 - p.promoPorc)) : p.precio;

            return (
              <div key={p.id}
                onClick={() => setDrawerProducto(p)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

                {/* Imagen o emoji */}
                <div className="h-32 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #e6edf5 0%, #c8daea 100%)' }}>
                  {p.imagen ? (
                    <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {CATEGORIA_EMOJI[p.categoria]}
                      </span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: '#004085', color: 'white' }}>
                    {p.categoria}
                  </span>
                  {p.promoPorc > 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                      −{Math.round(p.promoPorc * 100)}%
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2.5">
                  <div>
                    <h3 className="font-semibold text-sm leading-tight" style={{ color: '#3A3A3A' }}>{p.nombre}</h3>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </div>

                  {/* Precio y costo */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-400">Precio ML</p>
                      <p className="text-lg font-bold" style={{ color: '#004085' }}>
                        {fmt(precioMostrar)}
                      </p>
                      {p.precioSinDesc > 0 && (
                        <p className="text-xs text-gray-400 line-through">{fmt(p.precioSinDesc)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Gan. bruta</p>
                      <p className={`text-sm font-bold ${ganBruta >= 0 ? '' : 'text-red-600'}`}
                        style={ganBruta >= 0 ? { color: '#D35400' } : {}}>
                        {fmt(ganBruta)}
                      </p>
                    </div>
                  </div>

                  {/* Barra de margen */}
                  <div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, margen))}%`,
                          backgroundColor: margen >= 30 ? '#059669' : margen >= 15 ? '#D35400' : '#dc2626',
                        }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Margen: <span className="font-semibold">{margen}%</span></p>
                  </div>

                  {/* Colores */}
                  {p.colores.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {p.colores.slice(0, 5).map((c, i) => (
                        <div key={i} title={`${c.color}: dep ${c.stockDeposito||0} / sede ${c.stockSede||0}`}
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{
                            backgroundColor: c.color === 'Negro' ? '#1a1a1a' : c.color === 'Blanco' ? '#e5e7eb' :
                              c.color === 'Azul' ? '#2563eb' : c.color === 'Rojo' ? '#dc2626' :
                              c.color === 'Verde' ? '#16a34a' : c.color === 'Gris' ? '#6b7280' :
                              c.color === 'Violeta' ? '#7c3aed' : c.hex || '#A9C2D9',
                            opacity: (c.stockDeposito||0) + (c.stockSede||0) === 0 ? 0.3 : 1,
                          }} />
                      ))}
                      {p.colores.length > 5 && (
                        <span className="text-xs text-gray-400">+{p.colores.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Stocks depósito / sede */}
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Dep: <b>{p.colores.reduce((s, c) => s + (c.stockDeposito || 0), 0)}</b>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-white font-semibold" style={{ backgroundColor: '#004085' }}>
                      Sede: <b>{p.colores.reduce((s, c) => s + (c.stockSede || 0), 0)}</b>
                    </span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between pt-1">
                    <button onClick={e => { e.stopPropagation(); setTransferModal({ producto: p }); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:opacity-90 text-white"
                      style={{ backgroundColor: '#D35400' }}>
                      Transferir
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer detalle producto */}
      <ProductoDrawer
        producto={drawerProducto}
        config={config}
        onClose={() => setDrawerProducto(null)}
        onEditar={abrirEditar}
      />

      {/* Modal agregar/editar */}
      {modalAbierto && (
        <ProductoModal
          producto={modalProducto as Producto | null}
          config={config}
          onGuardar={guardar}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

      {/* Config params */}
      {configAbierta && (
        <ConfigPanel config={config} onSave={setConfig} onClose={() => setConfigAbierta(false)} />
      )}

      {/* Modal transferencia de stock */}
      {transferModal && <ModalTransferencia
        producto={transferModal.producto}
        onConfirmar={registrarTransferencia}
        onCerrar={() => setTransferModal(null)}
      />}

      {/* Modal historial de transacciones */}
      {historialAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold" style={{ color: '#004085' }}>Historial de stock</h2>
              <button onClick={() => setHistorialAbierto(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {transacciones.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Sin transacciones aún</p>
              ) : transacciones.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-xs">
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: '#3A3A3A' }}>{tx.productoNombre} · {tx.color}</p>
                    <p className="text-gray-400 font-mono">SKU: {tx.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: tx.destino === 'afuera' ? '#dc2626' : tx.destino === 'venta_ml' ? '#D35400' : '#004085' }}>
                      {tx.destino === 'sede' ? '→ Sede' : tx.destino === 'afuera' ? '→ Afuera' : '→ Venta ML'} · {tx.cantidad} u.
                    </p>
                    <p className="text-gray-400">{new Date(tx.fecha).toLocaleDateString('es-AR')} {new Date(tx.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalogo;
