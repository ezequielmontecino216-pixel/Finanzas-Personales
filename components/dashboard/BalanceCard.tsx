'use client'

import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

interface BalanceCardProps {
  titulo: string
  monto: number
  moneda: string
  tipo: 'ingreso' | 'egreso' | 'total'
  cambio?: number
  icono?: string
}

const fmt = (valor: number, moneda: string) =>
  moneda === 'ARS'
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor)
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(valor)

const STYLES = {
  ingreso: { color: '#10B981', glow: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.14)', dot: '#10B981' },
  egreso:  { color: '#F43F5E', glow: 'rgba(244,63,94,0.10)',  border: 'rgba(244,63,94,0.14)',  dot: '#F43F5E' },
  total:   { color: '#4F8EF7', glow: 'rgba(79,142,247,0.10)', border: 'rgba(79,142,247,0.14)', dot: '#4F8EF7' },
}

export function BalanceCard({ titulo, monto, moneda, tipo, cambio, icono }: BalanceCardProps) {
  const s = STYLES[tipo]

  return (
    <div
      className="card animate-fade-up"
      style={{
        padding: '22px 24px',
        background: '#111827',
        border: `1px solid ${s.border}`,
        boxShadow: `0 0 40px ${s.glow}, 0 1px 0 rgba(255,255,255,0.04) inset`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow accent top-right */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '120px', height: '120px',
        background: `radial-gradient(circle at 100% 0%, ${s.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(248,250,252,0.4)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {titulo}
        </span>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${s.glow}`, border: `1px solid ${s.border}`,
          fontSize: '14px',
        }}>
          {icono || <TrendingUp size={13} style={{ color: s.color }} />}
        </div>
      </div>

      {/* Monto */}
      <div style={{
        fontSize: '26px', fontWeight: 700, color: s.color,
        letterSpacing: '-0.04em', lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        marginBottom: '12px',
      }}>
        {fmt(monto, moneda)}
      </div>

      {/* Cambio */}
      {cambio !== undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {cambio >= 0
            ? <ArrowUpRight size={13} style={{ color: '#10B981' }} />
            : <ArrowDownRight size={13} style={{ color: '#F43F5E' }} />}
          <span style={{ fontSize: '12px', fontWeight: 500, color: cambio >= 0 ? '#10B981' : '#F43F5E' }}>
            {Math.abs(cambio)}% vs mes anterior
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
          <span style={{ fontSize: '11px', color: 'rgba(248,250,252,0.25)', fontWeight: 400 }}>
            Actualizado ahora
          </span>
        </div>
      )}
    </div>
  )
}
