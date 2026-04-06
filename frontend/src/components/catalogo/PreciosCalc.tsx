import React from 'react';
import { Producto, ConfigParams, calcComisionML, calcFijoML } from './types';

interface Props {
  producto: Partial<Producto>;
  config: ConfigParams;
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

const Fila: React.FC<{
  label: string;
  valor: string;
  bold?: boolean;
  color?: string;
  indent?: boolean;
  separator?: boolean;
}> = ({ label, valor, bold, color, indent, separator }) => (
  <>
    {separator && <div className="border-t border-gray-100 my-1" />}
    <div className={`flex justify-between items-center py-1.5 ${indent ? 'pl-3' : ''}`}>
      <span className="text-xs" style={{ color: bold ? (color || '#3A3A3A') : '#6b7280', fontWeight: bold ? 600 : 400 }}>
        {label}
      </span>
      <span className="text-xs font-semibold" style={{ color: color || (bold ? '#3A3A3A' : '#6b7280') }}>
        {valor}
      </span>
    </div>
  </>
);

const PreciosCalc: React.FC<Props> = ({ producto, config }) => {
  const precio = producto.precio || 0;
  const precioSinDesc = producto.precioSinDesc || 0;
  const promoPorc = producto.promoPorc || 0;

  if (precio === 0 && precioSinDesc === 0) {
    return (
      <div className="rounded-xl p-4 text-center text-xs text-gray-400" style={{ backgroundColor: '#f7f6f1' }}>
        Ingresá el precio para ver el cálculo
      </div>
    );
  }

  // El precio "real" es el campo `precio` (con descuento ya aplicado)
  // El `precioSinDesc` es el inflado que aparece tachado
  const descuentoARS = precioSinDesc > 0 ? precioSinDesc - precio : Math.round(precio * promoPorc);
  const precioEfectivo = precio; // este es el que usa ML para calcular comisiones

  const comision = calcComisionML(precioEfectivo, config);
  const fijo = calcFijoML(precioEfectivo, config);
  const aplicaEnvio = precioEfectivo >= config.umbralEnvioGratis;
  const envio = aplicaEnvio ? config.envioGratis : 0;

  const plataqueLlega = precioEfectivo - comision - fijo - envio;
  const precioEfectivo10 = Math.round(precioEfectivo * 0.9);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 text-sm">
      {/* Header */}
      <div className="px-4 py-2.5 flex justify-between items-center" style={{ backgroundColor: '#004085' }}>
        <span className="text-xs font-bold text-white">¿Qué me llega por esta venta?</span>
        <span className="text-xs" style={{ color: '#A9C2D9' }}>
          Dólar: ${config.dolarOficial.toLocaleString('es-AR')}
        </span>
      </div>

      <div className="px-4 py-3 bg-white space-y-0">

        {/* Sección: Precio */}
        <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#A9C2D9' }}>Precio</p>

        {precioSinDesc > 0 ? (
          <>
            <Fila label="🏷 Precio inflado (tachado en ML)" valor={fmt(precioSinDesc)} />
            <Fila label={`✂️ Descuento aplicado`} valor={`−${fmt(descuentoARS)}`} indent color="#dc2626" />
            <Fila label="💰 Precio real de venta" valor={fmt(precioEfectivo)} bold color="#004085" />
          </>
        ) : (
          <Fila label="💰 Precio de venta" valor={fmt(precioEfectivo)} bold color="#004085" />
        )}

        <Fila label="💵 Precio efectivo (−10%)" valor={fmt(precioEfectivo10)} indent />

        {/* Sección: Lo que cobra ML */}
        <div className="border-t border-gray-100 mt-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: '#A9C2D9' }}>
            Lo que cobra MercadoLibre
          </p>
          <Fila
            label={`Comisión ${Math.round(config.comisionML * 100)}% sobre precio`}
            valor={`−${fmt(comision)}`}
            indent
            color="#dc2626"
          />
          <Fila
            label={`Fijo ML (precio ${precioEfectivo <= 15000 ? '≤$15k' : precioEfectivo <= 25000 ? '≤$25k' : '≤$33k'})`}
            valor={`−${fmt(fijo)}`}
            indent
            color="#dc2626"
          />
          {aplicaEnvio ? (
            <Fila
              label={`Envío gratis (precio ≥ $${config.umbralEnvioGratis.toLocaleString('es-AR')})`}
              valor={`−${fmt(envio)}`}
              indent
              color="#dc2626"
            />
          ) : (
            <Fila
              label={`Envío gratis — no aplica (precio < $${config.umbralEnvioGratis.toLocaleString('es-AR')})`}
              valor="$0"
              indent
              color="#9ca3af"
            />
          )}
        </div>

        {/* Resultado */}
        <div className="border-t-2 border-gray-200 mt-2 pt-2">
          <Fila
            label="✅ Plata que llega al negocio"
            valor={fmt(plataqueLlega)}
            bold
            color={plataqueLlega >= 0 ? '#059669' : '#dc2626'}
          />
        </div>
      </div>

      {plataqueLlega < 0 && (
        <div className="px-4 py-2 text-xs font-medium text-center text-red-700 bg-red-50">
          ⚠️ Este precio no cubre las comisiones de ML
        </div>
      )}
    </div>
  );
};

export default PreciosCalc;
