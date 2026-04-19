import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/client'
import { procesarMensajeChat } from '@/lib/openai'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { mensaje } = await req.json()
    if (!mensaje?.trim()) return NextResponse.json({ success: false, error: 'Mensaje vacío' }, { status: 400 })

    const supabase = createServerClient()

    const { data: usuario } = await supabase
      .from('usuarios').select('id').eq('clerk_user_id', userId).single()

    if (!usuario) return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })

    // Contexto paralelo
    const [
      { data: cuentas },
      { data: gastosFijos },
      { data: cuotas },
      { data: ahorros },
    ] = await Promise.all([
      supabase.from('cuentas').select('nombre,saldo_actual,moneda').eq('usuario_id', usuario.id).eq('activa', true),
      supabase.from('gastos_fijos').select('nombre').eq('usuario_id', usuario.id).eq('activo', true),
      supabase.from('cuotas').select('nombre,monto_por_cuota,cuotas_pagadas,total_cuotas').eq('usuario_id', usuario.id).eq('activo', true),
      supabase.from('ahorros').select('moneda,monto').eq('usuario_id', usuario.id),
    ])

    const inicioMes = new Date()
    inicioMes.setDate(1)
    const { data: txMes } = await supabase
      .from('transacciones')
      .select('monto,tipo')
      .eq('usuario_id', usuario.id)
      .gte('fecha', inicioMes.toISOString().split('T')[0])

    const totalGastadoMes = (txMes || [])
      .filter((t: any) => t.tipo === 'gasto')
      .reduce((s: number, t: any) => s + Number(t.monto), 0)

    const saldoTotal = (cuentas || [])
      .filter((c: any) => c.moneda === 'ARS')
      .reduce((s: number, c: any) => s + Number(c.saldo_actual), 0)

    const ahorrosARS = Number((ahorros || []).find((a: any) => a.moneda === 'ARS')?.monto || 0)
    const ahorrosUSD = Number((ahorros || []).find((a: any) => a.moneda === 'USD')?.monto || 0)

    const resultado = await procesarMensajeChat(mensaje, {
      cuentas: (cuentas || []).map((c: any) =>
        `${c.nombre} (saldo: $${Number(c.saldo_actual).toLocaleString('es-AR')} ${c.moneda})`
      ),
      gastosFijos: (gastosFijos || []).map((g: any) => g.nombre),
      cuotas: (cuotas || []).map((c: any) =>
        `${c.nombre} — cuota ${c.cuotas_pagadas + 1}/${c.total_cuotas || '?'} — $${Number(c.monto_por_cuota).toLocaleString('es-AR')}`
      ),
      totalGastadoMes,
      saldoTotal,
      ahorrosARS,
      ahorrosUSD,
    })

    return NextResponse.json({ success: true, ...resultado })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
