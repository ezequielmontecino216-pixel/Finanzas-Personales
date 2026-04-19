'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { Transaccion } from '@/types'

interface TransactionListProps {
  transacciones: Transaccion[]
}

const fmtMonto = (monto: number, moneda: string) =>
  moneda === 'ARS'
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(monto)
    : `${moneda} ${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

const fmtFecha = (fecha: string) =>
  new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

export function TransactionList({ transacciones }: TransactionListProps) {
  if (transacciones.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(248,250,252,0.2)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>○</div>
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Sin transacciones todavía</p>
        <p style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(248,250,252,0.15)' }}>
          Usá el Chat IA o el formulario para agregar una
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {transacciones.map((t, i) => (
        <div
          key={t.id}
          className="animate-fade-up"
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '13px 16px',
            borderRadius: '12px',
            background: 'transparent',
            border: '1px solid transparent',
            transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
            cursor: 'default',
            animationDelay: `${i * 30}ms`,
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.background = 'rgba(255,255,255,0.025)'
            el.style.borderColor = 'rgba(255,255,255,0.06)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.background = 'transparent'
            el.style.borderColor = 'transparent'
          }}
        >
          {/* Ícono */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
            background: t.tipo === 'ingreso' ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
            border: `1px solid ${t.tipo === 'ingreso' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}`,
          }}>
            {(t.categoria as any)?.icono || (t.tipo === 'ingreso' ? '↑' : '↓')}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
              {t.descripcion || (t.categoria as any)?.nombre || 'Sin descripción'}
            </div>
            <div style={{ fontSize: '11.5px', color: 'rgba(248,250,252,0.3)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{(t.cuenta as any)?.nombre || '—'}</span>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(248,250,252,0.2)', display: 'inline-block' }} />
              <span>{fmtFecha(t.fecha)}</span>
              {t.creado_por_ia && (
                <>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(248,250,252,0.2)', display: 'inline-block' }} />
                  <span style={{ color: '#4F8EF7', fontWeight: 600, fontSize: '10px', letterSpacing: '0.03em' }}>IA</span>
                </>
              )}
            </div>
          </div>

          {/* Monto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
            {t.tipo === 'ingreso'
              ? <ArrowUpRight size={13} style={{ color: '#10B981' }} />
              : <ArrowDownRight size={13} style={{ color: '#F43F5E' }} />}
            <span style={{
              fontSize: '13.5px', fontWeight: 600,
              color: t.tipo === 'ingreso' ? '#10B981' : '#F43F5E',
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            }}>
              {fmtMonto(t.monto, t.moneda)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
