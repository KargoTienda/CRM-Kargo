import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import {
  Producto, ConfigParams, CATEGORIAS,
  calcCosto,
} from './types';
import PreciosCalc from './PreciosCalc';

interface Props {
  producto: Producto | null; // null = nuevo
  config: ConfigParams;
  onGuardar: (p: Omit<Producto, 'id'>) => void;
  onCerrar: () => void;
}

const COLORES_SUGERIDOS = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Naranja',
  'Rosa', 'Violeta', 'Gris', 'Marrón', 'Amarillo', 'Celeste', 'Turquesa',
  'Negro con Rojo', 'Negro con Amarillo'];

const COLORES_HEX: Record<string, string> = {
  Negro: '#1a1a1a', Blanco: '#f5f5f5', Azul: '#2563eb', Rojo: '#dc2626',
  Verde: '#16a34a', Naranja: '#ea580c', Rosa: '#ec4899', Violeta: '#7c3aed',
  Gris: '#6b7280', Marrón: '#92400e', Amarillo: '#ca8a04', Celeste: '#0ea5e9',
  Turquesa: '#0891b2', 'Negro con Rojo': '#7f1d1d', 'Negro con Amarillo': '#713f12',
};

const formVacio = (config: ConfigParams): Omit<Producto, 'id'> => ({
  nombre: '', marca: 'Kargo', categoria: 'Morral', sku: '', codigoBarras: '',
  descripcion: '', imagen: undefined,
  usd: 0, costo: 0, precio: 0, precioSinDesc: 0, promoPorc: 0,
  colores: [],
});

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-medium text-gray-500 mb-1">{children}</label>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { className?: string }> =
  ({ className = '', ...props }) => (
    <input {...props}
      className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white ${className}`}
    />
  );

const ProductoModal: React.FC<Props> = ({ producto, config, onGuardar, onCerrar }) => {
  const [form, setForm] = useState<Omit<Producto, 'id'>>(
    producto ? { ...producto } : formVacio(config)
  );
  const [tab, setTab] = useState<'basico' | 'precios' | 'colores'>('basico');
  const [nuevoColor, setNuevoColor] = useState('');
  const [nuevoStock, setNuevoStock] = useState(0);
  const [nuevoSku, setNuevoSku] = useState('');
  const imgRef = useRef<HTMLInputElement>(null);

  // Auto-calcular costo cuando cambia USD o dólar
  useEffect(() => {
    if (form.usd > 0) {
      setForm(f => ({ ...f, costo: calcCosto(f.usd, config) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.usd, config.dolarOficial]);

  const set = (key: keyof Omit<Producto, 'id'>, val: any) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        set('imagen', canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const agregarColor = () => {
    if (!nuevoColor.trim()) return;
    const yaExiste = form.colores.some(c => c.color.toLowerCase() === nuevoColor.toLowerCase());
    if (yaExiste) return;
    setForm(f => ({
      ...f,
      colores: [...f.colores, { color: nuevoColor, stockDeposito: nuevoStock, stockSede: 0, hex: COLORES_HEX[nuevoColor], sku: nuevoSku.trim() || undefined }]
    }));
    setNuevoColor('');
    setNuevoStock(0);
    setNuevoSku('');
  };

  const actualizarStock = (idx: number, campo: 'stockDeposito' | 'stockSede', val: number) => {
    setForm(f => ({
      ...f,
      colores: f.colores.map((c, i) => i === idx ? { ...c, [campo]: Math.max(0, val) } : c),
    }));
  };

  const actualizarSkuVariante = (idx: number, sku: string) => {
    setForm(f => ({
      ...f,
      colores: f.colores.map((c, i) => i === idx ? { ...c, sku: sku || undefined } : c),
    }));
  };

  const eliminarColor = (idx: number) => {
    setForm(f => ({ ...f, colores: f.colores.filter((_, i) => i !== idx) }));
  };

  const puedeGuardar = form.nombre.trim() && form.sku.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: '#004085' }}>
            {producto ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 px-6">
          {(['basico', 'precios', 'colores'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="py-3 px-4 text-xs font-semibold capitalize mr-2 transition-colors border-b-2"
              style={tab === t
                ? { color: '#004085', borderColor: '#004085' }
                : { color: '#9ca3af', borderColor: 'transparent' }}>
              {t === 'basico' ? 'Datos básicos' : t === 'precios' ? 'Precios ML' : 'Colores y stock'}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Tab: Datos básicos ── */}
          {tab === 'basico' && (
            <div className="space-y-4">
              {/* Imagen */}
              <div>
                <Label>Imagen del producto</Label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => imgRef.current?.click()}
                    className="w-24 h-24 rounded-xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: '#f7f6f1' }}
                  >
                    {form.imagen ? (
                      <img src={form.imagen} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <PhotoIcon className="h-8 w-8 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Subir foto</p>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    <p className="font-medium text-gray-600 mb-1">Subir imagen del producto</p>
                    <p>Clic en el cuadrado para seleccionar</p>
                    <p>JPG, PNG · máx 5MB</p>
                    {form.imagen && (
                      <button onClick={() => set('imagen', undefined)}
                        className="mt-2 text-red-500 hover:text-red-700 font-medium">
                        Eliminar imagen
                      </button>
                    )}
                  </div>
                  <input ref={imgRef} type="file" accept="image/*"
                    className="hidden" onChange={handleImagen} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nombre del producto *</Label>
                  <Input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                    placeholder="Ej: Morral Fashion Negro" />
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Kargo" />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <select value={form.categoria} onChange={e => set('categoria', e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>SKU *</Label>
                  <Input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="MOC-001" />
                </div>
                <div>
                  <Label>Código de barras</Label>
                  <Input value={form.codigoBarras || ''} onChange={e => set('codigoBarras', e.target.value)} placeholder="opcional" />
                </div>
                <div className="col-span-2">
                  <Label>Descripción</Label>
                  <textarea value={form.descripcion || ''}
                    onChange={e => set('descripcion', e.target.value)}
                    rows={2} placeholder="Descripción del producto..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Precios ML ── */}
          {tab === 'precios' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Formulario de precios */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Costo (u$s)</Label>
                    <Input type="number" value={form.usd || ''} min={0}
                      onChange={e => set('usd', Number(e.target.value))}
                      placeholder="0" />
                  </div>
                  <div>
                    <Label>Costo (ARS) — auto</Label>
                    <Input value={form.costo ? '$' + form.costo.toLocaleString('es-AR') : ''}
                      readOnly className="bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </div>
                </div>

                <div>
                  <Label>Precio de venta en ML ($)</Label>
                  <Input type="number" value={form.precio || ''}
                    onChange={e => set('precio', Number(e.target.value))}
                    placeholder="0" />
                </div>

                <div>
                  <Label>Precio sin descuento / inflado ($)</Label>
                  <Input type="number" value={form.precioSinDesc || ''}
                    onChange={e => set('precioSinDesc', Number(e.target.value))}
                    placeholder="El que aparece tachado en ML" />
                  <p className="text-xs text-gray-400 mt-1">Dejalo en 0 si no usás precio tachado</p>
                </div>

                <div className="p-3 rounded-xl text-xs text-gray-500"
                  style={{ backgroundColor: '#f7f6f1' }}>
                  El envío gratis se descuenta automáticamente cuando el precio ≥ ${config.umbralEnvioGratis.toLocaleString('es-AR')} (configurable en Parámetros)
                </div>
              </div>

              {/* Calculadora en vivo */}
              <div>
                <Label>Resumen automático</Label>
                <PreciosCalc producto={form} config={config} />
              </div>
            </div>
          )}

          {/* ── Tab: Colores y stock ── */}
          {tab === 'colores' && (
            <div className="space-y-4">
              {/* Agregar color */}
              <div className="p-4 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs font-semibold text-gray-500 mb-3">Agregar variante de color</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Color</Label>
                    <div className="relative">
                      <Input
                        list="colores-lista"
                        value={nuevoColor}
                        onChange={e => setNuevoColor(e.target.value)}
                        placeholder="Ej: Negro, Azul..."
                      />
                      <datalist id="colores-lista">
                        {COLORES_SUGERIDOS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="w-32">
                    <Label>SKU variante</Label>
                    <Input value={nuevoSku}
                      onChange={e => setNuevoSku(e.target.value)}
                      placeholder="MOC-001-NEG" />
                  </div>
                  <div className="w-24">
                    <Label>Stock inicial</Label>
                    <Input type="number" value={nuevoStock || ''}
                      onChange={e => setNuevoStock(Number(e.target.value))}
                      min={0} placeholder="0" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={agregarColor}
                      className="p-2.5 rounded-xl text-white transition-all"
                      style={{ backgroundColor: '#D35400' }}>
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Swatches de colores sugeridos */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {COLORES_SUGERIDOS.map(c => (
                    <button key={c}
                      onClick={() => setNuevoColor(c)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all"
                      style={nuevoColor === c
                        ? { borderColor: '#004085', backgroundColor: '#e6edf5', color: '#004085' }
                        : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                      <div className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORES_HEX[c] || '#9ca3af' }} />
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de colores */}
              {form.colores.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Todavía no hay colores cargados
                </div>
              ) : (
                <div className="space-y-2">
                  {form.colores.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gray-50 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full border-2 border-white shadow flex-shrink-0"
                          style={{ backgroundColor: COLORES_HEX[c.color] || c.hex || '#9ca3af' }} />
                        <span className="text-sm font-medium flex-1" style={{ color: '#3A3A3A' }}>
                          {c.color}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs text-gray-400">Depósito</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => actualizarStock(i, 'stockDeposito', (c.stockDeposito||0) - 1)}
                                className="w-6 h-6 rounded-lg bg-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-300">−</button>
                              <input type="number" value={c.stockDeposito || 0}
                                onChange={e => actualizarStock(i, 'stockDeposito', Number(e.target.value))}
                                className="w-12 text-center py-1 rounded-lg border border-gray-200 text-sm font-semibold" />
                              <button onClick={() => actualizarStock(i, 'stockDeposito', (c.stockDeposito||0) + 1)}
                                className="w-6 h-6 rounded-lg bg-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-300">+</button>
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs" style={{ color: '#004085' }}>Sede</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => actualizarStock(i, 'stockSede', (c.stockSede||0) - 1)}
                                className="w-6 h-6 rounded-lg font-bold text-xs hover:opacity-80" style={{ backgroundColor: '#e6edf5', color: '#004085' }}>−</button>
                              <input type="number" value={c.stockSede || 0}
                                onChange={e => actualizarStock(i, 'stockSede', Number(e.target.value))}
                                className="w-12 text-center py-1 rounded-lg border text-sm font-semibold" style={{ borderColor: '#A9C2D9', color: '#004085' }} />
                              <button onClick={() => actualizarStock(i, 'stockSede', (c.stockSede||0) + 1)}
                                className="w-6 h-6 rounded-lg font-bold text-xs hover:opacity-80" style={{ backgroundColor: '#e6edf5', color: '#004085' }}>+</button>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => eliminarColor(i)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-10">
                        <span className="text-xs text-gray-400 w-20">SKU variante:</span>
                        <input value={c.sku || ''}
                          onChange={e => actualizarSkuVariante(i, e.target.value)}
                          placeholder="ej: MOC-001-NEG"
                          className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200" />
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-xs text-gray-400 pr-1">
                    Depósito: <span className="font-bold" style={{ color: '#3A3A3A' }}>{form.colores.reduce((s, c) => s + (c.stockDeposito||0), 0)}</span>
                    {' · '}
                    Sede: <span className="font-bold" style={{ color: '#004085' }}>{form.colores.reduce((s, c) => s + (c.stockSede||0), 0)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onCerrar}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => puedeGuardar && onGuardar(form)}
            disabled={!puedeGuardar}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: '#004085' }}>
            {producto ? 'Guardar cambios' : 'Agregar producto'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductoModal;
