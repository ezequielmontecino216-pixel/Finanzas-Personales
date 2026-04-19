import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'Finanzas — Dashboard',
  description: 'Gestión inteligente de finanzas personales con IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" className={`h-full ${plusJakarta.variable}`}>
        <body className="h-full" style={{ background: '#0B0F1A', color: '#F8FAFC', fontFamily: 'var(--font-jakarta), system-ui, sans-serif' }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
