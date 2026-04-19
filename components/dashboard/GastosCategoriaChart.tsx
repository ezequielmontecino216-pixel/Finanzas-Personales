'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type GastoCategoria = {
  categoria: string
  total: number
  color: string
  transacciones: { descripcion: string; monto: number; fecha: string; cuenta: string }[]
}

const COLORES: Record<string, string> = {
  'Supermercado': '#4F8EF7',
  'Comidas y salidas': '#F59E0B',
  'Transporte': '#10B981',
  'Entretenimiento': '#8B5CF6',
  'Salud': '#EF4444',
  'Ropa': '#EC4899',
  'Cuidado personal': '#06B6D4',
  'Hogar': '#F97316',
  'Suscripciones': '#6366F1',
  'Regalos': '#14B8A6',
  'Gimnasio': '#84CC16',
  'Handball': '#A3E635',
  'Trabajo': '#78716C',
  'Otros': '#9CA3AF',
}

function getColor(categoria: string): string {
  return COLORES[categoria] || '#9CA3AF'
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

export function GastosCategoriaChart({ gastosData }: { gastosData: GastoCategoria[] }) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null)

  if (!gastosData || gastosData.length === 0) {
    return (
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, padding: 24, textAlign: 'center',
      }}>
        <p style={{ color: 'rgba(248,250,252,0.3)', fontSize: 13 }}>Sin gastos registrados este mes</p>
      </div>
    )
  }

  const data = gastosData.map(g => ({ ...g, color: getColor(g.categoria) }))
  const total = data.reduce((s, g) => s + g.total, 0)
  const txSeleccionadas = data.find(g => g.categoria === seleccionada)?.transacciones || []

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const item = payload[0].payload
    return (
      <div style={{
        background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, padding: '8px 12px',
      }}>
        <p style={{ color: '#F8FAFC', fontSize: 13, fontWeight: 600, margin: 0 }}>{item.categoria}</p>
        <p style={{ color: '#4F8EF7', fontSize: 13, margin: '2px 0 0' }}>{fmt(item.total)}</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Gastos del mes</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#F8FAFC', margin: '4px 0 0', letterSpacing: '-0.02em' }}>{fmt(total)}</p>
        </div>
        {seleccionada && (
          <button
            onClick={() => setSeleccionada(null)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(248,250,252,0.5)', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Donut chart */}
        <div style={{ width: 180, height: 180, flexShrink: 0, cursor: 'pointer' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                dataKey="total"
                onClick={(entry: any) => setSeleccionada(entry.categoria === seleccionada ? null : entry.categoria)}
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    opacity={seleccionada && seleccionada !== entry.categoria ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.sort((a, b) => b.total - a.total).map((g) => {
            const pct = total > 0 ? (g.total / total) * 100 : 0
            const isSelected = seleccionada === g.categoria
            return (
              <button
                key={g.categoria}
                onClick={() => setSeleccionada(isSelected ? null : g.categoria)}
                style={{
                  background: isSelected ? 'rgba(79,142,247,0.08)' : 'transparent',
                  border: isSelected ? '1px solid rgba(79,142,247,0.2)' : '1px solid transparent',
                  borderRadius: 8, padding: '6px 10px', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 500 }}>{g.categoria}</span>
                  </span>
                  <span style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 600 }}>{fmt(g.total)}</span>
                </div>
                <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                  <div style={{ width: `${pct}%`, height: 2, background: g.color, borderRadius: 99 }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Transactions for selected category */}
      {seleccionada && txSeleccionadas.length > 0 && (
        <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            {seleccionada} — {txSeleccionadas.length} movimientos
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {txSeleccionadas.map((tx, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <div>
                  <p style={{ fontSize: 13, color: '#F8FAFC', margin: 0 }}>{tx.descripcion || '—'}</p>
                  <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '2px 0 0' }}>
                    {new Date(tx.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    {tx.cuenta ? ` · ${tx.cuenta}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>-{fmt(tx.monto)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
