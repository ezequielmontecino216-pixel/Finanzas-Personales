'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
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

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10,
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F8FAFC', borderRadius: 10, padding: '11px 14px', fontSize: 14,
  width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

export default function NuevoMovimientoPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [cuentas, setCuentas] = useState<any[]>([])
  const [usuarioId, setUsuarioId] = useState<string | null>(null)

  const [form, setForm] = useState({
    tipo: 'gasto' as 'gasto' | 'ingreso',
    monto: '',
    moneda: 'ARS',
    descripcion: '',
    categoria: '',
    cuenta_id: '',
    fecha: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (!user) return
    async function cargar() {
      const { data: u } = await supabase.from('usuarios').select('id').eq('clerk_user_id', user!.id).single()
      if (!u) return
      setUsuarioId(u.id)
      const { data: c } = await supabase.from('cuentas').select('*').eq('usuario_id', u.id).eq('activa', true).order('nombre')
      setCuentas(c || [])
    }
    cargar()
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!usuarioId || !form.monto) return
    setLoading(true)
    try {
      const monto = parseFloat(form.monto)
      const { error } = await supabase.from('transacciones').insert({
        usuario_id: usuarioId,
        cuenta_id: form.cuenta_id || null,
        tipo: form.tipo,
        categoria: form.categoria || null,
        descripcion: form.descripcion || null,
        monto,
        moneda: form.moneda,
        fecha: form.fecha,
        creado_por_ia: false,
      })
      if (error) throw new Error(error.message)

      if (form.cuenta_id) {
        const cuenta = cuentas.find(c => c.id === form.cuenta_id)
        if (cuenta) {
          const delta = form.tipo === 'ingreso' ? monto : -monto
          await supabase.from('cuentas').update({ saldo_actual: Number(cuenta.saldo_actual) + delta }).eq('id', form.cuenta_id)
        }
      }

      toast('Movimiento guardado', 'success')
      router.push('/movimientos')
    } catch (err: any) {
      toast(err?.message || 'Error al guardar', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
          Nuevo movimiento
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '6px 0 0' }}>
          Registrá un ingreso o gasto manualmente
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 22,
        }}>

          {/* Tipo */}
          <div>
            <span style={labelStyle}>Tipo</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { value: 'gasto', label: '💸 Gasto', activeStyle: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' } },
                { value: 'ingreso', label: '💰 Ingreso', activeStyle: { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' } },
              ] as const).map(t => {
                const isActive = form.tipo === t.value
                return (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: t.value, categoria: '' }))}
                    style={{
                      padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s',
                      ...(isActive ? t.activeStyle : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: 'rgba(248,250,252,0.35)',
                      }),
                    }}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Monto */}
          <div>
            <span style={labelStyle}>Monto</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', gap: 0 }}>
                {['ARS', 'USD'].map(m => (
                  <button key={m} type="button"
                    onClick={() => setForm(f => ({ ...f, moneda: m }))}
                    style={{
                      padding: '11px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit',
                      background: form.moneda === m ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
                      border: form.moneda === m ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: form.moneda === m ? '#4F8EF7' : 'rgba(248,250,252,0.4)',
                      borderRadius: m === 'ARS' ? '10px 0 0 10px' : '0 10px 10px 0',
                    }}>
                    {m}
                  </button>
                ))}
              </div>
              <input
                type="number" placeholder="0" value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                required min="0" step="0.01"
                style={{ ...inputStyle, flex: 1, borderRadius: 10, fontSize: 22, fontWeight: 700, textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Cuenta — chips horizontales */}
          <div>
            <span style={labelStyle}>Cuenta</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[{ id: '', nombre: 'Sin cuenta', icono: '—', saldo_actual: null },...cuentas].map(c => {
                const isActive = form.cuenta_id === c.id
                return (
                  <button key={c.id} type="button"
                    onClick={() => setForm(f => ({ ...f, cuenta_id: c.id }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      background: isActive ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
                      border: isActive ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      color: isActive ? '#4F8EF7' : 'rgba(248,250,252,0.5)',
                    }}>
                    {c.icono !== '—' && <span>{c.icono}</span>}
                    <span>{c.nombre}</span>
                    {c.saldo_actual !== null && c.saldo_actual > 0 && (
                      <span style={{ fontSize: 11, color: isActive ? 'rgba(79,142,247,0.7)' : 'rgba(248,250,252,0.3)' }}>
                        {fmt(Number(c.saldo_actual))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Categoría — grid de botones con íconos (solo para gastos) */}
          {form.tipo === 'gasto' && (
            <div>
              <span style={labelStyle}>Categoría</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {CATEGORIAS.map(cat => {
                  const isActive = form.categoria === cat.nombre
                  return (
                    <button key={cat.nombre} type="button"
                      onClick={() => setForm(f => ({ ...f, categoria: isActive ? '' : cat.nombre }))}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 4, padding: '10px 6px', borderRadius: 10,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        background: isActive ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isActive ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      <span style={{ fontSize: 20 }}>{cat.icono}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                        color: isActive ? '#4F8EF7' : 'rgba(248,250,252,0.45)',
                      }}>
                        {cat.nombre}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <span style={labelStyle}>Descripción</span>
            <input type="text" placeholder="Ej: Compra en el super, almuerzo..."
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Fecha */}
          <div>
            <span style={labelStyle}>Fecha</span>
            <input type="date" value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={() => router.back()}
              style={{
                flex: 1, height: 46, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(248,250,252,0.5)', borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              style={{
                flex: 2, height: 46,
                background: form.tipo === 'ingreso' ? '#22c55e' : '#4F8EF7',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, fontFamily: 'inherit',
                boxShadow: form.tipo === 'ingreso'
                  ? '0 4px 16px rgba(34,197,94,0.3)'
                  : '0 4px 16px rgba(79,142,247,0.3)',
              }}>
              {loading ? 'Guardando...' : `Guardar ${form.tipo}`}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}
