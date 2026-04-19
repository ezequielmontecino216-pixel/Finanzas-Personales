import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

const CUENTAS = [
  { nombre: 'Naranja X', tipo: 'billetera', moneda: 'ARS', icono: '🟠', color: '#FF6B35' },
  { nombre: 'Lemon Cash', tipo: 'billetera', moneda: 'ARS', icono: '🍋', color: '#FFD700' },
  { nombre: 'Uala', tipo: 'billetera', moneda: 'ARS', icono: '💜', color: '#8B5CF6' },
  { nombre: 'Pago Fácil', tipo: 'billetera', moneda: 'ARS', icono: '🔵', color: '#3B82F6' },
  { nombre: 'Mercado Pago', tipo: 'billetera', moneda: 'ARS', icono: '💙', color: '#009EE3' },
  { nombre: 'Brubank', tipo: 'billetera', moneda: 'ARS', icono: '🟣', color: '#6366F1' },
  { nombre: 'Banco Galicia', tipo: 'banco', moneda: 'ARS', icono: '🏦', color: '#E11D48' },
  { nombre: 'BNA', tipo: 'banco', moneda: 'ARS', icono: '🏛️', color: '#1D4ED8' },
  { nombre: 'Efectivo', tipo: 'efectivo', moneda: 'ARS', icono: '💵', color: '#22C55E' },
  { nombre: 'Dólares', tipo: 'efectivo', moneda: 'USD', icono: '💵', color: '#16A34A' },
]

const GASTOS_FIJOS = [
  { nombre: 'Gimnasio', monto_estimado: 25000, categoria: 'Salud', metodo_pago: 'efectivo' },
  { nombre: 'Cuota Handball', monto_estimado: 18000, categoria: 'Deporte', metodo_pago: 'transferencia' },
  { nombre: 'Transporte', monto_estimado: null, categoria: 'Transporte', metodo_pago: 'efectivo' },
  { nombre: 'Entretenimiento', monto_estimado: null, categoria: 'Entretenimiento', metodo_pago: 'transferencia' },
  { nombre: 'Salud', monto_estimado: null, categoria: 'Salud', metodo_pago: 'transferencia' },
  { nombre: 'Netflix / Spotify', monto_estimado: null, categoria: 'Suscripciones', metodo_pago: 'debito_automatico' },
  { nombre: 'Servicios (luz, agua, gas)', monto_estimado: null, categoria: 'Hogar', metodo_pago: 'transferencia' },
]

const CUOTAS = [
  { nombre: 'Zapatillas Handball', monto_por_cuota: 36000, cuotas_pagadas: 2, total_cuotas: 3, dia_vencimiento: 11 },
  { nombre: 'Pago mínimo tarjeta', monto_por_cuota: 14000, cuotas_pagadas: 7, total_cuotas: 12, dia_vencimiento: 11 },
  { nombre: 'Préstamo papá', monto_por_cuota: 66700, cuotas_pagadas: 4, total_cuotas: 12, dia_vencimiento: 11 },
  { nombre: 'Pantalón trabajo', monto_por_cuota: 44000, cuotas_pagadas: 0, total_cuotas: 1, dia_vencimiento: 11 },
]

export async function POST(req: Request) {
  try {
    const { clerkUserId, email, nombre } = await req.json()
    const supabase = createServerClient()

    // 1. Crear o buscar usuario
    let { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (!usuario) {
      const { data: nuevo, error } = await supabase
        .from('usuarios')
        .insert({ clerk_user_id: clerkUserId, email, nombre })
        .select('id')
        .single()
      if (error) throw error
      usuario = nuevo
    }

    const uid = usuario!.id

    // 2. Cuentas
    const { data: cuentasExist } = await supabase.from('cuentas').select('nombre').eq('usuario_id', uid)
    const nombresExist = new Set((cuentasExist || []).map((c: any) => c.nombre))
    for (const c of CUENTAS) {
      if (!nombresExist.has(c.nombre)) {
        await supabase.from('cuentas').insert({ ...c, usuario_id: uid })
      }
    }

    // 3. Gastos fijos
    const { data: gfExist } = await supabase.from('gastos_fijos').select('nombre').eq('usuario_id', uid)
    const gfNombres = new Set((gfExist || []).map((g: any) => g.nombre))
    for (const gf of GASTOS_FIJOS) {
      if (!gfNombres.has(gf.nombre)) {
        await supabase.from('gastos_fijos').insert({ ...gf, usuario_id: uid })
      }
    }

    // 4. Cuotas
    const { data: cuotasExist } = await supabase.from('cuotas').select('nombre').eq('usuario_id', uid)
    const cuotasNombres = new Set((cuotasExist || []).map((c: any) => c.nombre))
    for (const cuota of CUOTAS) {
      if (!cuotasNombres.has(cuota.nombre)) {
        await supabase.from('cuotas').insert({ ...cuota, usuario_id: uid })
      }
    }

    // 5. Ahorros
    for (const moneda of ['ARS', 'USD']) {
      await supabase.from('ahorros').upsert(
        { usuario_id: uid, moneda, monto: 0 },
        { onConflict: 'usuario_id,moneda', ignoreDuplicates: true }
      )
    }

    return NextResponse.json({ success: true, usuarioId: uid })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
