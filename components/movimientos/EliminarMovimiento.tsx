'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'

interface Props {
  transaccionId: string
  cuentaId: string | null
  monto: number
  tipo: string
}

export function EliminarMovimiento({ transaccionId, cuentaId, monto, tipo }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  async function eliminar() {
    setLoading(true)
    try {
      if (cuentaId) {
        const { data: cuenta } = await supabase
          .from('cuentas').select('saldo_actual').eq('id', cuentaId).single()
        if (cuenta) {
          const delta = tipo === 'ingreso' ? -monto : monto
          await supabase.from('cuentas')
            .update({ saldo_actual: Number(cuenta.saldo_actual) + delta })
            .eq('id', cuentaId)
        }
      }
      await supabase.from('transacciones').delete().eq('id', transaccionId)
      toast('Movimiento eliminado', 'info')
      router.refresh()
    } catch {
      toast('Error al eliminar', 'error')
    } finally {
      setLoading(false)
      setConfirmando(false)
    }
  }

  if (confirmando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button onClick={() => setConfirmando(false)} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, color: 'rgba(248,250,252,0.5)', fontSize: 11,
          fontWeight: 600, padding: '4px 8px', cursor: 'pointer',
        }}>No</button>
        <button onClick={eliminar} disabled={loading} style={{
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 6, color: '#ef4444', fontSize: 11, fontWeight: 600,
          padding: '4px 8px', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? '...' : 'Sí'}
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirmando(true)} title="Eliminar"
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '6px', borderRadius: 6, color: 'rgba(248,250,252,0.2)',
        display: 'flex', alignItems: 'center', transition: 'color 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(248,250,252,0.2)' }}
    >
      <Trash2 size={14} />
    </button>
  )
}
