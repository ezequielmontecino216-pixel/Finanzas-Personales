'use client'

import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'

const CATEGORIAS = [
  { nombre: 'Supermercado', icono: '🛒' },
  { nombre: 'Comidas y salidas', icono: '🍔' },
  { nombre: 'Transporte', icono: '🚗' },
  { nombre: 'Entretenimiento', icono: '🎬' },
  { nombre: 'Salud', icono: '💊' },
  { nombre: 'Ropa', icono: '👕' },
  { nombre: 'Cuidado personal', icono: '💆' },
  { nombre: 'Hogar', icono: '🏠' },
  { nombre: 'Suscripciones', icono: '📱' },
  { nombre: 'Regalos', icono: '🎁' },
  { nombre: 'Gimnasio', icono: '💪' },
  { nombre: 'Handball', icono: '🤾' },
  { nombre: 'Trabajo', icono: '💼' },
  { nombre: 'Otros', icono: '📦' },
]

interface Props {
  transaccion: {
    id: string
    tipo: string
    monto: number
    moneda: string
    descripcion: string | null
    categoria: string | null
    fecha: string
    cuenta_id: string | null
  }
  cuentas: { id: string; nombre: string; icono: string }[]
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F8FAFC', borderRadius: 8, padding: '9px 12px', fontSize: 13,
  width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6,
}

export function EditarMovimiento({ transaccion, cuentas }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    monto: String(transaccion.monto),
    descripcion: transaccion.descripcion || '',
    categoria: transaccion.categoria || '',
    cuenta_id: transaccion.cuenta_id || '',
    fecha: transaccion.fecha,
  })

  function abrir() { setOpen(true) }
  function cerrar() { setOpen(false) }

  async function guardar() {
    setLoading(true)
    try {
      const nuevoMonto = parseFloat(form.monto)
      if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
        toast('Ingresá un monto válido', 'error')
        return
      }

      // Si cambió la cuenta o el monto, revertir saldo viejo y aplicar nuevo
      if (transaccion.cuenta_id && (transaccion.cuenta_id !== form.cuenta_id || transaccion.monto !== nuevoMonto)) {
        const { data: cuentaVieja } = await supabase.from('cuentas').select('saldo_actual').eq('id', transaccion.cuenta_id).single()
        if (cuentaVieja) {
          const deltaReversion = transaccion.tipo === 'ingreso' ? -transaccion.monto : transaccion.monto
          await supabase.from('cuentas').update({ saldo_actual: Number(cuentaVieja.saldo_actual) + deltaReversion }).eq('id', transaccion.cuenta_id)
        }
      }

      if (form.cuenta_id && (transaccion.cuenta_id !== form.cuenta_id || transaccion.monto !== nuevoMonto)) {
        const { data: cuentaNueva } = await supabase.from('cuentas').select('saldo_actual').eq('id', form.cuenta_id).single()
        if (cuentaNueva) {
          const deltaAplicacion = transaccion.tipo === 'ingreso' ? nuevoMonto : -nuevoMonto
          await supabase.from('cuentas').update({ saldo_actual: Number(cuentaNueva.saldo_actual) + deltaAplicacion }).eq('id', form.cuenta_id)
        }
      }

      await supabase.from('transacciones').update({
        monto: nuevoMonto,
        descripcion: form.descripcion || null,
        categoria: form.categoria || null,
        cuenta_id: form.cuenta_id || null,
        fecha: form.fecha,
      }).eq('id', transaccion.id)

      toast('Movimiento actualizado', 'success')
      cerrar()
      router.refresh()
    } catch {
      toast('Error al actualizar', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={abrir} title="Editar"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '6px', borderRadius: 6, color: 'rgba(248,250,252,0.2)',
          display: 'flex', alignItems: 'center', transition: 'color 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4F8EF7' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,250,252,0.2)' }}
      >
        <Pencil size={13} />
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={e => { if (e.target === e.currentTarget) cerrar() }}>
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 24, width: '100%', maxWidth: 480,
            display: 'flex', flexDirection: 'column', gap: 16,
            maxHeight: '90vh', overflowY: 'auto',
          }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                ✏️ Editar movimiento
              </p>
              <button onClick={cerrar} style={{ background: 'transparent', border: 'none', color: 'rgba(248,250,252,0.4)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Monto */}
            <div>
              <label style={labelStyle}>Monto</label>
              <input type="number" min="0" step="0.01" value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                style={{ ...inputStyle, fontSize: 20, fontWeight: 700 }}
              />
            </div>

            {/* Categoría (solo gastos) */}
            {transaccion.tipo === 'gasto' && (
              <div>
                <label style={labelStyle}>Categoría</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                  {CATEGORIAS.map(cat => {
                    const isActive = form.categoria === cat.nombre
                    return (
                      <button key={cat.nombre} type="button"
                        onClick={() => setForm(f => ({ ...f, categoria: isActive ? '' : cat.nombre }))}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: 3, padding: '8px 4px', borderRadius: 8,
                          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          background: isActive ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
                          border: isActive ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        }}>
                        <span style={{ fontSize: 16 }}>{cat.icono}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                          color: isActive ? '#4F8EF7' : 'rgba(248,250,252,0.4)',
                        }}>
                          {cat.nombre}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Cuenta */}
            <div>
              <label style={labelStyle}>Cuenta</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[{ id: '', nombre: 'Sin cuenta', icono: '' }, ...cuentas].map(c => {
                  const isActive = form.cuenta_id === c.id
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setForm(f => ({ ...f, cuenta_id: c.id }))}
                      style={{
                        padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        background: isActive ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
                        border: isActive ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        color: isActive ? '#4F8EF7' : 'rgba(248,250,252,0.5)',
                      }}>
                      {c.icono} {c.nombre}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label style={labelStyle}>Descripción</label>
              <input type="text" placeholder="Descripción..."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Fecha */}
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={cerrar} style={{
                flex: 1, height: 44, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(248,250,252,0.5)', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancelar</button>
              <button onClick={guardar} disabled={loading} style={{
                flex: 2, height: 44, background: '#4F8EF7', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
