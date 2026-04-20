'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

const COLORS = {
  success: { bg: '#0a1f0f', border: 'rgba(34,197,94,0.4)', text: '#22c55e', icon: '✅' },
  error:   { bg: '#1a0808', border: 'rgba(239,68,68,0.4)',  text: '#ef4444', icon: '❌' },
  info:    { bg: '#080f1a', border: 'rgba(79,142,247,0.4)', text: '#4F8EF7', icon: 'ℹ️' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 80, right: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type]
          return (
            <div key={t.id} className="toast-enter" style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.text,
              borderRadius: 12,
              padding: '11px 16px',
              fontSize: 13,
              fontWeight: 500,
              maxWidth: 300,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'inherit',
            }}>
              <span>{c.icon}</span>
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
