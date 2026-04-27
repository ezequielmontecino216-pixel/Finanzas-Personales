import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/client'
import { GestionCuentas } from '@/components/cuentas/GestionCuentas'

export default async function CuentasPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerClient()
  const { data: usuario } = await supabase.from('usuarios').select('id').eq('clerk_user_id', userId).single()
  if (!usuario) redirect('/dashboard')

  const { data: cuentas } = await supabase
    .from('cuentas').select('*')
    .eq('usuario_id', usuario.id)
    .order('nombre')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
          Mis cuentas
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(248,250,252,0.4)', margin: '6px 0 0' }}>
          Administrá tus cuentas, saldos y billeteras
        </p>
      </div>
      <GestionCuentas cuentas={cuentas || []} usuarioId={usuario.id} />
    </div>
  )
}
