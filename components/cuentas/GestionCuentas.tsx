'use client'

import { useState } from 'react'
import { Plus, X, Pencil, Check, Power } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'

interface Cuenta {
  id: string
  nombre: string
  tipo: string
  moneda: string
  icono: string
  color: string
  saldo_actual: number
  activa: boolean
}

const TIPOS = [
  { value: 'billetera', label: '📱 Billetera virtual' },
  { value: 'banco', label: '🏦 Banco' },
  { value: 'efectivo', label: '💵 Efectivo' },
  { value: 'inversion', label: '📈 Inversión' },
]

const ICONOS_PRESET = ['💳', '🏦', '💵', '📱', '🟠', '🟣', '💙', '🍋', '🔵', '💜', '🏛️', '📈']

const fmt = (n: number, moneda = 'ARS') =>
  moneda === 'USD'
    ? `u$d ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(Number(n))

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#F8FAFC', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  width: '100%', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.4)',
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6,
}

export function GestionCuentas({ cuentas: initialCuentas, usuarioId }: { cuentas: Cuenta[]; usuarioId: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const [cuentas, setCuentas] = useState<Cuenta[]>(initialCuentas)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editandoSaldo, setEditandoSaldo] = useState<string | null>(null)
  const [nuevoSaldo, setNuevoSaldo] = useState('')
  const [form, setForm] = useState({
    nombre: '', tipo: 'billetera', moneda: 'ARS',
    icono: '💳', color: '#4F8EF7', saldo_actual: '',
  })

  const activas = cuentas.filter(c => c.activa)
  const inactivas = cuentas.filter(c => !c.activa)

  async function agregarCuenta() {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('cuentas').insert({
        usuario_id: usuarioId,
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        moneda: form.moneda,
        icono: form.icono,
        color: form.color,
        saldo_actual: form.saldo_actual ? parseFloat(form.saldo_actual) : 0,
        activa: true,
      }).select().single()
      if (error) throw error
      setCuentas(prev => [...prev, data])
      setForm({ nombre: '', tipo: 'billetera', moneda: 'ARS', icono: '💳', color: '#4F8EF7', saldo_actual: '' })
      setShowForm(false)
      toast(`"${data.nombre}" creada`, 'success')
      router.refresh()
    } catch {
      toast('No se pudo crear la cuenta', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function guardarSaldo(id: string) {
    const monto = parseFloat(nuevoSaldo)
    if (isNaN(monto)) { toast('Monto inválido', 'error'); return }
    try {
      await supabase.from('cuentas').update({ saldo_actual: monto }).eq('id', id)
      setCuentas(prev => prev.map(c => c.id === id ? { ...c, saldo_actual: monto } : c))
      setEditandoSaldo(null)
      toast('Saldo actualizado', 'success')
      router.refresh()
    } catch {
      toast('No se pudo actualizar', 'error')
    }
  }

  async function toggleActiva(cuenta: Cuenta) {
    try {
      await supabase.from('cuentas').update({ activa: !cuenta.activa }).eq('id', cuenta.id)
      setCuentas(prev => prev.map(c => c.id === cuenta.id ? { ...c, activa: !c.activa } : c))
      toast(cuenta.activa ? `"${cuenta.nombre}" desactivada` : `"${cuenta.nombre}" reactivada`, 'info')
      router.refresh()
    } catch {
      toast('No se pudo cambiar el estado', 'error')
    }
  }

  const CuentaRow = ({ cuenta }: { cuenta: Cuenta }) => {
    const isEditando = editandoSaldo === cuenta.id
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 10,
        background: cuenta.activa ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${cuenta.activa ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`,
        opacity: cuenta.activa ? 1 : 0.5,
        marginBottom: 6,
      }}>
        {/* Ícono + color */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${cuenta.color || '#4F8EF7'}18`,
          border: `2px solid ${cuenta.color || '#4F8EF7'}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {cuenta.icono}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cuenta.nombre}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(248,250,252,0.35)', margin: '2px 0 0' }}>
            {TIPOS.find(t => t.value === cuenta.tipo)?.label?.split(' ').slice(1).join(' ') || cuenta.tipo} · {cuenta.moneda}
          </p>
        </div>

        {/* Saldo editable */}
        {isEditando ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number" value={nuevoSaldo}
              onChange={e => setNuevoSaldo(e.target.value)}
              autoFocus
              style={{ ...inputStyle, width: 110, padding: '6px 10px', fontSize: 13, textAlign: 'right' }}
              onKeyDown={e => { if (e.key === 'Enter') guardarSaldo(cuenta.id); if (e.key === 'Escape') setEditandoSaldo(null) }}
            />
            <button onClick={() => guardarSaldo(cuenta.id)} style={{
              background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#22c55e',
            }}><Check size={13} /></button>
            <button onClick={() => setEditandoSaldo(null)} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(248,250,252,0.4)',
            }}><X size={13} /></button>
          </div>
        ) : (
          <button onClick={() => { setEditandoSaldo(cuenta.id); setNuevoSaldo(String(cuenta.saldo_actual)) }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(cuenta.saldo_actual, cuenta.moneda)}
            </span>
            <Pencil size={11} style={{ color: 'rgba(248,250,252,0.25)', flexShrink: 0 }} />
          </button>
        )}

        {/* Activar/desactivar */}
        <button onClick={() => toggleActiva(cuenta)} title={cuenta.activa ? 'Desactivar' : 'Reactivar'}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: cuenta.activa ? 'rgba(248,250,252,0.2)' : '#22c55e',
            padding: '4px', borderRadius: 6, display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = cuenta.activa ? '#ef4444' : '#22c55e' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = cuenta.activa ? 'rgba(248,250,252,0.2)' : '#22c55e' }}
        >
          <Power size={14} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Activas */}
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Cuentas activas ({activas.length})
          </p>
          <button onClick={() => setShowForm(v => !v)} style={{
            background: showForm ? 'rgba(239,68,68,0.08)' : 'rgba(79,142,247,0.08)',
            border: showForm ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(79,142,247,0.2)',
            borderRadius: 8, padding: '5px 11px',
            color: showForm ? '#ef4444' : '#4F8EF7',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
          }}>
            {showForm ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Nueva cuenta</>}
          </button>
        </div>

        {/* Formulario nueva cuenta */}
        {showForm && (
          <div style={{
            background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.12)',
            borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input placeholder="Ej: Naranja X, Efectivo..." value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  style={{ ...inputStyle, colorScheme: 'dark' }}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Moneda</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['ARS', 'USD'].map(m => (
                    <button key={m} type="button" onClick={() => setForm(f => ({ ...f, moneda: m }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        background: form.moneda === m ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
                        border: form.moneda === m ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        color: form.moneda === m ? '#4F8EF7' : 'rgba(248,250,252,0.4)',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Saldo inicial</label>
                <input type="number" placeholder="0" value={form.saldo_actual}
                  onChange={e => setForm(f => ({ ...f, saldo_actual: e.target.value }))}
                  style={inputStyle} min="0" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Ícono</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ICONOS_PRESET.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icono: ic }))}
                    style={{
                      width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                      background: form.icono === ic ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
                      border: form.icono === ic ? '1px solid rgba(79,142,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={agregarCuenta} disabled={saving || !form.nombre.trim()} style={{
              background: '#4F8EF7', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: saving || !form.nombre.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !form.nombre.trim() ? 0.5 : 1,
            }}>
              {saving ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        )}

        {activas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.3)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
            No tenés cuentas activas. ¡Agregá una!
          </p>
        ) : (
          activas.map(c => <CuentaRow key={c.id} cuenta={c} />)
        )}
      </div>

      {/* Desactivadas */}
      {inactivas.length > 0 && (
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(248,250,252,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
            Desactivadas ({inactivas.length})
          </p>
          {inactivas.map(c => <CuentaRow key={c.id} cuenta={c} />)}
        </div>
      )}
    </div>
  )
}
