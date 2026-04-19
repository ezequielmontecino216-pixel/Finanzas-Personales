'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, ArrowUpDown, MessageSquare } from 'lucide-react'

const NAV = [
  { href: '/dashboard',   label: 'Inicio',       icon: LayoutDashboard },
  { href: '/movimientos', label: 'Movimientos',  icon: ArrowUpDown },
  { href: '/chat',        label: 'Chat IA',      icon: MessageSquare },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0d1120',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      zIndex: 100,
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom)',
      height: 64,
    }}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (pathname.startsWith(href + '/') && href !== '/dashboard')
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              flex: 1, padding: '8px 4px',
              textDecoration: 'none',
              color: active ? '#4F8EF7' : 'rgba(248,250,252,0.35)',
              transition: 'color 200ms',
            }}
          >
            <div style={{
              width: 40, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10,
              background: active ? 'rgba(79,142,247,0.12)' : 'transparent',
              transition: 'background 200ms',
            }}>
              <Icon size={18} />
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '0.01em' }}>
              {label}
            </span>
          </Link>
        )
      })}

      {/* Botón de usuario */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '8px 4px',
      }}>
        <div style={{
          width: 40, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UserButton />
        </div>
        <span style={{ fontSize: 10, color: 'rgba(248,250,252,0.35)', letterSpacing: '0.01em' }}>
          Cuenta
        </span>
      </div>
    </nav>
  )
}
