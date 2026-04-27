'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

export function BuscadorMovimientos({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)
  const [, startTransition] = useTransition()

  function buscar(value: string) {
    setQ(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set('q', value.trim())
    } else {
      params.delete('q')
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  function limpiar() {
    setQ('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(248,250,252,0.3)', pointerEvents: 'none' }}>
        <Search size={14} />
      </div>
      <input
        type="text"
        value={q}
        onChange={e => buscar(e.target.value)}
        placeholder="Buscar por descripción, categoría o cuenta..."
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#F8FAFC', borderRadius: 8, padding: '8px 36px',
          fontSize: 13, outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(79,142,247,0.4)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
      />
      {q && (
        <button onClick={limpiar} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(248,250,252,0.4)', display: 'flex', alignItems: 'center', padding: 2,
        }}>
          <X size={13} />
        </button>
      )}
    </div>
  )
}
