import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/client'
import { GastosCategoriaChart } from '@/components/dashboard/GastosCategoriaChart'
import { GastosFijosCard } from '@/components/dashboard/GastosFijosCard'
import { CuotasCard } from '@/components/dashboard/CuotasCard'
import Link from 'next/link'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

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

const CATEGORIA_ICONOS: Record<string, string> = {
  'Supermercado': '🛒', 'Comidas y salidas': '🍔', 'Transporte': '🚗',
  'Entretenimiento': '🎬', 'Salud': '💊', 'Ropa': '👕', 'Cuidado personal': '💆',
  'Hogar': '🏠', 'Suscripciones': '📱', 'Regalos': '🎁', 'Gimnasio': '💪',
  'Handball': '🤾', 'Trabajo': '💼', 'Cuota': '💳', 'Gasto fijo': '📋', 'Otros': '📦',
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()
  const supabase = createServerClient()

  // ── Usuario ────────────────────────────────────────────────────────────────
  let { data: usuario } = await supabase
    .from('usuarios').select('id').eq('clerk_user_id', userId).single()

  const esUsuarioNuevo = !usuario
  if (!usuario) {
    const { data: nuevo } = await supabase.from('usuarios').insert({
      clerk_user_id: userId,
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
      nombre: clerkUser?.firstName,
    }).select('id').single()
    usuario = nuevo
  }
  if (!usuario) redirect('/sign-in')
  const uid = usuario.id

  if (esUsuarioNuevo) {
    for (const gf of GASTOS_FIJOS_SEED) await supabase.from('gastos_fijos').insert({ ...gf, usuario_id: uid })
    for (const cuota of CUOTAS_SEED) await supabase.from('cuotas').insert({ ...cuota, usuario_id: uid })
    for (const moneda of ['ARS', 'USD']) await supabase.from('ahorros').insert({ usuario_id: uid, moneda, monto: 0 })
  } else {
    for (const moneda of ['ARS', 'USD']) {
      await supabase.from('ahorros').upsert(
        { usuario_id: uid, moneda, monto: 0 },
        { onConflict: 'usuario_id,moneda', ignoreDuplicates: true }
      )
    }
  }

  // ── Fechas ─────────────────────────────────────────────────────────────────
  const ahora = new Date()
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
  const inicioMes = `${mesActual}-01`
  const mesPrevDate = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const mesAnterior = `${mesPrevDate.getFullYear()}-${String(mesPrevDate.getMonth() + 1).padStart(2, '0')}`
  const inicioMesAnterior = `${mesAnterior}-01`
  const finMesAnterior = `${mesActual}-01`

  // ── Datos ──────────────────────────────────────────────────────────────────
  const [
    { data: cuentas },
    { data: gastosFijos },
    { data: gastosFijosPagos },
    { data: cuotas },
    { data: transacciones },
    { data: txAnterior },
  ] = await Promise.all([
    supabase.from('cuentas').select('*').eq('usuario_id', uid).eq('activa', true).order('nombre'),
    supabase.from('gastos_fijos').select('*').eq('usuario_id', uid),
    supabase.from('gastos_fijos_pagos').select('*').eq('usuario_id', uid).eq('mes', mesActual),
    supabase.from('cuotas').select('*').eq('usuario_id', uid),
    supabase.from('transacciones').select('*, cuenta:cuentas(nombre,icono)')
      .eq('usuario_id', uid).gte('fecha', inicioMes).order('fecha', { ascending: false }),
    supabase.from('transacciones').select('tipo,monto,moneda')
      .eq('usuario_id', uid).gte('fecha', inicioMesAnterior).lt('fecha', finMesAnterior),
  ])

  // ── Saldos ─────────────────────────────────────────────────────────────────
  const todasCuentas = cuentas || []
  const billeteras = todasCuentas.filter((c: any) => c.tipo === 'billetera' && c.moneda === 'ARS' && Number(c.saldo_actual) > 0)
  const bancos = todasCuentas.filter((c: any) => c.tipo === 'banco' && Number(c.saldo_actual) > 0)
  const efectivo = todasCuentas.find((c: any) => c.tipo === 'efectivo' && c.moneda === 'ARS')
  const dolares = todasCuentas.find((c: any) => c.moneda === 'USD')

  const saldoVirtual = billeteras.reduce((s: number, c: any) => s + Number(c.saldo_actual), 0)
  const saldoBancos = bancos.reduce((s: number, c: any) => s + Number(c.saldo_actual), 0)
  const saldoEfectivo = Number(efectivo?.saldo_actual || 0)
  const saldoTotal = saldoVirtual + saldoBancos + saldoEfectivo

  // ── Stats mes actual ───────────────────────────────────────────────────────
  const txMes = transacciones || []
  const ingMes = txMes.filter((t: any) => t.tipo === 'ingreso').reduce((s: number, t: any) => s + Number(t.monto), 0)
  const gastMes = txMes.filter((t: any) => t.tipo === 'gasto' || t.tipo === 'egreso').reduce((s: number, t: any) => s + Number(t.monto), 0)
  const balanceMes = ingMes - gastMes

  // Comparativa
  const gastAnterior = (txAnterior || []).filter((t: any) => t.tipo === 'gasto' || t.tipo === 'egreso').reduce((s: number, t: any) => s + Number(t.monto), 0)
  const pctGastos = gastAnterior > 0 ? Math.round(((gastMes - gastAnterior) / gastAnterior) * 100) : null

  // ── Gastos por categoría ───────────────────────────────────────────────────
  const txGastos = txMes.filter((t: any) => (t.tipo === 'gasto' || t.tipo === 'egreso') && t.moneda === 'ARS')
  const catMap: Record<string, { total: number; txs: any[] }> = {}
  for (const t of txGastos) {
    const cat = t.categoria || 'Otros'
    if (!catMap[cat]) catMap[cat] = { total: 0, txs: [] }
    catMap[cat].total += Number(t.monto)
    catMap[cat].txs.push({ descripcion: t.descripcion, monto: Number(t.monto), fecha: t.fecha, cuenta: (t.cuenta as any)?.nombre || '' })
  }
  const gastosData = Object.entries(catMap).map(([categoria, { total, txs }]) => ({ categoria, total, color: '#4F8EF7', transacciones: txs }))

  // ── Cuotas ─────────────────────────────────────────────────────────────────
  const hoy = ahora.getDate()
  const mesVenc = hoy <= 11 ? ahora.getMonth() + 1 : ahora.getMonth() + 2
  const anioVenc = (hoy > 11 && ahora.getMonth() === 11) ? ahora.getFullYear() + 1 : ahora.getFullYear()
  const fechaVencimiento = `11/${String(mesVenc).padStart(2, '0')}/${anioVenc}`

  // ── Últimos 5 movimientos ──────────────────────────────────────────────────
  const recentTx = txMes.slice(0, 5)

  // ── Cuentas para cards ─────────────────────────────────────────────────────
  const cuentasParaCards = todasCuentas.map((c: any) => ({
    id: c.id, nombre: c.nombre, icono: c.icono || '💳',
    saldo_actual: Number(c.saldo_actual), moneda: c.moneda || 'ARS',
  }))
  const cuentasARS = cuentasParaCards.filter((c: any) => c.moneda === 'ARS')

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const mesesNombre = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const fechaHoy = `${diasSemana[ahora.getDay()]} ${ahora.getDate()} de ${mesesNombre[ahora.getMonth()]}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 860, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
            Hola, {clerkUser?.firstName || 'bienvenido'} 👋
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '3px 0 0' }}>{fechaHoy}</p>
        </div>
        <Link href="/movimientos/nuevo" style={{
          background: '#4F8EF7', color: '#fff', borderRadius: 10,
          padding: '10px 20px', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 16px rgba(79,142,247,0.3)',
        }}>
          + Nuevo movimiento
        </Link>
      </div>

      {/* ── Balance card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #111827 0%, #162033 100%)',
        border: '1px solid rgba(79,142,247,0.18)',
        borderRadius: 20, padding: '28px 28px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow decorativo */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(79,142,247,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Saldo disponible
        </p>
        <p style={{ fontSize: 42, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.03em', margin: '0 0 20px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {fmt(saldoTotal)}
        </p>

        {/* Desglose */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Virtual', value: saldoVirtual },
            { label: 'Bancos', value: saldoBancos },
            { label: 'Efectivo', value: saldoEfectivo },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.3)', margin: '0 0 2px' }}>{s.label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(s.value)}</p>
            </div>
          ))}
          {dolares && Number(dolares.saldo_actual) > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.3)', margin: '0 0 2px' }}>USD</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', margin: 0 }}>
                u$d {Number(dolares.saldo_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {/* Comparativa mes anterior */}
        {pctGastos !== null && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: pctGastos > 0 ? '#ef4444' : '#22c55e',
              background: pctGastos > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              border: `1px solid ${pctGastos > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
              borderRadius: 99, padding: '3px 10px',
            }}>
              {pctGastos > 0 ? '↑' : '↓'} {Math.abs(pctGastos)}%
            </span>
            <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.35)' }}>
              en gastos vs mes anterior · {fmt(gastAnterior)}
            </span>
          </div>
        )}
      </div>

      {/* ── Tus cuentas ── */}
      {todasCuentas.length > 0 && (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Tus cuentas
            </p>
            <Link href="/cuentas" style={{ fontSize: 12, color: '#4F8EF7', textDecoration: 'none', fontWeight: 600 }}>
              Gestionar →
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {todasCuentas.map((c: any) => (
              <Link key={c.id} href={`/movimientos?cuenta=${c.id}`} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: `3px solid ${c.color || '#4F8EF7'}`,
                borderRadius: 12, padding: '12px 16px',
                minWidth: 130, flexShrink: 0,
                textDecoration: 'none', display: 'block',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
              >
                <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.icono} {c.nombre}
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {c.moneda === 'USD'
                    ? `u$d ${Number(c.saldo_actual).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                    : fmt(Number(c.saldo_actual))}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats del mes ── */}
      <div className="grid-3col">
        {[
          { label: 'Ingresos', value: fmt(ingMes), color: '#22c55e', icon: '↑' },
          { label: 'Gastos', value: fmt(gastMes), color: '#ef4444', icon: '↓' },
          { label: 'Balance', value: fmt(balanceMes), color: balanceMes >= 0 ? '#22c55e' : '#ef4444', icon: '=' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: `${s.color}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, color: s.color,
            }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 17, fontWeight: 800, color: s.color, margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gastos fijos + Cuotas ── */}
      <div className="grid-2col">
        <GastosFijosCard
          gastosFijos={(gastosFijos || []).map((gf: any) => ({
            id: gf.id, nombre: gf.nombre,
            monto_estimado: gf.monto_estimado, metodo_pago: gf.metodo_pago,
          }))}
          pagosIds={(gastosFijosPagos || []).filter((p: any) => p.pagado).map((p: any) => p.gasto_fijo_id)}
          usuarioId={uid}
          mesActual={mesActual}
          cuentas={cuentasARS}
        />
        <CuotasCard
          cuotas={(cuotas || []).map((c: any) => ({
            id: c.id, nombre: c.nombre,
            monto_por_cuota: Number(c.monto_por_cuota),
            cuotas_pagadas: Number(c.cuotas_pagadas),
            total_cuotas: c.total_cuotas ? Number(c.total_cuotas) : null,
            dia_vencimiento: Number(c.dia_vencimiento || 11),
            activo: c.activo !== false,
          }))}
          usuarioId={uid}
          fechaVencimiento={fechaVencimiento}
          cuentas={cuentasARS}
        />
      </div>

      {/* ── Últimos movimientos ── */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Últimos movimientos
          </p>
          <Link href="/movimientos" style={{ fontSize: 12, color: '#4F8EF7', textDecoration: 'none', fontWeight: 600 }}>
            Ver todos →
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', margin: 0 }}>Sin movimientos este mes</p>
            <Link href="/movimientos/nuevo" style={{ fontSize: 12, color: '#4F8EF7', textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>
              + Registrar el primero
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentTx.map((tx: any, i: number) => {
              const esIngreso = tx.tipo === 'ingreso'
              const cat = tx.categoria || (tx.subtipo === 'cuota' ? 'Cuota' : tx.subtipo === 'gasto_fijo' ? 'Gasto fijo' : null)
              const icono = CATEGORIA_ICONOS[cat || ''] || (esIngreso ? '💰' : '💸')
              const fecha = new Date(tx.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

              return (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 0',
                  borderBottom: i < recentTx.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: esIngreso ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {icono}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.descripcion || cat || (esIngreso ? 'Ingreso' : 'Gasto')}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '2px 0 0' }}>
                      {fecha}{(tx.cuenta as any)?.nombre ? ` · ${(tx.cuenta as any).icono || ''} ${(tx.cuenta as any).nombre}` : ''}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                    color: esIngreso ? '#22c55e' : '#F8FAFC',
                  }}>
                    {esIngreso ? '+' : '-'}{fmt(Number(tx.monto))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Gráfico por categoría ── */}
      {gastosData.length > 0 && <GastosCategoriaChart gastosData={gastosData} />}

    </div>
  )
}
