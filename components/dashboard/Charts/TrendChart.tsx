'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface TrendChartProps {
  data: Array<{ mes: string; ingresos: number; egresos: number }>
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a2035', border: '1px solid rgba(79,142,247,0.2)',
      borderRadius: '12px', padding: '12px 16px', fontSize: '12px',
    }}>
      <div style={{ color: 'rgba(248,250,252,0.5)', marginBottom: '8px', fontWeight: 500 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'rgba(248,250,252,0.6)' }}>{p.name === 'ingresos' ? 'Ingresos' : 'Egresos'}</span>
          <span style={{ fontWeight: 600, color: '#F8FAFC', marginLeft: 'auto', paddingLeft: '16px' }}>
            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px', color: 'rgba(248,250,252,0.2)' }}>Sin datos todavía</span>
      </div>
    )
  }

  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em' }}>Tendencia mensual</div>
          <div style={{ fontSize: '11px', color: 'rgba(248,250,252,0.3)', marginTop: '2px' }}>Últimos 6 meses</div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {[{ color: '#4F8EF7', label: 'Ingresos' }, { color: '#F43F5E', label: 'Egresos' }].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '11px', color: 'rgba(248,250,252,0.4)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#4F8EF7" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#4F8EF7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gEgr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#F43F5E" stopOpacity={0.20} />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis dataKey="mes" tick={{ fill: 'rgba(248,250,252,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(248,250,252,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={48} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="ingresos" stroke="#4F8EF7" strokeWidth={2} fill="url(#gIng)" dot={false} activeDot={{ r: 4, fill: '#4F8EF7', strokeWidth: 0 }} />
          <Area type="monotone" dataKey="egresos"  stroke="#F43F5E" strokeWidth={2} fill="url(#gEgr)" dot={false} activeDot={{ r: 4, fill: '#F43F5E', strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
