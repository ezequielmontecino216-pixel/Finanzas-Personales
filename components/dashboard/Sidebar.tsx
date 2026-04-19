'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, ArrowUpDown, MessageSquare } from 'lucide-react'

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/movimientos',  label: 'Movimientos', icon: ArrowUpDown },
  { href: '/chat',         label: 'Chat IA',     icon: MessageSquare, badge: 'IA' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      position: 'fixed', inset: '0 auto 0 0', width: '240px',
      background: '#0d1120',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column', zIndex: 50,
    }}>

      {/* Logo */}
      <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #4F8EF7, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', boxShadow: '0 4px 16px rgba(79,142,247,0.3)',
          }}>
            ◈
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.03em', color: '#F8FAFC' }}>
              Finanzas
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(248,250,252,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>
              Personal
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (pathname.startsWith(href + '/') && href !== '/dashboard')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: active ? 600 : 450,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
                transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
                color: active ? '#F8FAFC' : 'rgba(248,250,252,0.4)',
                background: active ? 'rgba(79,142,247,0.12)' : 'transparent',
                border: active ? '1px solid rgba(79,142,247,0.18)' : '1px solid transparent',
              }}
            >
              <Icon size={15} style={{ opacity: active ? 1 : 0.6, color: active ? '#4F8EF7' : 'inherit', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                  borderRadius: '99px', letterSpacing: '0.04em',
                  background: 'rgba(79,142,247,0.15)',
                  color: '#4F8EF7',
                  border: '1px solid rgba(79,142,247,0.2)',
                }}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer usuario */}
      <div style={{
        padding: '16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <UserButton />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(248,250,252,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Mi cuenta
          </div>
        </div>
      </div>
    </aside>
  )
}
