'use client'

import { useState } from 'react'
import { Plus, Minus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Cuenta {
  id: string
  nombre: string
  icono: string
  saldo_actual: number
  moneda: string
}

interface Props {
  ahorroARS: number
  ahorroUSD: number
  cuentas: Cuenta[]
  usuarioId: string
}

const fmt = (n: number, moneda = 'ARS') =>
  moneda === 'USD'
    ? `u$d ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F8FAFC',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

type Accion = 'depositar' | 'retirar'

export function AhorrosCard({ ahorroARS: initARS, ahorroUSD: initUSD, cuentas, usuarioId }: Props) {
  const router = useRouter()
  const [ahorroARS, setAhorroARS] = useState(initARS)
  const [ahorroUSD, setAhorroUSD] = useState(initUSD)
  const [modal, setModal] = useState<{ moneda: 'ARS' | 'USD'; accion: Accion } | null>(null)
  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const cuentasMoneda = cuentas.filter(c => c.moneda === (modal?.moneda || 'ARS'))
  const saldoTotal = cuentasMoneda.reduce((s, c) => s + Number(c.saldo_actual), 0)
  const ahorro = modal?.moneda === 'USD' ? ahorroUSD : ahorroARS

  function abrirModal(moneda: 'ARS' | 'USD', accion: Accion) {
    setModal({ moneda, accion })
    setMonto('')
    setCuentaId(cuentas.find(c => c.moneda === moneda && Number(c.saldo_actual) > 0)?.id || '')
    setError('')
  }

  function cerrar() {
    setModal(null)
    setMonto('')
    setError('')
  }

  async function confirmar() {
    if (!modal || !monto) return
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresá un monto válido'); return }

    const { moneda, accion } = modal

    if (accion === 'depositar') {
      // Verificar que haya saldo suficiente en la cuenta seleccionada
      const cuenta = cuentas.find(c => c.id === cuentaId)
      if (!cuenta) { setError('Seleccioná una cuenta'); return }
      if (Number(cuenta.saldo_actual) < montoNum) {
        setError(`Saldo insuficiente en ${cuenta.nombre} (${fmt(Number(cuenta.saldo_actual), moneda)})`)
        return
      }
      if (montoNum > saldoTotal) {
        setError(`El monto supera el total disponible (${fmt(saldoTotal, moneda)})`)
        return
      }
    } else {
      // Retirar: verificar que haya ahorros suficientes
      if (montoNum > ahorro) {
        setError(`No tenés suficientes ahorros en ${moneda} (${fmt(ahorro, moneda)})`)
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const { data: ahorroRow } = await supabase
        .from('ahorros')
        .select('id, monto')
        .eq('usuario_id', usuarioId)
        .eq('moneda', moneda)
        .single()

      if (!ahorroRow) throw new Error('No se encontró el registro de ahorros')

      const nuevoMonto = accion === 'depositar'
        ? Number(ahorroRow.monto) + montoNum
        : Number(ahorroRow.monto) - montoNum

      await supabase.from('ahorros').update({ monto: nuevoMonto }).eq('id', ahorroRow.id)

      // Actualizar saldo de la cuenta (solo en depósito/retiro)
      if (cuentaId) {
        const cuenta = cuentas.find(c => c.id === cuentaId)
        if (cuenta) {
          const delta = accion === 'depositar' ? -montoNum : montoNum
          await supabase.from('cuentas').update({
            saldo_actual: Number(cuenta.saldo_actual) + delta
          }).eq('id', cuentaId)
        }
      }

      // Actualizar estado local
      if (moneda === 'ARS') setAhorroARS(nuevoMonto)
      else setAhorroUSD(nuevoMonto)

      cerrar()
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
          Ahorros
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ARS */}
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: 0 }}>Pesos ARS</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => abrirModal('ARS', 'retirar')} title="Retirar" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                  <Minus size={12} />
                </button>
                <button onClick={() => abrirModal('ARS', 'depositar')} title="Depositar" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#22c55e' }}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: ahorroARS > 0 ? '#22c55e' : 'rgba(248,250,252,0.2)', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(ahorroARS)}
            </p>
          </div>

          {/* USD */}
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: 0 }}>Dólares USD</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => abrirModal('USD', 'retirar')} title="Retirar" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                  <Minus size={12} />
                </button>
                <button onClick={() => abrirModal('USD', 'depositar')} title="Depositar" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#22c55e' }}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: ahorroUSD > 0 ? '#22c55e' : 'rgba(248,250,252,0.2)', margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(ahorroUSD, 'USD')}
            </p>
          </div>

        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  {modal.accion === 'depositar' ? '💰 Depositar en ahorros' : '💸 Retirar de ahorros'}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)', margin: '4px 0 0' }}>
                  {modal.moneda === 'ARS' ? 'Pesos ARS' : 'Dólares USD'}
                </p>
              </div>
              <button onClick={cerrar} style={{ background: 'transparent', border: 'none', color: 'rgba(248,250,252,0.4)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Disponible */}
            <div style={{ background: modal.accion === 'depositar' ? 'rgba(79,142,247,0.06)' : 'rgba(34,197,94,0.06)', border: `1px solid ${modal.accion === 'depositar' ? 'rgba(79,142,247,0.15)' : 'rgba(34,197,94,0.15)'}`, borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 2px' }}>
                {modal.accion === 'depositar' ? 'Disponible en cuentas' : 'Ahorros actuales'}
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                {modal.accion === 'depositar' ? fmt(saldoTotal, modal.moneda) : fmt(ahorro, modal.moneda)}
              </p>
            </div>

            {/* Cuenta (solo para depositar/retirar con cuenta) */}
            {cuentasMoneda.length > 0 && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                  {modal.accion === 'depositar' ? 'Sacar de cuenta' : 'Devolver a cuenta'}
                </label>
                <select value={cuentaId} onChange={e => setCuentaId(e.target.value)} style={inputStyle}>
                  <option value="">Sin cuenta específica</option>
                  {cuentasMoneda.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icono} {c.nombre} — {fmt(Number(c.saldo_actual), modal.moneda)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Monto */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Monto a {modal.accion === 'depositar' ? 'ahorrar' : 'retirar'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                autoFocus
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#ef4444', margin: 0, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                ⚠️ {error}
              </p>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={cerrar} style={{ flex: 1, height: 42, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(248,250,252,0.5)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={saving || !monto}
                style={{ flex: 1, height: 42, background: modal.accion === 'depositar' ? '#22c55e' : '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving || !monto ? 'not-allowed' : 'pointer', opacity: saving || !monto ? 0.5 : 1, fontFamily: 'inherit' }}
              >
                {saving ? 'Guardando...' : modal.accion === 'depositar' ? 'Ahorrar' : 'Retirar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
