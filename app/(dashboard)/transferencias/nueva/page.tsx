'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import type { Cuenta } from '@/types'
import { ArrowRight, Upload } from 'lucide-react'

export default function NuevaTransferenciaPage() {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [imagen, setImagen] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    cuenta_origen_id: '',
    cuenta_destino_id: '',
    monto: '',
    moneda: 'ARS',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (!user) return
    async function cargar() {
      const { data: u } = await supabase
        .from('usuarios').select('id').eq('clerk_user_id', user!.id).single()
      if (!u) return
      setUsuarioId(u.id)
      const { data: c } = await supabase
        .from('cuentas').select('*').eq('usuario_id', u.id).eq('activa', true).order('nombre')
      setCuentas(c || [])
    }
    cargar()
  }, [user])

  const handleImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagen(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!usuarioId || !form.cuenta_origen_id || !form.cuenta_destino_id || !form.monto) return
    if (form.cuenta_origen_id === form.cuenta_destino_id) {
      alert('La cuenta origen y destino no pueden ser la misma')
      return
    }

    setLoading(true)
    try {
      let imagen_url = null

      // Subir imagen si hay
      if (imagen) {
        const ext = imagen.name.split('.').pop()
        const path = `${usuarioId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(path, imagen)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
          imagen_url = urlData.publicUrl
        }
      }

      const monto = parseFloat(form.monto)
      const cuentaOrigen = cuentas.find((c) => c.id === form.cuenta_origen_id)
      const cuentaDestino = cuentas.find((c) => c.id === form.cuenta_destino_id)

      // Crear transferencia
      const { error } = await supabase.from('transferencias').insert({
        usuario_id: usuarioId,
        cuenta_origen_id: form.cuenta_origen_id,
        cuenta_destino_id: form.cuenta_destino_id,
        monto,
        moneda: form.moneda,
        descripcion: form.descripcion || null,
        fecha: form.fecha,
        imagen_url,
        creado_por_ia: false,
      })

      if (error) throw error

      // Actualizar saldos
      if (cuentaOrigen) {
        await supabase.from('cuentas')
          .update({ saldo_actual: cuentaOrigen.saldo_actual - monto })
          .eq('id', form.cuenta_origen_id)
      }
      if (cuentaDestino) {
        await supabase.from('cuentas')
          .update({ saldo_actual: cuentaDestino.saldo_actual + monto })
          .eq('id', form.cuenta_destino_id)
      }

      router.push('/transferencias')
    } catch (err) {
      console.error(err)
      alert('Error al guardar la transferencia')
    } finally {
      setLoading(false)
    }
  }

  const cuentaOrigenSeleccionada = cuentas.find((c) => c.id === form.cuenta_origen_id)

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#F8FAFC',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(248,250,252,0.5)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 8,
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
          Nueva transferencia
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', marginTop: 4, marginBottom: 0 }}>
          Movimiento entre cuentas
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Monto y moneda */}
        <div>
          <label style={labelStyle}>Monto</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={form.moneda}
              onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
              style={{ ...inputStyle, width: 110 }}
            >
              {['ARS', 'USD', 'BTC', 'ETH', 'USDT'].map((m) => (
                <option key={m} style={{ background: '#111827' }}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0.00"
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              style={{ ...inputStyle, flex: 1, width: 'auto' }}
              required
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Cuentas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 8, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Desde</label>
            <select
              value={form.cuenta_origen_id}
              onChange={(e) => setForm((f) => ({ ...f, cuenta_origen_id: e.target.value }))}
              style={inputStyle}
              required
            >
              <option value="" style={{ background: '#111827' }}>Seleccioná</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#111827' }}>{c.icono} {c.nombre}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <ArrowRight style={{ color: '#4F8EF7', width: 20, height: 20 }} />
          </div>
          <div>
            <label style={labelStyle}>Hacia</label>
            <select
              value={form.cuenta_destino_id}
              onChange={(e) => setForm((f) => ({ ...f, cuenta_destino_id: e.target.value }))}
              style={inputStyle}
              required
            >
              <option value="" style={{ background: '#111827' }}>Seleccioná</option>
              {cuentas
                .filter((c) => c.id !== form.cuenta_origen_id)
                .map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#111827' }}>{c.icono} {c.nombre}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Saldo disponible */}
        {cuentaOrigenSeleccionada && (
          <p style={{ fontSize: 12, color: 'rgba(248,250,252,0.3)', marginTop: -12, marginBottom: 0 }}>
            Saldo disponible en {cuentaOrigenSeleccionada.nombre}:{' '}
            <span style={{ color: '#22c55e', fontWeight: 600 }}>
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: cuentaOrigenSeleccionada.moneda === 'ARS' ? 'ARS' : 'USD',
                minimumFractionDigits: 0,
              }).format(cuentaOrigenSeleccionada.saldo_actual)}
            </span>
          </p>
        )}

        {/* Descripcion */}
        <div>
          <label style={labelStyle}>Descripcion (opcional)</label>
          <input
            type="text"
            placeholder="Ej: Recarga Naranja X..."
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Fecha */}
        <div>
          <label style={labelStyle}>Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </div>

        {/* Imagen / Comprobante */}
        <div>
          <label style={labelStyle}>Comprobante (opcional)</label>
          <label
            style={{
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '18px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
            }}
          >
            <Upload style={{ color: 'rgba(248,250,252,0.3)', width: 16, height: 16, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)' }}>
              {imagen ? imagen.name : 'Subir imagen...'}
            </span>
            <input type="file" accept="image/*" onChange={handleImagen} style={{ display: 'none' }} />
          </label>
          {imagenPreview && (
            <img
              src={imagenPreview}
              alt="Preview"
              style={{ marginTop: 10, borderRadius: 10, maxHeight: 120, objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              flex: 1,
              height: 44,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(248,250,252,0.5)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              height: 44,
              background: '#4F8EF7',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
