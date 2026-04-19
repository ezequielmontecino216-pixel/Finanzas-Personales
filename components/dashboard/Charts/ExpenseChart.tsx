'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface ExpenseChartProps {
  data: Array<{ categoria: string; total: number; color: string }>
}

const PALETTE = ['#4F8EF7','#818cf8','#a78bfa','#c084fc','#e879f9','#f472b6','#fb7185','#fb923c']

const fmt = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v)

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{
      background: '#1a2035', border: '1px solid rgba(79,142,247,0.2)',
      borderRadius: '10px', padding: '10px 14px', fontSize: '12px',
    }}>
      <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: '2px' }}>{name}</div>
      <div style={{ color: '#4F8EF7', fontWeight: 600 }}>{fmt(value)}</div>
    </div>
  )
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const total = data.reduce((s, d) => s + d.total, 0)

  if (data.length === 0) {
    return (
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.2)' }}>Sin egresos este mes</span>
      </div>
    )
  }

  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em' }}>Egresos por categoría</div>
        <div style={{ fontSize: '11px', color: 'rgba(248,250,252,0.3)', marginTop: '2px' }}>Este mes</div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        {/* Donut */}
        <div style={{ flexShrink: 0 }}>
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={65} innerRadius={42} paddingAngle={2} strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.slice(0, 5).map((d, i) => {
            const pct = total > 0 ? (d.total / total) * 100 : 0
            return (
              <div key={d.categoria}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                    <span style={{ fontSize: '11.5px', color: 'rgba(248,250,252,0.55)', fontWeight: 450 }}>{d.categoria}</span>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#F8FAFC', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: PALETTE[i % PALETTE.length], borderRadius: '99px', transition: 'width 600ms ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
