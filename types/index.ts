export type Usuario = {
  id: string
  clerk_user_id: string
  email: string | null
  nombre: string | null
  created_at: string
}

export type Cuenta = {
  id: string
  usuario_id: string
  nombre: string
  tipo: 'billetera' | 'banco' | 'efectivo'
  moneda: string
  saldo_actual: number
  icono: string
  color: string
  activa: boolean
}

export type Transaccion = {
  id: string
  usuario_id: string
  cuenta_id: string | null
  tipo: 'ingreso' | 'gasto'
  subtipo: 'gasto_fijo' | 'cuota' | null
  categoria: string | null
  descripcion: string | null
  monto: number
  moneda: string
  fecha: string
  creado_por_ia: boolean
  imagen_url: string | null
  cuenta?: Partial<Cuenta>
}

export type GastoFijo = {
  id: string
  usuario_id: string
  nombre: string
  monto_estimado: number | null
  categoria: string | null
  metodo_pago: string
  activo: boolean
}

export type GastoFijoPago = {
  id: string
  gasto_fijo_id: string
  usuario_id: string
  mes: string
  pagado: boolean
  fecha_pago: string | null
  monto_real: number | null
}

export type Cuota = {
  id: string
  usuario_id: string
  nombre: string
  monto_por_cuota: number
  cuotas_pagadas: number
  total_cuotas: number | null
  dia_vencimiento: number
  activo: boolean
}

export type CuotaPago = {
  id: string
  cuota_id: string
  usuario_id: string
  numero_cuota: number
  mes: string
  pagado: boolean
  fecha_pago: string | null
  monto: number | null
}

export type Ahorro = {
  id: string
  usuario_id: string
  moneda: string
  monto: number
}

export type RespuestaIA = {
  tipo: 'gasto' | 'ingreso' | 'pago_gasto_fijo' | 'pago_cuota' | 'movimiento_ahorros' | 'agregar_gasto_fijo' | 'eliminar_gasto_fijo' | 'respuesta'
  cuenta_sugerida?: string
  categoria?: string
  descripcion?: string
  monto?: number
  moneda?: string
  gasto_fijo_nombre?: string
  cuota_nombre?: string
  desde?: string
  hasta?: string
  mensaje?: string
}

export type MensajeChat = {
  id: string
  rol: 'usuario' | 'asistente'
  contenido: string
  timestamp: Date
  pendienteAccion?: RespuestaIA
}
