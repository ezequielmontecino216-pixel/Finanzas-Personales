import { supabase } from './client'
import type { Cuenta, Transaccion } from '@/types'

// ─── CUENTAS ───────────────────────────────────────────────────────────────

export async function obtenerCuentas(usuarioId: string): Promise<Cuenta[]> {
  const { data, error } = await supabase
    .from('cuentas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activa', true)
    .order('nombre')

  if (error) throw error
  return data || []
}

export async function obtenerBalanceTotal(usuarioId: string, moneda: string): Promise<number> {
  const { data, error } = await supabase
    .from('cuentas')
    .select('saldo_actual')
    .eq('usuario_id', usuarioId)
    .eq('moneda', moneda)
    .eq('activa', true)

  if (error) throw error
  return (data || []).reduce((sum, c) => sum + Number(c.saldo_actual), 0)
}

// ─── CATEGORÍAS ────────────────────────────────────────────────────────────

export async function obtenerCategorias(usuarioId: string): Promise<any[]> {
  return []
}

// ─── TRANSACCIONES ─────────────────────────────────────────────────────────

export async function obtenerTransaccionesRecientes(
  usuarioId: string,
  limit = 10
): Promise<Transaccion[]> {
  const { data, error } = await supabase
    .from('transacciones')
    .select(`
      *,
      cuenta:cuentas(nombre, icono, color),
      categoria:categorias(nombre, icono, color)
    `)
    .eq('usuario_id', usuarioId)
    .order('fecha', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function obtenerTransaccionesMes(usuarioId: string): Promise<Transaccion[]> {
  const inicio = new Date()
  inicio.setDate(1)
  inicio.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('transacciones')
    .select(`
      *,
      cuenta:cuentas(nombre, icono),
      categoria:categorias(nombre, icono, color)
    `)
    .eq('usuario_id', usuarioId)
    .gte('fecha', inicio.toISOString().split('T')[0])
    .order('fecha', { ascending: false })

  if (error) throw error
  return data || []
}

export async function obtenerGastosPorCategoria(
  usuarioId: string
): Promise<{ categoria: string; total: number; color: string }[]> {
  const inicio = new Date()
  inicio.setDate(1)

  const { data, error } = await supabase
    .from('transacciones')
    .select('monto, categorias(nombre, color)')
    .eq('usuario_id', usuarioId)
    .eq('tipo', 'egreso')
    .gte('fecha', inicio.toISOString().split('T')[0])

  if (error) throw error

  const agrupado: Record<string, { total: number; color: string }> = {}
  for (const t of data || []) {
    const cat = (t.categorias as any)?.nombre || 'Sin categoría'
    const color = (t.categorias as any)?.color || '#6b7280'
    if (!agrupado[cat]) agrupado[cat] = { total: 0, color }
    agrupado[cat].total += Number(t.monto)
  }

  return Object.entries(agrupado).map(([categoria, { total, color }]) => ({
    categoria,
    total,
    color,
  }))
}

export async function obtenerTendenciaMensual(
  usuarioId: string
): Promise<{ mes: string; ingresos: number; egresos: number }[]> {
  const hace6Meses = new Date()
  hace6Meses.setMonth(hace6Meses.getMonth() - 5)
  hace6Meses.setDate(1)

  const { data, error } = await supabase
    .from('transacciones')
    .select('tipo, monto, fecha')
    .eq('usuario_id', usuarioId)
    .gte('fecha', hace6Meses.toISOString().split('T')[0])

  if (error) throw error

  const meses: Record<string, { ingresos: number; egresos: number }> = {}
  for (const t of data || []) {
    const fecha = new Date(t.fecha)
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    if (!meses[clave]) meses[clave] = { ingresos: 0, egresos: 0 }
    if (t.tipo === 'ingreso') meses[clave].ingresos += Number(t.monto)
    else meses[clave].egresos += Number(t.monto)
  }

  return Object.entries(meses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valores]) => ({ mes, ...valores }))
}

// ─── INVERSIONES ───────────────────────────────────────────────────────────

export async function obtenerInversiones(usuarioId: string): Promise<any[]> {
  return []
}
