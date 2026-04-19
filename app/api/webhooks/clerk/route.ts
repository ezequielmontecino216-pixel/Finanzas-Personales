import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

// Cuentas predefinidas para usuarios nuevos
const CUENTAS_INICIALES = [
  { nombre: 'Mercado Pago', tipo: 'billetera', moneda: 'ARS', icono: '💳', color: '#009ee3' },
  { nombre: 'Ualá', tipo: 'billetera', moneda: 'ARS', icono: '💳', color: '#ff6f00' },
  { nombre: 'Brubank', tipo: 'banco', moneda: 'ARS', icono: '🏦', color: '#00d4ff' },
  { nombre: 'Naranja X', tipo: 'tarjeta_credito', moneda: 'ARS', icono: '🟠', color: '#ff6300' },
  { nombre: 'Lemon Cash', tipo: 'billetera', moneda: 'ARS', icono: '🍋', color: '#f7e200' },
  { nombre: 'Banco Galicia', tipo: 'banco', moneda: 'ARS', icono: '🏦', color: '#d31145' },
  { nombre: 'IOL Invertir Online', tipo: 'inversion', moneda: 'ARS', icono: '📈', color: '#1a56db' },
  { nombre: 'Bull Market', tipo: 'inversion', moneda: 'ARS', icono: '🐂', color: '#057a55' },
  { nombre: 'Binance', tipo: 'inversion', moneda: 'USD', icono: '₿', color: '#f3ba2f' },
  { nombre: 'BNA', tipo: 'banco', moneda: 'ARS', icono: '🏛️', color: '#003087' },
  { nombre: 'Efectivo ARS', tipo: 'efectivo', moneda: 'ARS', icono: '💵', color: '#22c55e' },
  { nombre: 'Efectivo USD', tipo: 'efectivo', moneda: 'USD', icono: '💵', color: '#16a34a' },
]

// Categorías predefinidas
const CATEGORIAS_EGRESOS = [
  { nombre: 'Supermercado', icono: '🛒', color: '#22c55e' },
  { nombre: 'Transporte', icono: '🚗', color: '#3b82f6' },
  { nombre: 'Servicios', icono: '💡', color: '#f59e0b' },
  { nombre: 'Salud', icono: '🏥', color: '#ef4444' },
  { nombre: 'Educación', icono: '📚', color: '#8b5cf6' },
  { nombre: 'Entretenimiento', icono: '🎬', color: '#ec4899' },
  { nombre: 'Restaurantes', icono: '🍽️', color: '#f97316' },
  { nombre: 'Ropa', icono: '👕', color: '#06b6d4' },
  { nombre: 'Tecnología', icono: '💻', color: '#6366f1' },
  { nombre: 'Viajes', icono: '✈️', color: '#14b8a6' },
  { nombre: 'Impuestos', icono: '📄', color: '#64748b' },
  { nombre: 'Regalos', icono: '🎁', color: '#f43f5e' },
  { nombre: 'Mascotas', icono: '🐶', color: '#a16207' },
  { nombre: 'Hogar', icono: '🏠', color: '#0ea5e9' },
  { nombre: 'Otros', icono: '📦', color: '#6b7280' },
]

const CATEGORIAS_INGRESOS = [
  { nombre: 'Salario', icono: '💼', color: '#22c55e' },
  { nombre: 'Freelance', icono: '💻', color: '#3b82f6' },
  { nombre: 'Inversiones', icono: '📈', color: '#f59e0b' },
  { nombre: 'Alquiler', icono: '🏠', color: '#8b5cf6' },
  { nombre: 'Venta', icono: '💰', color: '#ec4899' },
  { nombre: 'Otros', icono: '📦', color: '#6b7280' },
]

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { type, data } = payload

    if (type !== 'user.created') {
      return NextResponse.json({ message: 'Evento ignorado' })
    }

    const supabase = createServerClient()

    // Crear usuario en Supabase
    const { data: nuevoUsuario, error: errorUsuario } = await supabase
      .from('usuarios')
      .insert({
        clerk_user_id: data.id,
        email: data.email_addresses?.[0]?.email_address || '',
        nombre: `${data.first_name || ''} ${data.last_name || ''}`.trim() || null,
      })
      .select('id')
      .single()

    if (errorUsuario || !nuevoUsuario) {
      console.error('Error al crear usuario:', errorUsuario)
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    const usuarioId = nuevoUsuario.id

    // Crear cuentas iniciales
    await supabase.from('cuentas').insert(
      CUENTAS_INICIALES.map((c) => ({ ...c, usuario_id: usuarioId, saldo_actual: 0 }))
    )

    // Crear categorías de egresos
    await supabase.from('categorias').insert(
      CATEGORIAS_EGRESOS.map((c) => ({ ...c, usuario_id: usuarioId, tipo: 'egreso' }))
    )

    // Crear categorías de ingresos
    await supabase.from('categorias').insert(
      CATEGORIAS_INGRESOS.map((c) => ({ ...c, usuario_id: usuarioId, tipo: 'ingreso' }))
    )

    return NextResponse.json({ message: 'Usuario creado correctamente' })
  } catch (error) {
    console.error('Error en webhook:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
