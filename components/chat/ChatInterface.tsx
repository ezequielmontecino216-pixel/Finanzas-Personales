'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase/client'
import type { MensajeChat, RespuestaIA, Cuenta } from '@/types'
import { Send, Loader2, Trash2 } from 'lucide-react'

const EJEMPLOS = [
  'Gasté 3000 en el super',
  'Pagué el gimnasio',
  'Cobré el sueldo de 500k',
  'Agregá Netflix $15k como gasto fijo',
  'Eliminá el gasto fijo de Gimnasio',
  '¿Cuánto gasté este mes?',
]

const MSG_BIENVENIDA: MensajeChat = {
  id: 'welcome',
  rol: 'asistente',
  contenido: '¡Hola! 👋 Soy tu asistente financiero.\n\nPuedo registrar gastos, ingresos, pagos de cuotas y gastos fijos, o responder preguntas sobre tus finanzas.\n\n¿Qué necesitás?',
  timestamp: new Date(),
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n)

function resumenAccion(data: RespuestaIA, cuentas: Cuenta[]): string {
  const cuenta = cuentas.find(c => c.nombre.toLowerCase().includes((data.cuenta_sugerida || '').toLowerCase()))
  if (data.tipo === 'gasto') return `Detecté un gasto:\n\n💸 -${data.moneda || 'ARS'} ${fmt(data.monto || 0)}\n📂 ${data.categoria || 'Sin categoría'}\n📝 ${data.descripcion || '—'}${cuenta ? `\n🏦 ${cuenta.nombre}` : ''}\n\n¿Confirmás?`
  if (data.tipo === 'ingreso') return `Detecté un ingreso:\n\n💰 +${data.moneda || 'ARS'} ${fmt(data.monto || 0)}\n📝 ${data.descripcion || '—'}${cuenta ? `\n🏦 ${cuenta.nombre}` : ''}\n\n¿Confirmás?`
  if (data.tipo === 'pago_gasto_fijo') return `Voy a marcar como pagado:\n\n✅ ${data.gasto_fijo_nombre}\n💰 ${fmt(data.monto || 0)}${cuenta ? `\n🏦 ${cuenta.nombre}` : ''}\n\n¿Confirmás?`
  if (data.tipo === 'pago_cuota') return `Voy a registrar el pago de cuota:\n\n💳 ${data.cuota_nombre}\n💰 ${fmt(data.monto || 0)}${cuenta ? `\n🏦 ${cuenta.nombre}` : ''}\n\n¿Confirmás?`
  if (data.tipo === 'movimiento_ahorros') return `Voy a mover plata:\n\n💸 ${fmt(data.monto || 0)} ${data.moneda || 'ARS'}\n📤 Desde: ${data.desde}\n📥 Hacia: ${data.hasta}\n\n¿Confirmás?`
  if (data.tipo === 'agregar_gasto_fijo') return `${data.mensaje || `¿Confirmo agregar "${data.gasto_fijo_nombre}" como gasto fijo?`}\n\n📋 ${data.gasto_fijo_nombre}${data.monto ? `\n💰 ${fmt(data.monto)} por mes` : ''}\n\n¿Confirmás?`
  if (data.tipo === 'eliminar_gasto_fijo') return `${data.mensaje || `¿Elimino el gasto fijo "${data.gasto_fijo_nombre}"?`}\n\n🗑️ ${data.gasto_fijo_nombre}\n\n¿Confirmás?`
  return ''
}

export function ChatInterface() {
  const { user } = useUser()
  const [mensajes, setMensajes] = useState<MensajeChat[]>([MSG_BIENVENIDA])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [pendiente, setPendiente] = useState<{ accion: RespuestaIA; mensajeId: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  // Cargar datos del usuario + historial de chat
  useEffect(() => {
    if (!user) return
    async function cargar() {
      const { data: u } = await supabase.from('usuarios').select('id').eq('clerk_user_id', user!.id).single()
      if (!u) { setLoadingHistorial(false); return }
      setUsuarioId(u.id)

      const [{ data: c }, { data: historial }] = await Promise.all([
        supabase.from('cuentas').select('*').eq('usuario_id', u.id).eq('activa', true),
        supabase.from('mensajes_chat').select('*').eq('usuario_id', u.id)
          .order('created_at', { ascending: true }).limit(200),
      ])

      setCuentas(c || [])

      if (historial && historial.length > 0) {
        setMensajes(historial.map((m: any) => ({
          id: m.id,
          rol: m.rol as 'usuario' | 'asistente',
          contenido: m.contenido,
          timestamp: new Date(m.created_at),
          // No restauramos pendienteAccion — si se recarga, el user vuelve a pedir
        })))
      }
      setLoadingHistorial(false)
    }
    cargar()
  }, [user])

  // Guardar mensaje en Supabase (fire and forget)
  async function guardarEnDB(msg: { rol: string; contenido: string }) {
    if (!usuarioId) return
    await supabase.from('mensajes_chat').insert({
      usuario_id: usuarioId,
      rol: msg.rol,
      contenido: msg.contenido,
    })
  }

  const agregarMensaje = (msg: Omit<MensajeChat, 'id' | 'timestamp'>): MensajeChat => {
    const nuevo: MensajeChat = { ...msg, id: Date.now().toString(), timestamp: new Date() }
    setMensajes(prev => [...prev, nuevo])
    // Guardar en Supabase sin bloquear la UI
    guardarEnDB({ rol: msg.rol, contenido: msg.contenido })
    return nuevo
  }

  async function limpiarHistorial() {
    if (!usuarioId) return
    if (!confirm('¿Limpiar todo el historial del chat?')) return
    await supabase.from('mensajes_chat').delete().eq('usuario_id', usuarioId)
    setMensajes([MSG_BIENVENIDA])
    setPendiente(null)
  }

  const enviar = async (texto?: string) => {
    const msg = texto || input.trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)
    agregarMensaje({ rol: 'usuario', contenido: msg })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: msg }),
      })
      const data = await res.json()

      if (!data.success) {
        agregarMensaje({ rol: 'asistente', contenido: `❌ ${data.error || 'Error inesperado'}` })
        return
      }
      if (data.tipo === 'respuesta') {
        agregarMensaje({ rol: 'asistente', contenido: data.mensaje || '—' })
        return
      }

      const resumen = resumenAccion(data as RespuestaIA, cuentas)
      const nuevoMsg = agregarMensaje({ rol: 'asistente', contenido: resumen, pendienteAccion: data as RespuestaIA })
      setPendiente({ accion: data as RespuestaIA, mensajeId: nuevoMsg.id })
    } catch {
      agregarMensaje({ rol: 'asistente', contenido: '❌ Error de conexión. Intentá de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  const confirmar = async () => {
    if (!pendiente || !usuarioId) return
    const { accion } = pendiente
    setPendiente(null)

    try {
      const mes = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const fecha = new Date().toISOString().split('T')[0]
      const cuenta = cuentas.find(c => c.nombre.toLowerCase().includes((accion.cuenta_sugerida || '').toLowerCase())) || cuentas[0]

      if (accion.tipo === 'gasto' || accion.tipo === 'ingreso') {
        await supabase.from('transacciones').insert({
          usuario_id: usuarioId, cuenta_id: cuenta?.id || null,
          tipo: accion.tipo, categoria: accion.categoria || null,
          descripcion: accion.descripcion || null, monto: accion.monto,
          moneda: accion.moneda || 'ARS', fecha, creado_por_ia: true,
        })
        if (cuenta && accion.monto) {
          const delta = accion.tipo === 'ingreso' ? accion.monto : -(accion.monto)
          await supabase.from('cuentas').update({ saldo_actual: cuenta.saldo_actual + delta }).eq('id', cuenta.id)
          setCuentas(prev => prev.map(c => c.id === cuenta.id ? { ...c, saldo_actual: c.saldo_actual + delta } : c))
        }
      } else if (accion.tipo === 'pago_gasto_fijo') {
        const { data: gf } = await supabase.from('gastos_fijos')
          .select('id,monto_estimado').eq('usuario_id', usuarioId)
          .ilike('nombre', `%${accion.gasto_fijo_nombre || ''}%`).single()
        if (gf) {
          await supabase.from('gastos_fijos_pagos').upsert({
            gasto_fijo_id: gf.id, usuario_id: usuarioId, mes,
            pagado: true, fecha_pago: fecha, monto_real: accion.monto || gf.monto_estimado || null,
          }, { onConflict: 'gasto_fijo_id,mes' })
          await supabase.from('transacciones').insert({
            usuario_id: usuarioId, cuenta_id: cuenta?.id || null,
            tipo: 'gasto', subtipo: 'gasto_fijo', categoria: 'Gasto fijo',
            descripcion: accion.gasto_fijo_nombre, monto: accion.monto || gf.monto_estimado || 0,
            moneda: 'ARS', fecha, creado_por_ia: true,
          })
          if (cuenta && (accion.monto || gf.monto_estimado)) {
            const delta = -(accion.monto || gf.monto_estimado || 0)
            await supabase.from('cuentas').update({ saldo_actual: cuenta.saldo_actual + delta }).eq('id', cuenta.id)
            setCuentas(prev => prev.map(c => c.id === cuenta.id ? { ...c, saldo_actual: c.saldo_actual + delta } : c))
          }
        } else {
          agregarMensaje({ rol: 'asistente', contenido: `❌ No encontré el gasto fijo "${accion.gasto_fijo_nombre}".` }); return
        }
      } else if (accion.tipo === 'pago_cuota') {
        const { data: cuota } = await supabase.from('cuotas')
          .select('id,monto_por_cuota,cuotas_pagadas,total_cuotas').eq('usuario_id', usuarioId)
          .ilike('nombre', `%${accion.cuota_nombre || ''}%`).single()
        if (cuota) {
          const nuevasCuotasPagadas = cuota.cuotas_pagadas + 1
          const terminada = cuota.total_cuotas && nuevasCuotasPagadas >= cuota.total_cuotas
          await supabase.from('cuotas').update({ cuotas_pagadas: nuevasCuotasPagadas, activo: !terminada }).eq('id', cuota.id)
          await supabase.from('transacciones').insert({
            usuario_id: usuarioId, cuenta_id: cuenta?.id || null,
            tipo: 'gasto', subtipo: 'cuota', categoria: 'Cuota', descripcion: accion.cuota_nombre,
            monto: accion.monto || cuota.monto_por_cuota, moneda: 'ARS', fecha, creado_por_ia: true,
          })
          if (cuenta) {
            const delta = -(accion.monto || cuota.monto_por_cuota)
            await supabase.from('cuentas').update({ saldo_actual: cuenta.saldo_actual + delta }).eq('id', cuenta.id)
            setCuentas(prev => prev.map(c => c.id === cuenta.id ? { ...c, saldo_actual: c.saldo_actual + delta } : c))
          }
          if (terminada) { agregarMensaje({ rol: 'asistente', contenido: `✅ ¡Guardado! La cuota de ${accion.cuota_nombre} está completamente pagada 🎉` }); return }
        } else {
          agregarMensaje({ rol: 'asistente', contenido: `❌ No encontré la cuota "${accion.cuota_nombre}".` }); return
        }
      } else if (accion.tipo === 'movimiento_ahorros') {
        const { data: ahorros } = await supabase.from('ahorros').select('*').eq('usuario_id', usuarioId)
        const moneda = accion.moneda || 'ARS'
        const ahorro = ahorros?.find((a: any) => a.moneda === moneda)
        if (ahorro) {
          const delta = accion.desde === 'ahorros' ? -(accion.monto || 0) : (accion.monto || 0)
          await supabase.from('ahorros').update({ monto: ahorro.monto + delta }).eq('id', ahorro.id)
        }
      } else if (accion.tipo === 'agregar_gasto_fijo') {
        if (!accion.gasto_fijo_nombre) { agregarMensaje({ rol: 'asistente', contenido: '❌ No entendí el nombre del gasto fijo.' }); return }
        const { error } = await supabase.from('gastos_fijos').insert({ usuario_id: usuarioId, nombre: accion.gasto_fijo_nombre, monto_estimado: accion.monto || null })
        if (error) throw error
        agregarMensaje({ rol: 'asistente', contenido: `✅ Agregué "${accion.gasto_fijo_nombre}" a tus gastos fijos.` }); return
      } else if (accion.tipo === 'eliminar_gasto_fijo') {
        if (!accion.gasto_fijo_nombre) { agregarMensaje({ rol: 'asistente', contenido: '❌ No entendí qué gasto fijo eliminar.' }); return }
        const { data: gf } = await supabase.from('gastos_fijos').select('id, nombre').eq('usuario_id', usuarioId).ilike('nombre', `%${accion.gasto_fijo_nombre}%`).single()
        if (!gf) { agregarMensaje({ rol: 'asistente', contenido: `❌ No encontré un gasto fijo llamado "${accion.gasto_fijo_nombre}".` }); return }
        await supabase.from('gastos_fijos').delete().eq('id', gf.id)
        agregarMensaje({ rol: 'asistente', contenido: `✅ Eliminé "${gf.nombre}" de tus gastos fijos.` }); return
      }

      agregarMensaje({ rol: 'asistente', contenido: '✅ ¡Guardado correctamente! ¿Necesitás algo más?' })
    } catch {
      agregarMensaje({ rol: 'asistente', contenido: '❌ No pude guardar. Intentá de nuevo.' })
    }
  }

  const cancelar = () => {
    setPendiente(null)
    agregarMensaje({ rol: 'asistente', contenido: 'Cancelado. ¿Querés cambiar algo?' })
  }

  return (
    <div className="chat-container">

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>

        {loadingHistorial ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 className="animate-spin" style={{ width: 20, height: 20, color: 'rgba(248,250,252,0.3)' }} />
          </div>
        ) : (
          mensajes.map(msg => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.rol === 'usuario' ? 'flex-end' : 'flex-start' }}>
              {msg.rol === 'usuario' ? (
                <div style={{
                  background: '#4F8EF7', color: '#fff',
                  borderRadius: '18px 18px 4px 18px',
                  padding: '10px 14px', maxWidth: '78%',
                  fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line',
                }}>
                  {msg.contenido}
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.04)', color: '#F8FAFC',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '4px 18px 18px 18px',
                  padding: '10px 14px', maxWidth: '78%',
                  fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-line',
                }}>
                  {msg.contenido}
                  {msg.pendienteAccion && pendiente?.mensajeId === msg.id && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button onClick={confirmar} style={{
                        flex: 1, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#22c55e', borderRadius: 8, padding: '8px 0',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      }}>✅ Confirmar</button>
                      <button onClick={cancelar} style={{
                        flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(248,250,252,0.5)', borderRadius: 8, padding: '8px 0',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                      }}>❌ Cancelar</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 14px' }}>
              <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: '#4F8EF7' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Ejemplos rápidos */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 0 6px' }}>
        {EJEMPLOS.map(ej => (
          <button key={ej} onClick={() => enviar(ej)} disabled={loading} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(248,250,252,0.5)', borderRadius: 99, padding: '5px 12px',
            fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit',
          }}>
            {ej}
          </button>
        ))}
      </div>

      {/* Input + botones */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
          placeholder="Escribí qué movimiento querés registrar..."
          disabled={loading}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#F8FAFC',
            borderRadius: 12, padding: '12px 16px', fontSize: 13, outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button onClick={() => enviar()} disabled={loading || !input.trim()} style={{
          width: 44, height: 44, background: '#4F8EF7', color: '#fff', border: 'none',
          borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
          opacity: (loading || !input.trim()) ? 0.4 : 1,
          transition: 'opacity 0.15s',
        }}>
          <Send style={{ width: 16, height: 16 }} />
        </button>
        {mensajes.length > 1 && (
          <button onClick={limpiarHistorial} title="Limpiar historial" style={{
            width: 44, height: 44, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(248,250,252,0.3)',
            borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,250,252,0.3)' }}
          >
            <Trash2 style={{ width: 15, height: 15 }} />
          </button>
        )}
      </div>
    </div>
  )
}
