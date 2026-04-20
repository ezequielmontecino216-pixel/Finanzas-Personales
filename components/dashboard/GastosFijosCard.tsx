'use client'

import { useState } from 'react'
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'

interface GastoFijo {
  id: string
  nombre: string
  monto_estimado: number | null
  metodo_pago: string | null
}

interface Props {
  gastosFijos: GastoFijo[]
  pagosIds: string[]
  usuarioId: string
  mesActual: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#F8FAFC', borderRadius: 8, padding: '8px 12px',
  fontSize: 13, width: '100%', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
}

export function GastosFijosCard({ gastosFijos: initialGastos, pagosIds, usuarioId, mesActual }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [gastos, setGastos] = useState<GastoFijo[]>(initialGastos)
  const [pagados, setPagados] = useState<Set<string>>(new Set(pagosIds))
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [showPagados, setShowPagados] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', monto: '', metodo_pago: 'transferencia' })

  const pendientes = gastos.filter(g => !pagados.has(g.id))
  const pagadosList = gastos.filter(g => pagados.has(g.id))
  const totalEstimado = gastos.reduce((s, g) => s + Number(g.monto_estimado || 0), 0)

  async function togglePago(gf: GastoFijo) {
    if (toggling) return
    setToggling(gf.id)
    const estabaPagado = pagados.has(gf.id)

    try {
      if (estabaPagado) {
        await supabase.from('gastos_fijos_pagos')
          .delete().eq('gasto_fijo_id', gf.id).eq('mes', mesActual)
        setPagados(prev => { const s = new Set(prev); s.delete(gf.id); return s })
        toast(`${gf.nombre} marcado como pendiente`, 'info')
      } else {
        // Animación de salida, luego mover a pagados
        setAnimatingOut(prev => new Set([...prev, gf.id]))
        await supabase.from('gastos_fijos_pagos').upsert({
          gasto_fijo_id: gf.id, usuario_id: usuarioId, mes: mesActual,
          pagado: true, fecha_pago: new Date().toISOString().split('T')[0],
          monto_real: gf.monto_estimado,
        }, { onConflict: 'gasto_fijo_id,mes' })
        setTimeout(() => {
          setAnimatingOut(prev => { const s = new Set(prev); s.delete(gf.id); return s })
          setPagados(prev => new Set([...prev, gf.id]))
        }, 360)
        toast(`${gf.nombre} pagado ✓`, 'success')
      }
    } catch {
      setAnimatingOut(prev => { const s = new Set(prev); s.delete(gf.id); return s })
      toast('No se pudo actualizar', 'error')
    } finally {
      setToggling(null)
    }
  }

  async function agregarGasto() {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('gastos_fijos').insert({
        usuario_id: usuarioId, nombre: form.nombre.trim(),
        monto_estimado: form.monto ? parseFloat(form.monto) : null,
        metodo_pago: form.metodo_pago,
      }).select().single()
      if (error) throw error
      setGastos(prev => [...prev, data])
      setForm({ nombre: '', monto: '', metodo_pago: 'transferencia' })
      setShowForm(false)
      toast(`"${data.nombre}" agregado`, 'success')
      router.refresh()
    } catch {
      toast('No se pudo agregar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarGasto(id: string) {
    const nombre = gastos.find(g => g.id === id)?.nombre || ''
    setDeleting(id)
    try {
      await supabase.from('gastos_fijos').delete().eq('id', id)
      setGastos(prev => prev.filter(g => g.id !== id))
      setPagados(prev => { const s = new Set(prev); s.delete(id); return s })
      toast(`"${nombre}" eliminado`, 'info')
      router.refresh()
    } catch {
      toast('No se pudo eliminar', 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Gastos fijos
          </p>
          {totalEstimado > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.3)' }}>{fmt(totalEstimado)} est.</span>
          )}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: showForm ? 'rgba(239,68,68,0.08)' : 'rgba(79,142,247,0.08)',
            border: showForm ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(79,142,247,0.2)',
            borderRadius: 8, padding: '5px 11px',
            color: showForm ? '#ef4444' : '#4F8EF7',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
          }}
        >
          {showForm ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Agregar</>}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div style={{
          background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.12)',
          borderRadius: 10, padding: 14, marginBottom: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <input
            placeholder="Nombre (ej: Netflix, Seguro del auto...)"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            style={inputStyle} autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number" placeholder="Monto estimado (opcional)"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              style={{ ...inputStyle, flex: 1 }} min="0"
            />
            <select
              value={form.metodo_pago}
              onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
              style={{ ...inputStyle, width: 150, flexShrink: 0 }}
            >
              <option value="efectivo">💵 Efectivo</option>
              <option value="transferencia">🏦 Transferencia</option>
              <option value="debito_automatico">🔄 Débito auto.</option>
              <option value="tarjeta">💳 Tarjeta</option>
            </select>
          </div>
          <button
            onClick={agregarGasto} disabled={saving || !form.nombre.trim()}
            style={{
              background: '#4F8EF7', color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              cursor: saving || !form.nombre.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !form.nombre.trim() ? 0.5 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar gasto fijo'}
          </button>
        </div>
      )}

      {/* Pendientes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pendientes.length === 0 && animatingOut.size === 0 ? (
          gastos.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
              Tocá <strong>+ Agregar</strong> para sumar un gasto fijo
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#22c55e', textAlign: 'center', padding: '12px 0', margin: 0 }}>
              🎉 ¡Todos los gastos del mes pagados!
            </p>
          )
        ) : (
          gastos
            .filter(g => !pagados.has(g.id) || animatingOut.has(g.id))
            .map(gf => {
              const isAnimating = animatingOut.has(gf.id)
              const isToggling = toggling === gf.id
              const isDeleting = deleting === gf.id
              return (
                <div
                  key={gf.id}
                  className={isAnimating ? 'item-slide-out' : 'item-slide-in'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    opacity: isDeleting ? 0.4 : 1,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {gf.nombre}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {gf.monto_estimado ? fmt(Number(gf.monto_estimado)) : '—'}
                  </span>
                  <button
                    onClick={() => togglePago(gf)}
                    disabled={isToggling || isAnimating}
                    style={{
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                      borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600,
                      color: '#22c55e', cursor: 'pointer', fontFamily: 'inherit',
                      flexShrink: 0, opacity: isToggling ? 0.5 : 1, transition: 'all 0.15s',
                    }}
                  >
                    ✓ Pagar
                  </button>
                  <button
                    onClick={() => eliminarGasto(gf.id)} disabled={isDeleting}
                    style={{
                      background: 'transparent', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer',
                      color: 'rgba(248,250,252,0.18)', padding: '2px', borderRadius: 4,
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,250,252,0.18)')}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })
        )}
      </div>

      {/* Toggle pagados */}
      {pagadosList.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowPagados(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'rgba(248,250,252,0.3)', fontSize: 11, fontWeight: 600,
              padding: '4px 0', fontFamily: 'inherit',
            }}
          >
            {showPagados ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showPagados ? 'Ocultar pagados' : `Ver pagados este mes (${pagadosList.length})`}
          </button>

          {showPagados && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {pagadosList.map(gf => (
                <div key={gf.id} className="item-slide-in" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)',
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    background: 'rgba(34,197,94,0.2)', border: '1.5px solid rgba(34,197,94,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: '#22c55e',
                  }}>✓</div>
                  <span style={{
                    fontSize: 13, flex: 1, color: 'rgba(248,250,252,0.3)',
                    textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {gf.nombre}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.2)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {gf.monto_estimado ? fmt(Number(gf.monto_estimado)) : '—'}
                  </span>
                  <button
                    onClick={() => togglePago(gf)} title="Desmarcar"
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(248,250,252,0.2)', fontSize: 13, padding: '2px',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#F59E0B')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,250,252,0.2)')}
                  >↩</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
