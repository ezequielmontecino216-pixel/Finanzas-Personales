'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'

const CATEGORIAS = [
  'Supermercado', 'Comidas y salidas', 'Transporte', 'Entretenimiento',
  'Salud', 'Ropa', 'Cuidado personal', 'Hogar', 'Suscripciones',
  'Regalos', 'Gimnasio', 'Handball', 'Trabajo', 'Otros'
]

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#F8FAFC', borderRadius: 10, padding: '10px 14px', fontSize: 13,
  width: '100%', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'rgba(248,250,252,0.5)',
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8,
}

export default function NuevoMovimientoPage() {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cuentas, setCuentas] = useState<any[]>([])
  const [usuarioId, setUsuarioId] = useState<string | null>(null)

  const [form, setForm] = useState({
    tipo: 'gasto',
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
      if (error) throw new Error(error.message + ' (code: ' + error.code + ')')

      // Actualizar saldo de la cuenta
      if (form.cuenta_id) {
        const cuenta = cuentas.find(c => c.id === form.cuenta_id)
        if (cuenta) {
          const delta = form.tipo === 'ingreso' ? monto : -monto
          await supabase.from('cuentas').update({ saldo_actual: Number(cuenta.saldo_actual) + delta }).eq('id', form.cuenta_id)
        }
      }

      router.push('/movimientos')
    } catch (err: any) {
      console.error(err)
      alert('Error al guardar: ' + (err?.message || JSON.stringify(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>Nuevo movimiento</h1>
        <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '6px 0 0' }}>Registrá un ingreso o gasto manualmente</p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tipo */}
        <div>
          <span style={labelStyle}>Tipo</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(['gasto', 'ingreso'] as const).map(t => {
              const isActive = form.tipo === t
              const activeStyle = t === 'gasto'
                ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }
                : { background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }
              return (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t, categoria: '' }))}
                  style={{ padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...(isActive ? activeStyle : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(248,250,252,0.4)' }) }}>
                  {t === 'gasto' ? '💸 Gasto' : '💰 Ingreso'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Monto */}
        <div>
          <span style={labelStyle}>Monto</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
              style={{ ...inputStyle, width: 100 }}>
              {['ARS', 'USD'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" placeholder="0" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              required min="0" step="0.01" style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>

        {/* Cuenta */}
        <div>
          <span style={labelStyle}>Cuenta</span>
          <select value={form.cuenta_id} onChange={e => setForm(f => ({ ...f, cuenta_id: e.target.value }))} style={inputStyle}>
            <option value="">Sin cuenta específica</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>)}
          </select>
        </div>

        {/* Categoría */}
        {form.tipo === 'gasto' && (
          <div>
            <span style={labelStyle}>Categoría</span>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={inputStyle}>
              <option value="">Sin categoría</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Descripción */}
        <div>
          <span style={labelStyle}>Descripción</span>
          <input type="text" placeholder="Ej: Compra en el super..." value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} style={inputStyle} />
        </div>

        {/* Fecha */}
        <div>
          <span style={labelStyle}>Fecha</span>
          <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            style={{ ...inputStyle, colorScheme: 'dark' }} />
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="button" onClick={() => router.back()}
            style={{ flex: 1, height: 44, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(248,250,252,0.5)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            style={{ flex: 1, height: 44, background: '#4F8EF7', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
