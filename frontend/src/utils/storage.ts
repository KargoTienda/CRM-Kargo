/**
 * Almacenamiento en Supabase — reemplaza localStorage e IndexedDB.
 * Los datos viven en la nube, persisten entre dispositivos y deployments.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!,
);

export async function idbGet<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('kargo_store')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) { console.error('[storage] get error:', error.message); return null; }
  return data?.value ?? null;
}

export async function idbSet(key: string, value: any): Promise<void> {
  const { error } = await supabase
    .from('kargo_store')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) console.error('[storage] set error:', error.message);
}
