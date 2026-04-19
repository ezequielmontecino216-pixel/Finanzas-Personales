import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/client'
import { GastosCategoriaChart } from '@/components/dashboard/GastosCategoriaChart'
import { GastosFijosCard } from '@/components/dashboard/GastosFijosCard'
import { CuotasCard } from '@/components/dashboard/CuotasCard'
import Link from 'next/link'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

// ── Datos iniciales ────────────────────────────────────────────────────────
const CUENTAS_SEED = [
  { nombre: 'Naranja X', tipo: 'billetera', moneda: 'ARS', icono: '🟠', color: '#FF6B35' },
  { nombre: 'Lemon Cash', tipo: 'billetera', moneda: 'ARS', icono: '🍋', color: '#FFD700' },
  { nombre: 'Uala', tipo: 'billetera', moneda: 'ARS', icono: '💜', color: '#8B5CF6' },
  { nombre: 'Pago Fácil', tipo: 'billetera', moneda: 'ARS', icono: '🔵', color: '#3B82F6' },
  { nombre: 'Mercado Pago', tipo: 'billetera', moneda: 'ARS', icono: '💙', color: '#009EE3' },
  { nombre: 'Brubank', tipo: 'billetera', moneda: 'ARS', icono: '🟣', color: '#6366F1' },
  { nombre: 'Banco Galicia', tipo: 'banco', moneda: 'ARS', icono: '🏦', color: '#E11D48' },
  { nombre: 'BNA', tipo: 'banco', moneda: 'ARS', icono: '🏛️', color: '#1D4ED8' },
  { nombre: 'Efectivo ARS', tipo: 'efectivo', moneda: 'ARS', icono: '💵', color: '#22C55E' },
  { nombre: 'Dólares', tipo: 'efectivo', moneda: 'USD', icono: '💵', color: '#16A34A' },
]

const GASTOS_FIJOS_SEED = [
  { nombre: 'Gimnasio', monto_estimado: 25000, categoria: 'Salud', metodo_pago: 'efectivo' },
  { nombre: 'Cuota Handball', monto_estimado: 18000, categoria: 'Deporte', metodo_pago: 'transferencia' },
]

const CUOTAS_SEED = [
  { nombre: 'Zapatillas Handball', monto_por_cuota: 36000, cuotas_pagadas: 2, total_cuotas: 3, dia_vencimiento: 11 },
  { nombre: 'Pago mínimo tarjeta', monto_por_cuota: 14000, cuotas_pagadas: 7, total_cuotas: 12, dia_vencimiento: 11 },
  { nombre: 'Préstamo papá', monto_por_cuota: 66700, cuotas_pagadas: 4, total_cuotas: 12, dia_vencimiento: 11 },
  { nombre: 'Pantalón trabajo', monto_por_cuota: 44000, cuotas_pagadas: 0, total_cuotas: 1, dia_vencimiento: 11 },
]

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()
  const supabase = createServerClient()

  // ── 1. Crear usuario si no existe ────────────────────────────────────────
  let { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!usuario) {
    const { data: nuevo } = await supabase
      .from('usuarios')
      .insert({
        clerk_user_id: userId,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        nombre: clerkUser?.firstName,
      })
      .select('id')
      .single()
    usuario = nuevo
  }

  if (!usuario) redirect('/sign-in')
  const uid = usuario.id

  // ── 2. Seedear gastos fijos si faltan ────────────────────────────────────
  const { data: gfCheck, error: gfErr } = await supabase
    .from('gastos_fijos')
    .select('id')
    .eq('usuario_id', uid)
    .limit(1)

  console.log('[SETUP] gastos_fijos check:', gfCheck, gfErr)

  if (!gfCheck || gfCheck.length === 0) {
    for (const gf of GASTOS_FIJOS_SEED) {
      const res = await supabase.from('gastos_fijos').insert({ ...gf, usuario_id: uid })
      console.log('[SETUP] insert gasto_fijo:', gf.nombre, res.error)
    }
  }

  // ── 3. Seedear cuotas si faltan ──────────────────────────────────────────
  const { data: cuotasCheck, error: cuErr } = await supabase
    .from('cuotas')
    .select('id')
    .eq('usuario_id', uid)
    .limit(1)

  console.log('[SETUP] cuotas check:', cuotasCheck, cuErr)

  if (!cuotasCheck || cuotasCheck.length === 0) {
    for (const cuota of CUOTAS_SEED) {
      const res = await supabase.from('cuotas').insert({ ...cuota, usuario_id: uid })
      console.log('[SETUP] insert cuota:', cuota.nombre, res.error)
    }
  }

  // ── 4. Seedear ahorros si faltan ─────────────────────────────────────────
  for (const moneda of ['ARS', 'USD']) {
    await supabase.from('ahorros').upsert(
      { usuario_id: uid, moneda, monto: 0 },
      { onConflict: 'usuario_id,moneda', ignoreDuplicates: true }
    )
  }

  // ── 5. Cargar todos los datos ────────────────────────────────────────────
  const ahora = new Date()
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const inicioMes = `${mesActual}-01`

  const [
    { data: cuentas },
    { data: gastosFijos },
    { data: gastosFijosPagos },
    { data: cuotas },
    { data: ahorros },
    { data: transacciones },
  ] = await Promise.all([
    supabase.from('cuentas').select('*').eq('usuario_id', uid).eq('activa', true).order('nombre'),
    supabase.from('gastos_fijos').select('*').eq('usuario_id', uid),
    supabase.from('gastos_fijos_pagos').select('*').eq('usuario_id', uid).eq('mes', mesActual),
    supabase.from('cuotas').select('*').eq('usuario_id', uid),
    supabase.from('ahorros').select('*').eq('usuario_id', uid),
    supabase
      .from('transacciones')
      .select('*, cuenta:cuentas(nombre)')
      .eq('usuario_id', uid)
      .gte('fecha', inicioMes)
      .order('fecha', { ascending: false }),
  ])

  // ── Cálculo de saldos ────────────────────────────────────────────────────
  const todasCuentas = cuentas || []
  const billeteras = todasCuentas.filter((c: any) => c.tipo === 'billetera' && c.moneda === 'ARS' && Number(c.saldo_actual) > 0)
  const bancos = todasCuentas.filter((c: any) => c.tipo === 'banco' && Number(c.saldo_actual) > 0)
  const efectivo = todasCuentas.find((c: any) => c.tipo === 'efectivo' && c.moneda === 'ARS')
  const dolares = todasCuentas.find((c: any) => c.moneda === 'USD')

  const saldoVirtual = billeteras.reduce((s: number, c: any) => s + Number(c.saldo_actual), 0)
  const saldoBancos = bancos.reduce((s: number, c: any) => s + Number(c.saldo_actual), 0)
  const saldoEfectivo = Number(efectivo?.saldo_actual || 0)
  const saldoTotal = saldoVirtual + saldoBancos + saldoEfectivo

  const ahorroARS = Number((ahorros || []).find((a: any) => a.moneda === 'ARS')?.monto || 0)
  const ahorroUSD = Number((ahorros || []).find((a: any) => a.moneda === 'USD')?.monto || 0)

  // ── Gastos por categoría (solo ARS, solo gastos) ─────────────────────────
  const txGastos = (transacciones || []).filter((t: any) =>
    (t.tipo === 'gasto' || t.tipo === 'egreso') && t.moneda === 'ARS'
  )
  const catMap: Record<string, { total: number; txs: any[] }> = {}
  for (const t of txGastos) {
    const cat = t.categoria || 'Otros'
    if (!catMap[cat]) catMap[cat] = { total: 0, txs: [] }
    catMap[cat].total += Number(t.monto)
    catMap[cat].txs.push({
      descripcion: t.descripcion,
      monto: Number(t.monto),
      fecha: t.fecha,
      cuenta: (t.cuenta as any)?.nombre || '',
    })
  }
  const gastosData = Object.entries(catMap).map(([categoria, { total, txs }]) => ({
    categoria, total, color: '#4F8EF7', transacciones: txs,
  }))

  // ── Gastos fijos con estado de pago ──────────────────────────────────────
  const pagosMap = new Map((gastosFijosPagos || []).map((p: any) => [p.gasto_fijo_id, p]))

  // ── Cuotas activas y vencimiento ─────────────────────────────────────────
  // Cuotas activas: que no estén completamente pagadas
  const cuotasActivas = (cuotas || []).filter((c: any) =>
    c.activo !== false && !(c.total_cuotas && Number(c.cuotas_pagadas) >= Number(c.total_cuotas))
  )
  const hoy = ahora.getDate()
  const mesVenc = hoy <= 11 ? ahora.getMonth() + 1 : ahora.getMonth() + 2
  const anioVenc = (hoy > 11 && ahora.getMonth() === 11) ? ahora.getFullYear() + 1 : ahora.getFullYear()
  const fechaVencimiento = `11/${String(mesVenc).padStart(2, '0')}/${anioVenc}`

  const totalCuotasMes = cuotasActivas.reduce((s: number, c: any) => s + Number(c.monto_por_cuota), 0)
  const totalGastosFijos = (gastosFijos || []).reduce((s: number, g: any) => s + Number(g.monto_estimado || 0), 0)

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const mesesNombre = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const fechaHoy = `${diasSemana[ahora.getDay()]} ${ahora.getDate()} de ${mesesNombre[ahora.getMonth()]}`

  const cuentasConSaldo = [...billeteras, ...bancos, ...(efectivo && Number(efectivo.saldo_actual) > 0 ? [efectivo] : [])]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
            Hola, {clerkUser?.firstName || 'bienvenido'} 👋
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '4px 0 0' }}>{fechaHoy}</p>
        </div>
        <Link
          href="/movimientos/nuevo"
          style={{
            background: '#4F8EF7', color: '#fff', borderRadius: 10,
            padding: '10px 18px', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          + Nuevo movimiento
        </Link>
      </div>

      {/* Saldo + Ahorros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Saldo para gastar */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
            Saldo para gastar
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.03em', margin: '0 0 16px', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(saldoTotal)}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>Virtual</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#F8FAFC' }}>{fmt(saldoVirtual)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>Bancos</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#F8FAFC' }}>{fmt(saldoBancos)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>Efectivo</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#F8FAFC' }}>{fmt(saldoEfectivo)}</span>
            </div>
            {dolares && Number(dolares.saldo_actual) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6, marginTop: 2 }}>
                <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>USD</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
                  u$d {Number(dolares.saldo_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ahorros */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Ahorros
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '0 0 4px' }}>Pesos ARS</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: ahorroARS > 0 ? '#22c55e' : 'rgba(248,250,252,0.2)', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(ahorroARS)}
              </p>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '0 0 4px' }}>Dólares USD</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: ahorroUSD > 0 ? '#22c55e' : 'rgba(248,250,252,0.2)', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                u$d {ahorroUSD.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cuentas con saldo */}
      {cuentasConSaldo.length > 0 && (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
            Tus cuentas
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {cuentasConSaldo.map((c: any) => (
              <div key={c.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: `3px solid ${c.color || '#4F8EF7'}`,
                borderRadius: 10, padding: '10px 14px', minWidth: 140,
              }}>
                <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>{c.icono} {c.nombre}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(Number(c.saldo_actual))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gastos fijos + Cuotas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Gastos fijos — componente interactivo */}
        <GastosFijosCard
          gastosFijos={(gastosFijos || []).map((gf: any) => ({
            id: gf.id,
            nombre: gf.nombre,
            monto_estimado: gf.monto_estimado,
            metodo_pago: gf.metodo_pago,
          }))}
          pagosIds={(gastosFijosPagos || [])
            .filter((p: any) => p.pagado === true)
            .map((p: any) => p.gasto_fijo_id)}
          usuarioId={uid}
          mesActual={mesActual}
        />

        {/* Cuotas — componente interactivo */}
        <CuotasCard
          cuotas={(cuotas || []).map((c: any) => ({
            id: c.id,
            nombre: c.nombre,
            monto_por_cuota: Number(c.monto_por_cuota),
            cuotas_pagadas: Number(c.cuotas_pagadas),
            total_cuotas: c.total_cuotas ? Number(c.total_cuotas) : null,
            dia_vencimiento: Number(c.dia_vencimiento || 11),
            activo: c.activo !== false,
          }))}
          usuarioId={uid}
          fechaVencimiento={fechaVencimiento}
        />
      </div>

      {/* Gráfico de gastos por categoría */}
      <GastosCategoriaChart gastosData={gastosData} />

    </div>
  )
}
