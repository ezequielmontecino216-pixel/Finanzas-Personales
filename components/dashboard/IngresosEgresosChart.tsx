'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type MonthData = {
  label: string
  ingresos: number
  gastos: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, notation: 'compact' }).format(n)

const fmtFull = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', minWidth: 160,
    }}>
      <p style={{ color: 'rgba(248,250,252,0.5)', fontSize: 11, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: p.fill, fontWeight: 600 }}>
            {p.name === 'ingresos' ? '↑ Ingresos' : '↓ Gastos'}
          </span>
          <span style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 700 }}>{fmtFull(p.value)}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>Balance</span>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: (payload[0]?.value - (payload[1]?.value || 0)) >= 0 ? '#22c55e' : '#ef4444',
          }}>
            {fmtFull((payload[0]?.value || 0) - (payload[1]?.value || 0))}
          </span>
        </div>
      </div>
    </div>
  )
}

export function IngresosEgresosChart({ data }: { data: MonthData[] }) {
  if (!data || data.length === 0) return null

  const mesActual = data[data.length - 1]
  const balanceActual = mesActual.ingresos - mesActual.gastos

  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Ingresos vs Egresos
          </p>
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '4px 0 0' }}>
            Últimos {data.length} meses
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} />
            <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.5)' }}>Ingresos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} />
            <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.5)' }}>Gastos</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4} barCategoryGap="30%">
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(248,250,252,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmt}
            tick={{ fill: 'rgba(248,250,252,0.25)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>

      {/* Balance mes actual */}
      <div style={{
        marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>
          Balance {mesActual.label}
        </span>
        <span style={{
          fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
          color: balanceActual >= 0 ? '#22c55e' : '#ef4444',
        }}>
          {balanceActual >= 0 ? '+' : ''}{fmtFull(balanceActual)}
        </span>
      </div>
    </div>
  )
}
