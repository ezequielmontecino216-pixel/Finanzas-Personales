import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0B0F1A' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: '240px', padding: '40px 40px', overflowY: 'auto', position: 'relative', zIndex: 10 }}>
        {children}
      </main>
    </div>
  )
}
