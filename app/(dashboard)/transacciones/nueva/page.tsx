'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import type { Cuenta } from '@/types'
import { Upload } from 'lucide-react'

export default function NuevaTransaccionPage() {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [imagen, setImagen] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    tipo: 'egreso',
    monto: '',
    moneda: 'ARS',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    cuenta_id: '',
    categoria_id: '',
  })

  useEffect(() => {
    if (!user) return

    async function cargarDatos() {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('clerk_user_id', user!.id)
        .single()

      if (!usuario) return
      setUsuarioId(usuario.id)

      const [{ data: c }, { data: cat }] = await Promise.all([
        supabase.from('cuentas').select('*').eq('usuario_id', usuario.id).eq('activa', true),
        supabase.from('categorias').select('*').eq('usuario_id', usuario.id),
      ])

      setCuentas(c || [])
      setCategorias(cat || [])
    }

    cargarDatos()
  }, [user])

  const categoriasFiltradas = categorias.filter((c) => c.tipo === form.tipo)

  const handleImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImagen(file)
    setImagenPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!usuarioId || !form.cuenta_id || !form.monto) return

    setLoading(true)
    try {
      let imagen_url = null
      if (imagen) {
        const ext = imagen.name.split('.').pop()
        const path = `${usuarioId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('comprobantes').upload(path, imagen)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(path)
          imagen_url = urlData.publicUrl
        }
      }

      const { error } = await supabase.from('transacciones').insert({
        usuario_id: usuarioId,
        cuenta_id: form.cuenta_id,
        categoria_id: form.categoria_id || null,
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        moneda: form.moneda,
        descripcion: form.descripcion || null,
        fecha: form.fecha,
        creado_por_ia: false,
        imagen_url,
      })

      if (error) throw error

      // Actualizar saldo de la cuenta
      const cuenta = cuentas.find((c) => c.id === form.cuenta_id)
      if (cuenta) {
        const delta = form.tipo === 'ingreso' ? parseFloat(form.monto) : -parseFloat(form.monto)
        await supabase
          .from('cuentas')
          .update({ saldo_actual: cuenta.saldo_actual + delta })
          .eq('id', form.cuenta_id)
      }

      router.push('/transacciones')
    } catch (err) {
      console.error(err)
      alert('Error al guardar la transacción')
    } finally {
      setLoading(false)
    }
  }

  // ── shared input style ──────────────────────────────────────────────────────
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
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(248,250,252,0.5)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    marginBottom: 8,
  }

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  // ── type-selector button style ──────────────────────────────────────────────
  const typeButtonStyle = (tipo: string): React.CSSProperties => {
    const isActive = form.tipo === tipo
    if (isActive && tipo === 'egreso') {
      return {
        flex: 1,
        height: 40,
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        background: 'rgba(239,68,68,0.15)',
        border: '1px solid #ef4444',
        color: '#ef4444',
        transition: 'all 0.15s',
      }
    }
    if (isActive && tipo === 'ingreso') {
      return {
        flex: 1,
        height: 40,
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        background: 'rgba(34,197,94,0.15)',
        border: '1px solid #22c55e',
        color: '#22c55e',
        transition: 'all 0.15s',
      }
    }
    return {
      flex: 1,
      height: 40,
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      color: 'rgba(248,250,252,0.4)',
      transition: 'all 0.15s',
    }
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Page header */}
      <div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#F8FAFC',
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}
        >
          Nueva transacción
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'rgba(248,250,252,0.4)',
            margin: '6px 0 0 0',
            fontWeight: 400,
          }}
        >
          Registrá un movimiento manualmente
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

        {/* Tipo */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Tipo</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['egreso', 'ingreso'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, tipo: t, categoria_id: '' }))}
                style={typeButtonStyle(t)}
              >
                {t === 'ingreso' ? '📈 Ingreso' : '📉 Egreso'}
              </button>
            ))}
          </div>
        </div>

        {/* Monto y moneda */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Monto</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={form.moneda}
              onChange={(e) => setForm((f) => ({ ...f, moneda: e.target.value }))}
              style={{
                ...inputStyle,
                width: 90,
                flexShrink: 0,
              }}
            >
              {['ARS', 'USD', 'BTC', 'ETH', 'USDT'].map((m) => (
                <option key={m} style={{ background: '#111827', color: '#F8FAFC' }}>
                  {m}
                </option>
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

        {/* Cuenta */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Cuenta</label>
          <select
            value={form.cuenta_id}
            onChange={(e) => setForm((f) => ({ ...f, cuenta_id: e.target.value }))}
            style={inputStyle}
            required
          >
            <option value="" style={{ background: '#111827', color: 'rgba(248,250,252,0.4)' }}>
              Seleccioná una cuenta
            </option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id} style={{ background: '#111827', color: '#F8FAFC' }}>
                {c.icono} {c.nombre} ({c.moneda})
              </option>
            ))}
          </select>
        </div>

        {/* Categoría */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Categoría</label>
          <select
            value={form.categoria_id}
            onChange={(e) => setForm((f) => ({ ...f, categoria_id: e.target.value }))}
            style={inputStyle}
          >
            <option value="" style={{ background: '#111827', color: 'rgba(248,250,252,0.4)' }}>
              Sin categoría
            </option>
            {categoriasFiltradas.map((c) => (
              <option key={c.id} value={c.id} style={{ background: '#111827', color: '#F8FAFC' }}>
                {c.icono} {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Descripción</label>
          <input
            type="text"
            placeholder="Ej: Compra en el super..."
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            style={inputStyle}
          />
        </div>

        {/* Fecha */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Fecha</label>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            style={{
              ...inputStyle,
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Imagen / Comprobante */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Comprobante (opcional)</label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
              border: '1px dashed rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '20px 16px',
              transition: 'border-color 0.15s',
              textAlign: 'center' as const,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLLabelElement).style.borderColor = 'rgba(79,142,247,0.4)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLLabelElement).style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <Upload
              style={{ width: 18, height: 18, color: 'rgba(248,250,252,0.35)', flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 13,
                color: imagen ? 'rgba(248,250,252,0.7)' : 'rgba(248,250,252,0.35)',
                fontWeight: imagen ? 500 : 400,
              }}
            >
              {imagen ? imagen.name : 'Subir imagen...'}
            </span>
            <input type="file" accept="image/*" onChange={handleImagen} style={{ display: 'none' }} />
          </label>
          {imagenPreview && (
            <img
              src={imagenPreview}
              alt="Preview"
              style={{
                marginTop: 10,
                borderRadius: 10,
                maxHeight: 128,
                width: '100%',
                objectFit: 'cover',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          )}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              flex: 1,
              height: 44,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: 'rgba(248,250,252,0.6)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
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
              border: '1px solid #4F8EF7',
              borderRadius: 10,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

      </form>
    </div>
  )
}
