'use client'

import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  color: '#F8FAFC',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

export function CuotasCard({ cuotas: initialCuotas, usuarioId, fechaVencimiento }: Props) {
  const router = useRouter()
  const [cuotas, setCuotas] = useState<Cuota[]>(initialCuotas)
  const [showForm, setShowForm] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    monto_por_cuota: '',
    cuotas_pagadas: '0',
    total_cuotas: '',
    dia_vencimiento: '11',
  })

  // Cuotas que aún tienen pagos pendientes
  const cuotasActivas = cuotas.filter(c =>
    c.activo !== false && !(c.total_cuotas && c.cuotas_pagadas >= c.total_cuotas)
  )
  const totalMes = cuotasActivas.reduce((s, c) => s + Number(c.monto_por_cuota), 0)

  // ── Marcar cuota como pagada ─────────────────────────────────────────────
  async function pagarCuota(cuota: Cuota) {
    setPaying(cuota.id)
    try {
      const nuevasCuotasPagadas = cuota.cuotas_pagadas + 1
      const terminada = cuota.total_cuotas != null && nuevasCuotasPagadas >= cuota.total_cuotas

      await supabase.from('cuotas').update({
        cuotas_pagadas: nuevasCuotasPagadas,
        activo: !terminada,
      }).eq('id', cuota.id)

      // Registrar transacción del pago
      await supabase.from('transacciones').insert({
        usuario_id: usuarioId,
        tipo: 'gasto',
        subtipo: 'cuota',
        categoria: 'Cuota',
        descripcion: cuota.nombre,
        monto: cuota.monto_por_cuota,
        moneda: 'ARS',
        fecha: new Date().toISOString().split('T')[0],
        creado_por_ia: false,
      })

      setCuotas(prev => prev.map(c =>
        c.id === cuota.id
          ? { ...c, cuotas_pagadas: nuevasCuotasPagadas, activo: !terminada }
          : c
      ))
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setPaying(null)
    }
  }

  // ── Desmarcar (revertir último pago) ────────────────────────────────────
  async function despagarCuota(cuota: Cuota) {
    if (cuota.cuotas_pagadas <= 0) return
    setPaying(cuota.id)
    try {
      const nuevasCuotasPagadas = cuota.cuotas_pagadas - 1
      await supabase.from('cuotas').update({
        cuotas_pagadas: nuevasCuotasPagadas,
        activo: true,
      }).eq('id', cuota.id)

      setCuotas(prev => prev.map(c =>
        c.id === cuota.id
          ? { ...c, cuotas_pagadas: nuevasCuotasPagadas, activo: true }
          : c
      ))
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setPaying(null)
    }
  }

  // ── Agregar cuota ────────────────────────────────────────────────────────
  async function agregarCuota() {
    if (!form.nombre.trim() || !form.monto_por_cuota) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('cuotas')
        .insert({
          usuario_id: usuarioId,
          nombre: form.nombre.trim(),
          monto_por_cuota: parseFloat(form.monto_por_cuota),
          cuotas_pagadas: parseInt(form.cuotas_pagadas) || 0,
          total_cuotas: form.total_cuotas ? parseInt(form.total_cuotas) : null,
          dia_vencimiento: parseInt(form.dia_vencimiento) || 11,
          activo: true,
        })
        .select()
        .single()

      if (error) throw error
      setCuotas(prev => [...prev, data])
      setForm({ nombre: '', monto_por_cuota: '', cuotas_pagadas: '0', total_cuotas: '', dia_vencimiento: '11' })
      setShowForm(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('No se pudo agregar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // ── Eliminar cuota ───────────────────────────────────────────────────────
  async function eliminarCuota(id: string) {
    setDeleting(id)
    try {
      await supabase.from('cuotas').delete().eq('id', id)
      setCuotas(prev => prev.filter(c => c.id !== id))
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  // ── ¿La cuota de este mes ya está pagada? ───────────────────────────────
  // Consideramos pagada la cuota del mes si cuotas_pagadas > el mínimo esperado
  // Para simplificar: si fue marcada como pagada en la sesión actual
  const [pagadasEstaSesion, setPagadasEstaSesion] = useState<Set<string>>(new Set())

  async function toggleCuota(cuota: Cuota) {
    const estabaPagada = pagadasEstaSesion.has(cuota.id)
    if (estabaPagada) {
      await despagarCuota(cuota)
      setPagadasEstaSesion(prev => { const s = new Set(prev); s.delete(cuota.id); return s })
    } else {
      await pagarCuota(cuota)
      setPagadasEstaSesion(prev => new Set([...prev, cuota.id]))
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
            style={inputStyle}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Monto por cuota *</p>
              <input
                type="number"
                placeholder="Ej: 25000"
                value={form.monto_por_cuota}
                onChange={e => setForm(f => ({ ...f, monto_por_cuota: e.target.value }))}
                style={inputStyle}
                min="0"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Total de cuotas</p>
              <input
                type="number"
                placeholder="Ej: 12 (vacío = sin límite)"
                value={form.total_cuotas}
                onChange={e => setForm(f => ({ ...f, total_cuotas: e.target.value }))}
                style={inputStyle}
                min="1"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Cuotas ya pagadas</p>
              <input
                type="number"
                placeholder="0"
                value={form.cuotas_pagadas}
                onChange={e => setForm(f => ({ ...f, cuotas_pagadas: e.target.value }))}
                style={inputStyle}
                min="0"
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.4)', margin: '0 0 4px' }}>Día de vencimiento</p>
              <input
                type="number"
                placeholder="11"
                value={form.dia_vencimiento}
                onChange={e => setForm(f => ({ ...f, dia_vencimiento: e.target.value }))}
                style={inputStyle}
                min="1" max="31"
              />
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

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {cuotas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
            Tocá <strong>+ Agregar</strong> para sumar una cuota
          </p>
        ) : (
          cuotas.map(cuota => {
            const terminada = cuota.total_cuotas != null && cuota.cuotas_pagadas >= cuota.total_cuotas
            const numCuota = cuota.cuotas_pagadas + (terminada ? 0 : 1)
            const label = cuota.total_cuotas ? `${numCuota}/${cuota.total_cuotas}` : `${numCuota}`
            const isPaying = paying === cuota.id
            const isDeleting = deleting === cuota.id
            const pagadaEstaSesion = pagadasEstaSesion.has(cuota.id)

            return (
              <div key={cuota.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 10px', borderRadius: 8,
                background: terminada
                  ? 'rgba(34,197,94,0.06)'
                  : pagadaEstaSesion
                    ? 'rgba(34,197,94,0.06)'
                    : 'rgba(245,158,11,0.04)',
                border: terminada || pagadaEstaSesion
                  ? '1px solid rgba(34,197,94,0.15)'
                  : '1px solid rgba(245,158,11,0.12)',
                opacity: isDeleting ? 0.4 : 1,
                transition: 'all 0.15s',
              }}>
                {/* Checkbox */}
                <button
                  onClick={() => !terminada && toggleCuota(cuota)}
                  disabled={isPaying || terminada}
                  title={terminada ? 'Cuota completada' : pagadaEstaSesion ? 'Desmarcar pago' : 'Marcar como pagada este mes'}
                  style={{
                    background: (terminada || pagadaEstaSesion) ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                    border: (terminada || pagadaEstaSesion) ? '1.5px solid rgba(34,197,94,0.5)' : '1.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 5, width: 20, height: 20, flexShrink: 0,
                    cursor: terminada || isPaying ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, transition: 'all 0.15s',
                    color: (terminada || pagadaEstaSesion) ? '#22c55e' : 'transparent',
                  }}
                >
                  {(terminada || pagadaEstaSesion) ? '✓' : ''}
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 600, margin: 0,
                    color: terminada ? 'rgba(248,250,252,0.4)' : '#F8FAFC',
                    textDecoration: terminada ? 'line-through' : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {cuota.nombre}
                    {terminada && <span style={{ marginLeft: 6, fontSize: 11, color: '#22c55e' }}>✅ Completada</span>}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '2px 0 0' }}>
                    Cuota {terminada ? `${cuota.total_cuotas}/${cuota.total_cuotas}` : label}
                  </p>
                </div>

                {/* Monto */}
                <span style={{
                  fontSize: 13, fontWeight: 700, color: terminada ? 'rgba(248,250,252,0.3)' : '#F59E0B',
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                }}>
                  {fmt(Number(cuota.monto_por_cuota))}
                </span>

                {/* Eliminar */}
                <button
                  onClick={() => eliminarCuota(cuota.id)}
                  disabled={isDeleting}
                  title="Eliminar cuota"
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

      {/* Total */}
      {cuotasActivas.length > 0 && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 10,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: 'rgba(248,250,252,0.4)' }}>
            Total este mes ({cuotasActivas.length} cuota{cuotasActivas.length !== 1 ? 's' : ''})
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(totalMes)}
          </span>
        </div>
      )}
    </div>
  )
}
