import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/client'
import { EliminarMovimiento } from '@/components/movimientos/EliminarMovimiento'
import Link from 'next/link'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string; tipo?: string; mes?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // ← Next.js 15+ searchParams es una Promise, hay que awaitearlo
  const sp = await searchParams

  const supabase = createServerClient()
  const { data: usuario } = await supabase.from('usuarios').select('id').eq('clerk_user_id', userId).single()
  if (!usuario) redirect('/dashboard')

  const uid = usuario.id

  const { data: cuentas } = await supabase
    .from('cuentas')
    .select('id,nombre,icono,color')
    .eq('usuario_id', uid)
    .eq('activa', true)
    .order('nombre')

  // Query con filtros
  let query = supabase
    .from('transacciones')
    .select('*, cuenta:cuentas(id,nombre,icono,color,saldo_actual)')
    .eq('usuario_id', uid)
    .order('fecha', { ascending: false })
    .limit(200)

  if (sp.cuenta) query = query.eq('cuenta_id', sp.cuenta)
  if (sp.tipo && sp.tipo !== 'todos') {
    // Compatibilidad con tipo 'egreso' (viejo) y 'gasto' (nuevo)
    if (sp.tipo === 'gasto') {
      query = query.in('tipo', ['gasto', 'egreso'])
    } else {
      query = query.eq('tipo', sp.tipo)
    }
  }
  if (sp.mes) {
    query = query
      .gte('fecha', `${sp.mes}-01`)
      .lte('fecha', `${sp.mes}-31`)
  }

  const { data: transacciones } = await query

  const txList = transacciones || []
  const totalIngresos = txList
    .filter(t => t.tipo === 'ingreso')
    .reduce((s, t) => s + Number(t.monto), 0)
  const totalGastos = txList
    .filter(t => t.tipo === 'gasto' || t.tipo === 'egreso')
    .reduce((s, t) => s + Number(t.monto), 0)

  // Últimos 12 meses para el filtro
  const meses: { value: string; label: string }[] = []
  const mesesNombre = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${mesesNombre[d.getMonth()]} ${d.getFullYear()}`
    meses.push({ value, label })
  }

  const tipoIcono = (tipo: string, subtipo?: string | null) => {
    if (tipo === 'ingreso') return '💰'
    if (subtipo === 'gasto_fijo') return '📋'
    if (subtipo === 'cuota') return '💳'
    return '💸'
  }

  const buildUrl = (params: Record<string, string>) => {
    const merged: Record<string, string> = { ...sp as Record<string, string>, ...params }
    const filtered = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v && v !== 'todos' && v !== '')
    )
    const qs = new URLSearchParams(filtered).toString()
    return `/movimientos${qs ? `?${qs}` : ''}`
  }

  const pillBase: React.CSSProperties = {
    padding: '5px 13px', borderRadius: 99, fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-block',
  }
  const pillActive: React.CSSProperties = {
    background: 'rgba(79,142,247,0.18)', color: '#4F8EF7',
    border: '1px solid rgba(79,142,247,0.35)',
  }
  const pillInactive: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', color: 'rgba(248,250,252,0.45)',
    border: '1px solid rgba(255,255,255,0.07)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
            Movimientos
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '4px 0 0' }}>
            Todos tus ingresos y gastos en un solo lugar
          </p>
        </div>
        <Link
          href="/movimientos/nuevo"
          style={{
            background: '#4F8EF7', color: '#fff', borderRadius: 10,
            padding: '10px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          + Nuevo
        </Link>
      </div>

      {/* Stats */}
      <div className="grid-3col">
        {[
          { label: 'Ingresos', value: fmt(totalIngresos), color: '#22c55e', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.15)' },
          { label: 'Gastos', value: fmt(totalGastos), color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.15)' },
          { label: 'Movimientos', value: `${txList.length}`, color: '#F8FAFC', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: s.color, margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Tipo */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { value: 'todos', label: 'Todos' },
            { value: 'ingreso', label: '💰 Ingresos' },
            { value: 'gasto', label: '💸 Gastos' },
          ].map(f => {
            const isActive = (!sp.tipo && f.value === 'todos') || sp.tipo === f.value
            return (
              <Link key={f.value} href={buildUrl({ tipo: f.value })}
                style={{ ...pillBase, ...(isActive ? pillActive : pillInactive) }}>
                {f.label}
              </Link>
            )
          })}
        </div>

        {/* Cuenta */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={buildUrl({ cuenta: '' })}
            style={{ ...pillBase, ...(!sp.cuenta ? pillActive : pillInactive) }}>
            Todas las cuentas
          </Link>
          {(cuentas || []).map((c: any) => {
            const isActive = sp.cuenta === c.id
            return (
              <Link key={c.id} href={buildUrl({ cuenta: c.id })}
                style={{ ...pillBase, ...(isActive ? pillActive : pillInactive) }}>
                {c.icono} {c.nombre}
              </Link>
            )
          })}
        </div>

        {/* Mes */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          <Link href={buildUrl({ mes: '' })}
            style={{ ...pillBase, ...(!sp.mes ? pillActive : pillInactive) }}>
            Todos los meses
          </Link>
          {meses.map(m => {
            const isActive = sp.mes === m.value
            return (
              <Link key={m.value} href={buildUrl({ mes: m.value })}
                style={{ ...pillBase, ...(isActive ? pillActive : pillInactive) }}>
                {m.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
        {txList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>📭</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(248,250,252,0.4)', margin: 0 }}>Sin movimientos</p>
            <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.25)', margin: '6px 0 0' }}>
              Registrá tu primer movimiento o usá el Chat IA
            </p>
          </div>
        ) : (
          txList.map((tx: any, i: number) => {
            const esIngreso = tx.tipo === 'ingreso'
            const cuenta = tx.cuenta as any
            return (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 18px',
                borderBottom: i < txList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                {/* Icono */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: esIngreso ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {tipoIcono(tx.tipo, tx.subtipo)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 600, color: '#F8FAFC', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tx.descripcion || tx.categoria || (esIngreso ? 'Ingreso' : 'Gasto')}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '3px 0 0' }}>
                    {new Date(tx.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {cuenta?.nombre ? ` · ${cuenta.nombre}` : ''}
                    {tx.categoria ? ` · ${tx.categoria}` : ''}
                    {tx.creado_por_ia ? ' · ✨ IA' : ''}
                  </p>
                </div>

                {/* Monto */}
                <span style={{
                  fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  color: esIngreso ? '#22c55e' : '#ef4444',
                }}>
                  {esIngreso ? '+' : '-'}{fmt(Number(tx.monto))}
                </span>

                {/* Eliminar */}
                <EliminarMovimiento
                  transaccionId={tx.id}
                  cuentaId={tx.cuenta_id}
                  monto={Number(tx.monto)}
                  tipo={tx.tipo}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
