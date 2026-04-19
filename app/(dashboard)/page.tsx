import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { TransactionList } from '@/components/dashboard/TransactionList'
import { createServerClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerClient()

  // Obtener usuario de Supabase
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!usuario) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-2xl mb-4">⏳</p>
          <p className="text-slate-400">Configurando tu cuenta...</p>
          <p className="text-sm text-slate-500 mt-2">Actualizá la página en unos segundos</p>
        </div>
      </div>
    )
  }

  // Obtener datos del mes actual
  const inicio = new Date()
  inicio.setDate(1)
  const inicioStr = inicio.toISOString().split('T')[0]

  const [{ data: transaccionesMes }, { data: transaccionesRecientes }, { data: cuentas }] =
    await Promise.all([
      supabase
        .from('transacciones')
        .select('tipo, monto, moneda')
        .eq('usuario_id', usuario.id)
        .gte('fecha', inicioStr),
      supabase
        .from('transacciones')
        .select('*, cuenta:cuentas(nombre, icono, color), categoria:categorias(nombre, icono, color)')
        .eq('usuario_id', usuario.id)
        .order('fecha', { ascending: false })
        .limit(8),
      supabase
        .from('cuentas')
        .select('saldo_actual, moneda')
        .eq('usuario_id', usuario.id)
        .eq('activa', true),
    ])

  // Calcular totales
  const ingresosMes = (transaccionesMes || [])
    .filter((t) => t.tipo === 'ingreso' && t.moneda === 'ARS')
    .reduce((sum, t) => sum + Number(t.monto), 0)

  const egresosMes = (transaccionesMes || [])
    .filter((t) => t.tipo === 'egreso' && t.moneda === 'ARS')
    .reduce((sum, t) => sum + Number(t.monto), 0)

  const balanceTotalARS = (cuentas || [])
    .filter((c) => c.moneda === 'ARS')
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0)

  const balanceTotalUSD = (cuentas || [])
    .filter((c) => c.moneda === 'USD')
    .reduce((sum, c) => sum + Number(c.saldo_actual), 0)

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Tarjetas de balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          titulo="Balance ARS"
          monto={balanceTotalARS}
          moneda="ARS"
          tipo="total"
          icono="🏦"
        />
        <BalanceCard
          titulo="Balance USD"
          monto={balanceTotalUSD}
          moneda="USD"
          tipo="total"
          icono="💵"
        />
        <BalanceCard
          titulo="Ingresos del mes"
          monto={ingresosMes}
          moneda="ARS"
          tipo="ingreso"
          icono="📈"
        />
        <BalanceCard
          titulo="Egresos del mes"
          monto={egresosMes}
          moneda="ARS"
          tipo="egreso"
          icono="📉"
        />
      </div>

      {/* Acceso rápido */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link
          href="/chat"
          className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 hover:bg-green-500/20 transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">🤖</span>
          <div>
            <p className="text-sm font-semibold text-green-400">Chat IA</p>
            <p className="text-xs text-slate-500">Registrá por voz</p>
          </div>
        </Link>
        <Link
          href="/transacciones/nueva"
          className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:bg-slate-700 transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">➕</span>
          <div>
            <p className="text-sm font-semibold text-white">Nueva transacción</p>
            <p className="text-xs text-slate-500">Formulario manual</p>
          </div>
        </Link>
        <Link
          href="/analytics"
          className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:bg-slate-700 transition-colors flex items-center gap-3"
        >
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-semibold text-white">Analytics</p>
            <p className="text-xs text-slate-500">Ver gráficos</p>
          </div>
        </Link>
      </div>

      {/* Transacciones recientes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Transacciones recientes</h2>
          <Link href="/transacciones" className="text-sm text-green-400 hover:text-green-300">
            Ver todas →
          </Link>
        </div>
        <TransactionList transacciones={transaccionesRecientes || []} />
      </div>
    </div>
  )
}
