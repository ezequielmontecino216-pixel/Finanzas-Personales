'use client'

import { useState } from 'react'
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'

interface Cuota {
  id: string
  nombre: string
  monto_por_cuota: number
  cuotas_pagadas: number
  total_cuotas: number | null
  dia_vencimiento: number
  activo: boolean
}

interface Props {
  cuotas: Cuota[]
  usuarioId: string
  fechaVencimiento: string
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

export function CuotasCard({ cuotas: initialCuotas, usuarioId, fechaVencimiento }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [cuotas, setCuotas] = useState<Cuota[]>(initialCuotas)
  // IDs pagadas en esta sesión (para fade-out)
  const [pagadasSesion, setPagadasSesion] = useState<Set<string>>(new Set())
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set())
  const [showOcultas, setShowOcultas] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '', monto_por_cuota: '', cuotas_pagadas: '0', total_cuotas: '', dia_vencimiento: '11',
  })

  // Pendientes: activas, no completadas, no pagadas esta sesión
  const esCompletada = (c: Cuota) => c.total_cuotas != null && c.cuotas_pagadas >= c.total_cuotas
  const pendientes = cuotas.filter(c => !esCompletada(c) && c.activo !== false && !pagadasSesion.has(c.id))
  const ocultas = cuotas.filter(c => esCompletada(c) || pagadasSesion.has(c.id))
  const totalMes = pendientes.reduce((s, c) => s + Number(c.monto_por_cuota), 0)

  async function pagarCuota(cuota: Cuota) {
    if (paying) return
    setPaying(cuota.id)
    try {
      const nuevasPagadas = cuota.cuotas_pagadas + 1
      const terminada = cuota.total_cuotas != null && nuevasPagadas >= cuota.total_cuotas

      // Animación de salida
      setAnimatingOut(prev => new Set([...prev, cuota.id]))

      await supabase.from('cuotas').update({
        cuotas_pagadas: nuevasPagadas, activo: !terminada,
      }).eq('id', cuota.id)

      await supabase.from('transacciones').insert({
        usuario_id: usuarioId, tipo: 'gasto', subtipo: 'cuota',
        categoria: 'Cuota', descripcion: cuota.nombre,
        monto: cuota.monto_por_cuota, moneda: 'ARS',
        fecha: new Date().toISOString().split('T')[0], creado_por_ia: false,
      })

      setTimeout(() => {
        setAnimatingOut(prev => { const s = new Set(prev); s.delete(cuota.id); return s })
        setCuotas(prev => prev.map(c =>
          c.id === cuota.id ? { ...c, cuotas_pagadas: nuevasPagadas, activo: !terminada } : c
        ))
        setPagadasSesion(prev => new Set([...prev, cuota.id]))
      }, 360)

      if (terminada) {
        toast(`🎉 ¡${cuota.nombre} completamente pagada!`, 'success')
      } else {
        toast(`${cuota.nombre} — cuota ${nuevasPagadas}${cuota.total_cuotas ? `/${cuota.total_cuotas}` : ''} pagada`, 'success')
      }
      router.refresh()
    } catch {
      setAnimatingOut(prev => { const s = new Set(prev); s.delete(cuota.id); return s })
      toast('No se pudo registrar el pago', 'error')
    } finally {
      setPaying(null)
    }
  }

  async function despagarCuota(cuota: Cuota) {
    if (cuota.cuotas_pagadas <= 0 || paying) return
    setPaying(cuota.id)
    try {
      const nuevasPagadas = cuota.cuotas_pagadas - 1
      await supabase.from('cuotas').update({
        cuotas_pagadas: nuevasPagadas, activo: true,
      }).eq('id', cuota.id)
      setCuotas(prev => prev.map(c =>
        c.id === cuota.id ? { ...c, cuotas_pagadas: nuevasPagadas, activo: true } : c
      ))
      setPagadasSesion(prev => { const s = new Set(prev); s.delete(cuota.id); return s })
      toast(`${cuota.nombre} desmarcada`, 'info')
      router.refresh()
    } catch {
      toast('No se pudo desmarcar', 'error')
    } finally {
      setPaying(null)
    }
  }

  async function agregarCuota() {
    if (!form.nombre.trim() || !form.monto_por_cuota) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('cuotas').insert({
        usuario_id: usuarioId, nombre: form.nombre.trim(),
        monto_por_cuota: parseFloat(form.monto_por_cuota),
        cuotas_pagadas: parseInt(form.cuotas_pagadas) || 0,
        total_cuotas: form.total_cuotas ? parseInt(form.total_cuotas) : null,
        dia_vencimiento: parseInt(form.dia_vencimiento) || 11,
        activo: true,
      }).select().single()
      if (error) throw error
      setCuotas(prev => [...prev, data])
      setForm({ nombre: '', monto_por_cuota: '', cuotas_pagadas: '0', total_cuotas: '', dia_vencimiento: '11' })
      setShowForm(false)
      toast(`"${data.nombre}" agregada`, 'success')
      router.refresh()
    } catch {
      toast('No se pudo agregar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function eliminarCuota(id: string) {
    const nombre = cuotas.find(c => c.id === id)?.nombre || ''
    setDeleting(id)
    try {
      await supabase.from('cuotas').delete().eq('id', id)
      setCuotas(prev => prev.filter(c => c.id !== id))
      setPagadasSesion(prev => { const s = new Set(prev); s.delete(id); return s })
      toast(`"${nombre}" eliminada`, 'info')
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
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Cuotas del mes
          </p>
          <p style={{ fontSize: 11, color: '#F59E0B', fontWeight: 500, margin: '3px 0 0' }}>
            Vence {fechaVencimiento}
          </p>
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
          background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 10, padding: 14, marginBottom: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <input
            placeholder="¿De qué es la cuota? (ej: Notebook, Ropa...)"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            style={inputStyle} autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Monto por cuota *</p>
              <input type="number" placeholder="Ej: 25000" value={form.monto_por_cuota}
                onChange={e => setForm(f => ({ ...f, monto_por_cuota: e.target.value }))}
                style={inputStyle} min="0" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Total cuotas</p>
              <input type="number" placeholder="Ej: 12" value={form.total_cuotas}
                onChange={e => setForm(f => ({ ...f, total_cuotas: e.target.value }))}
                style={inputStyle} min="1" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Ya pagadas</p>
              <input type="number" placeholder="0" value={form.cuotas_pagadas}
                onChange={e => setForm(f => ({ ...f, cuotas_pagadas: e.target.value }))}
                style={inputStyle} min="0" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Día vencimiento</p>
              <input type="number" placeholder="11" value={form.dia_vencimiento}
                onChange={e => setForm(f => ({ ...f, dia_vencimiento: e.target.value }))}
                style={inputStyle} min="1" max="31" />
            </div>
          </div>
          <button
            onClick={agregarCuota}
            disabled={saving || !form.nombre.trim() || !form.monto_por_cuota}
            style={{
              background: '#F59E0B', color: '#000', border: 'none', borderRadius: 8,
              padding: '9px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: saving || !form.nombre.trim() || !form.monto_por_cuota ? 'not-allowed' : 'pointer',
              opacity: saving || !form.nombre.trim() || !form.monto_por_cuota ? 0.5 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cuota'}
          </button>
        </div>
      )}

      {/* Pendientes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pendientes.length === 0 && animatingOut.size === 0 ? (
          cuotas.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
              Tocá <strong>+ Agregar</strong> para sumar una cuota
            </p>
          ) : (
            <p style={{ fontSize: 13, color: '#22c55e', textAlign: 'center', padding: '12px 0', margin: 0 }}>
              🎉 ¡Todas las cuotas del mes al día!
            </p>
          )
        ) : (
          cuotas
            .filter(c => (!pagadasSesion.has(c.id) && !esCompletada(c) && c.activo !== false) || animatingOut.has(c.id))
            .map(cuota => {
              const isAnimating = animatingOut.has(cuota.id)
              const isPaying = paying === cuota.id
              const isDeleting = deleting === cuota.id
              const numCuota = cuota.cuotas_pagadas + 1
              const label = cuota.total_cuotas ? `${numCuota}/${cuota.total_cuotas}` : `N° ${numCuota}`

              return (
                <div
                  key={cuota.id}
                  className={isAnimating ? 'item-slide-out' : 'item-slide-in'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 10px', borderRadius: 8,
                    background: 'rgba(245,158,11,0.04)',
                    border: '1px solid rgba(245,158,11,0.1)',
                    opacity: isDeleting ? 0.4 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cuota.nombre}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '2px 0 0' }}>
                      Cuota {label}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {fmt(Number(cuota.monto_por_cuota))}
                  </span>
                  <button
                    onClick={() => pagarCuota(cuota)}
                    disabled={isPaying || isAnimating}
                    style={{
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                      borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600,
                      color: '#22c55e', cursor: 'pointer', fontFamily: 'inherit',
                      flexShrink: 0, opacity: isPaying ? 0.5 : 1, transition: 'all 0.15s',
                    }}
                  >
                    ✓ Pagar
                  </button>
                  <button
                    onClick={() => eliminarCuota(cuota.id)} disabled={isDeleting}
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

      {/* Total pendiente */}
      {pendientes.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>
            Total este mes ({pendientes.length} cuota{pendientes.length !== 1 ? 's' : ''})
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(totalMes)}
          </span>
        </div>
      )}

      {/* Toggle pagadas/completadas */}
      {ocultas.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowOcultas(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'rgba(248,250,252,0.3)', fontSize: 11, fontWeight: 600,
              padding: '4px 0', fontFamily: 'inherit',
            }}
          >
            {showOcultas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showOcultas ? 'Ocultar' : `Ver pagadas/completadas (${ocultas.length})`}
          </button>

          {showOcultas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 }}>
              {ocultas.map(cuota => {
                const completada = esCompletada(cuota)
                return (
                  <div key={cuota.id} className="item-slide-in" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8,
                    background: completada ? 'rgba(34,197,94,0.04)' : 'rgba(34,197,94,0.03)',
                    border: `1px solid ${completada ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)'}`,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      background: 'rgba(34,197,94,0.2)', border: '1.5px solid rgba(34,197,94,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: '#22c55e',
                    }}>✓</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 13, margin: 0, color: 'rgba(248,250,252,0.3)',
                        textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {cuota.nombre}
                      </p>
                      <p style={{ fontSize: 11, color: completada ? '#22c55e' : 'rgba(248,250,252,0.25)', margin: '2px 0 0' }}>
                        {completada
                          ? `✅ Completada (${cuota.total_cuotas}/${cuota.total_cuotas})`
                          : `Cuota ${cuota.cuotas_pagadas}${cuota.total_cuotas ? `/${cuota.total_cuotas}` : ''} — pagada este mes`
                        }
                      </p>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.2)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {fmt(Number(cuota.monto_por_cuota))}
                    </span>
                    {/* Solo permitir desmarcar si fue pagada esta sesión (no completadas definitivas) */}
                    {!completada && pagadasSesion.has(cuota.id) && (
                      <button
                        onClick={() => despagarCuota(cuota)} title="Desmarcar"
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'rgba(248,250,252,0.2)', fontSize: 13, padding: '2px', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#F59E0B')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,250,252,0.2)')}
                      >↩</button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
