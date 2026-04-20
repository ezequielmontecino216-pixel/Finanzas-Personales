import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/client'
import { EliminarMovimiento } from '@/components/movimientos/EliminarMovimiento'
import Link from 'next/link'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

function agruparPorFecha(txs: any[]) {
  const grupos: Record<string, any[]> = {}
  for (const tx of txs) {
    const key = tx.fecha
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(tx)
  }
  return grupos
}

function labelFecha(fechaStr: string) {
  const hoy = new Date()
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
  const fecha = new Date(fechaStr + 'T00:00:00')
  const fmtCorto = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  if (fecha.toDateString() === hoy.toDateString()) return `Hoy · ${fmtCorto}`
  if (fecha.toDateString() === ayer.toDateString()) return `Ayer · ${fmtCorto}`
  return fecha.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' })
}

const CATEGORIA_COLORES: Record<string, string> = {
  'Supermercado': '#22c55e', 'Comidas y salidas': '#f97316', 'Transporte': '#3b82f6',
  'Entretenimiento': '#a855f7', 'Salud': '#ec4899', 'Ropa': '#f59e0b',
  'Cuidado personal': '#06b6d4', 'Hogar': '#84cc16', 'Suscripciones': '#6366f1',
  'Regalos': '#f43f5e', 'Gimnasio': '#10b981', 'Handball': '#0ea5e9',
  'Trabajo': '#64748b', 'Cuota': '#f59e0b', 'Gasto fijo': '#8b5cf6', 'Otros': '#94a3b8',
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ cuenta?: string; tipo?: string; mes?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const sp = await searchParams
  const supabase = createServerClient()
  const { data: usuario } = await supabase.from('usuarios').select('id').eq('clerk_user_id', userId).single()
  if (!usuario) redirect('/dashboard')
  const uid = usuario.id

  const { data: cuentas } = await supabase
    .from('cuentas').select('id,nombre,icono,color')
    .eq('usuario_id', uid).eq('activa', true).order('nombre')

  let query = supabase
    .from('transacciones')
    .select('*, cuenta:cuentas(id,nombre,icono,color,saldo_actual)')
    .eq('usuario_id', uid)
    .order('fecha', { ascending: false })
    .limit(200)

  if (sp.cuenta) query = query.eq('cuenta_id', sp.cuenta)
  if (sp.tipo && sp.tipo !== 'todos') {
    if (sp.tipo === 'gasto') query = query.in('tipo', ['gasto', 'egreso'])
    else query = query.eq('tipo', sp.tipo)
  }
  if (sp.mes) {
    query = query.gte('fecha', `${sp.mes}-01`).lte('fecha', `${sp.mes}-31`)
  }

  const { data: transacciones } = await query
  const txList = transacciones || []

  const totalIngresos = txList.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const totalGastos = txList.filter(t => t.tipo === 'gasto' || t.tipo === 'egreso').reduce((s, t) => s + Number(t.monto), 0)
  const balance = totalIngresos - totalGastos

  const meses: { value: string; label: string }[] = []
  const mesesNombre = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  for (let i = 0; i < 12; i++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
    meses.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${mesesNombre[d.getMonth()]} ${d.getFullYear()}`,
    })
  }

  const buildUrl = (params: Record<string, string>) => {
    const merged = { ...sp as Record<string, string>, ...params }
    const filtered = Object.fromEntries(Object.entries(merged).filter(([, v]) => v && v !== 'todos' && v !== ''))
    const qs = new URLSearchParams(filtered).toString()
    return `/movimientos${qs ? `?${qs}` : ''}`
  }

  const grupos = agruparPorFecha(txList)
  const fechasOrdenadas = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-block',
    transition: 'all 0.15s',
    background: active ? 'rgba(79,142,247,0.18)' : 'rgba(255,255,255,0.04)',
    color: active ? '#4F8EF7' : 'rgba(248,250,252,0.45)',
    border: active ? '1px solid rgba(79,142,247,0.35)' : '1px solid rgba(255,255,255,0.07)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 780, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
            Movimientos
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '4px 0 0' }}>
            {txList.length} transacción{txList.length !== 1 ? 'es' : ''}
            {sp.mes ? ` en ${meses.find(m => m.value === sp.mes)?.label || sp.mes}` : ''}
          </p>
        </div>
        <Link href="/movimientos/nuevo" style={{
          background: '#4F8EF7', color: '#fff', borderRadius: 10,
          padding: '10px 18px', fontSize: 13, fontWeight: 600,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 16px rgba(79,142,247,0.3)',
        }}>
          + Nuevo
        </Link>
      </div>

      {/* Stats compactos */}
      <div className="grid-3col">
        {[
          { label: 'Ingresos', value: fmt(totalIngresos), color: '#22c55e', icon: '↑' },
          { label: 'Gastos', value: fmt(totalGastos), color: '#ef4444', icon: '↓' },
          { label: 'Balance', value: fmt(balance), color: balance >= 0 ? '#22c55e' : '#ef4444', icon: '=' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `${s.color}14`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800, color: s.color,
            }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: s.color, margin: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Fila 1: tipo + mes en la misma línea */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Tipo</span>
          {[
            { value: 'todos', label: 'Todos' },
            { value: 'ingreso', label: '↑ Ingresos' },
            { value: 'gasto', label: '↓ Gastos' },
          ].map(f => (
            <Link key={f.value} href={buildUrl({ tipo: f.value })}
              style={pill((!sp.tipo && f.value === 'todos') || sp.tipo === f.value)}>
              {f.label}
            </Link>
          ))}
        </div>

        {/* Fila 2: cuentas con scroll */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Cuenta</span>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            <Link href={buildUrl({ cuenta: '' })} style={pill(!sp.cuenta)}>Todas</Link>
            {(cuentas || []).map((c: any) => (
              <Link key={c.id} href={buildUrl({ cuenta: c.id })} style={pill(sp.cuenta === c.id)}>
                {c.icono} {c.nombre}
              </Link>
            ))}
          </div>
        </div>

        {/* Fila 3: meses */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Mes</span>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            <Link href={buildUrl({ mes: '' })} style={pill(!sp.mes)}>Todos</Link>
            {meses.map(m => (
              <Link key={m.value} href={buildUrl({ mes: m.value })} style={pill(sp.mes === m.value)}>{m.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Lista agrupada por fecha */}
      {txList.length === 0 ? (
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: '56px 24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 36, margin: '0 0 10px' }}>📭</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(248,250,252,0.4)', margin: 0 }}>Sin movimientos</p>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.2)', margin: '6px 0 20px' }}>
            Registrá tu primer movimiento o usá el Chat IA
          </p>
          <Link href="/movimientos/nuevo" style={{
            background: '#4F8EF7', color: '#fff', borderRadius: 8, padding: '9px 18px',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>+ Nuevo movimiento</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {fechasOrdenadas.map(fecha => (
            <div key={fecha}>
              {/* Label de fecha */}
              <p style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(248,250,252,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                margin: '0 0 8px', paddingLeft: 4,
              }}>
                {labelFecha(fecha)}
              </p>

              {/* Rows del día */}
              <div style={{
                background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                {grupos[fecha].map((tx: any, i: number) => {
                  const esIngreso = tx.tipo === 'ingreso'
                  const cuenta = tx.cuenta as any
                  const cat = tx.categoria || (tx.subtipo === 'cuota' ? 'Cuota' : tx.subtipo === 'gasto_fijo' ? 'Gasto fijo' : null)
                  const catColor = CATEGORIA_COLORES[cat] || '#94a3b8'

                  return (
                    <div key={tx.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < grupos[fecha].length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      {/* Indicador de color categoría */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: esIngreso ? 'rgba(34,197,94,0.1)' : `${catColor}18`,
                        border: `1px solid ${esIngreso ? 'rgba(34,197,94,0.2)' : `${catColor}30`}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15,
                      }}>
                        {esIngreso ? '💰' : tx.subtipo === 'cuota' ? '💳' : tx.subtipo === 'gasto_fijo' ? '📋' : '💸'}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: '#F8FAFC', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {tx.descripcion || cat || (esIngreso ? 'Ingreso' : 'Gasto')}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                          {cuenta?.nombre && (
                            <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)' }}>
                              {cuenta.icono} {cuenta.nombre}
                            </span>
                          )}
                          {cat && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: catColor,
                              background: `${catColor}15`, border: `1px solid ${catColor}30`,
                              borderRadius: 99, padding: '1px 7px',
                            }}>
                              {cat}
                            </span>
                          )}
                          {tx.creado_por_ia && (
                            <span style={{ fontSize: 10, color: '#4F8EF7', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 99, padding: '1px 7px', fontWeight: 600 }}>
                              ✨ IA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Monto */}
                      <span style={{
                        fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                        color: esIngreso ? '#22c55e' : '#F8FAFC',
                      }}>
                        {esIngreso ? '+' : '-'}{fmt(Number(tx.monto))}
                      </span>

                      <EliminarMovimiento
                        transaccionId={tx.id}
                        cuentaId={tx.cuenta_id}
                        monto={Number(tx.monto)}
                        tipo={tx.tipo}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
