'use client'

import { useState } from 'react'
import { ArrowRight, Calendar, Sparkles } from 'lucide-react'
interface TransferenciaCardProps {
  transferencia: any
}

export function TransferenciaCard({ transferencia: t }: TransferenciaCardProps) {
  const [abierto, setAbierto] = useState(false)

  const formatMonto = (monto: number, moneda: string) => {
    if (moneda === 'ARS') {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
      }).format(monto)
    }
    return `${moneda} ${Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  }

  const formatFecha = (fecha: string) =>
    new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const origen = (t.cuenta_origen as any)
  const destino = (t.cuenta_destino as any)

  const getTipoCuenta = (tipo: string) => {
    if (tipo === 'efectivo') return '💵'
    if (tipo === 'banco') return '🏦'
    if (tipo === 'billetera') return '💳'
    if (tipo === 'inversion') return '📈'
    return '🏦'
  }

  return (
    <>
      {/* Card */}
      <div
        onClick={() => setAbierto(true)}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 cursor-pointer transition-all hover:shadow-lg hover:shadow-slate-900/50"
      >
        {/* Fila superior: monto + fecha */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-white">
              {formatMonto(t.monto, t.moneda)}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatFecha(t.fecha)}
              {t.creado_por_ia && (
                <span className="ml-1 text-green-400 flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> IA
                </span>
              )}
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">
            {t.moneda}
          </span>
        </div>

        {/* Fila inferior: origen → destino */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5 flex-1 min-w-0">
            <span>{getTipoCuenta(origen?.tipo)}</span>
            <span className="text-sm text-white truncate font-medium">{origen?.nombre || 'Origen'}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-green-400 shrink-0" />
          <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5 flex-1 min-w-0">
            <span>{getTipoCuenta(destino?.tipo)}</span>
            <span className="text-sm text-white truncate font-medium">{destino?.nombre || 'Destino'}</span>
          </div>
        </div>
      </div>

      {/* Modal de detalle */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-white">Detalle de transferencia</h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Monto</span>
                <span className="text-white font-bold text-lg">{formatMonto(t.monto, t.moneda)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Moneda</span>
                <span className="text-white">{t.moneda}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Cuenta origen</span>
                <span className="text-white">{origen?.nombre || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Cuenta destino</span>
                <span className="text-white">{destino?.nombre || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Fecha</span>
                <span className="text-white">{formatFecha(t.fecha)}</span>
              </div>
              {t.descripcion && (
                <div className="flex justify-between items-center py-2 border-b border-slate-800">
                  <span className="text-slate-400 text-sm">Descripción</span>
                  <span className="text-white text-sm">{t.descripcion}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Registrado por</span>
                <span className={t.creado_por_ia ? 'text-green-400' : 'text-slate-300'}>
                  {t.creado_por_ia ? '✨ IA' : '✋ Manual'}
                </span>
              </div>
              {t.imagen_url && (
                <div className="pt-2">
                  <p className="text-slate-400 text-sm mb-2">Comprobante</p>
                  <img
                    src={t.imagen_url}
                    alt="Comprobante"
                    className="w-full rounded-lg border border-slate-700"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
