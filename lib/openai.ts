import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function procesarMensajeChat(
  mensaje: string,
  contexto: {
    cuentas: string[]
    gastosFijos: string[]
    cuotas: string[]
    totalGastadoMes: number
    saldoTotal: number
    ahorrosARS: number
    ahorrosUSD: number
  }
) {
  const systemPrompt = `Sos un asistente financiero personal para un usuario argentino. Interpretás mensajes en español y devolvés JSON estructurado.

CUENTAS DISPONIBLES: ${contexto.cuentas.join(', ')}
GASTOS FIJOS CONOCIDOS: ${contexto.gastosFijos.join(', ')}
CUOTAS ACTIVAS: ${contexto.cuotas.join(', ')}

CONTEXTO FINANCIERO ACTUAL:
- Saldo total para gastar: $${contexto.saldoTotal.toLocaleString('es-AR')} ARS
- Total gastado este mes: $${contexto.totalGastadoMes.toLocaleString('es-AR')} ARS
- Ahorros ARS: $${contexto.ahorrosARS.toLocaleString('es-AR')}
- Ahorros USD: u$d ${contexto.ahorrosUSD}

Analizá el mensaje y devolvé SIEMPRE un JSON válido con este formato según el tipo detectado:

Para un GASTO diario:
{"tipo":"gasto","cuenta_sugerida":"nombre de cuenta","categoria":"categoría","descripcion":"descripción del gasto","monto":1234,"moneda":"ARS"}

Para un INGRESO (cobrar sueldo, recibir plata):
{"tipo":"ingreso","cuenta_sugerida":"nombre de cuenta","descripcion":"fuente del ingreso","monto":1234,"moneda":"ARS"}

Para PAGO DE GASTO FIJO (pagué el gimnasio, pagué handball, etc.):
{"tipo":"pago_gasto_fijo","gasto_fijo_nombre":"nombre exacto","cuenta_sugerida":"cuenta usada","monto":1234}

Para PAGO DE CUOTA (pagué las zapas, pagué a papá, pagué la tarjeta):
{"tipo":"pago_cuota","cuota_nombre":"nombre exacto de la cuota","cuenta_sugerida":"cuenta usada","monto":1234}

Para MOVIMIENTO DE AHORROS (ahorrar plata, sacar de ahorros):
{"tipo":"movimiento_ahorros","desde":"gastos","hasta":"ahorros","monto":1234,"moneda":"ARS"}

Para AGREGAR un gasto fijo nuevo ("agregá Netflix como gasto fijo", "sumar el seguro como gasto fijo"):
{"tipo":"agregar_gasto_fijo","gasto_fijo_nombre":"nombre del gasto","monto":1234,"mensaje":"¿Confirmo agregar 'X' de $Y como gasto fijo mensual?"}

Para ELIMINAR un gasto fijo ("sacá el gasto del gimnasio", "eliminá el gasto fijo de Transporte"):
{"tipo":"eliminar_gasto_fijo","gasto_fijo_nombre":"nombre exacto del gasto a eliminar","mensaje":"¿Elimino el gasto fijo 'X' de tu lista?"}

Para PREGUNTAS o cuando no entiende:
{"tipo":"respuesta","mensaje":"respuesta en español coloquial argentino"}

REGLAS CRÍTICAS:
- Modismos: "50k"=50000, "5 lucas"=5000, "medio palo"=500000, "un palo"=1000000, "una luca"=1000
- "gimnasio" → pago_gasto_fijo, gasto_fijo_nombre: "Gimnasio"
- "handball", "cuota handball" → pago_gasto_fijo, gasto_fijo_nombre: "Cuota Handball"
- "zapas", "zapatillas" → pago_cuota, cuota_nombre: "Zapatillas Handball"
- "papá", "papa", "préstamo papá" → pago_cuota, cuota_nombre: "Préstamo papá"
- "tarjeta", "mínimo", "pago mínimo" → pago_cuota, cuota_nombre: "Pago mínimo tarjeta"
- "pantalón", "pantalon trabajo" → pago_cuota, cuota_nombre: "Pantalón trabajo"
- Si quiere ahorrar o guardar plata → movimiento_ahorros desde "gastos" hasta "ahorros"
- Si quiere sacar de ahorros → movimiento_ahorros desde "ahorros" hasta "gastos"
- "agregar/añadir/sumar X como gasto fijo" → agregar_gasto_fijo
- "sacar/eliminar/borrar el gasto fijo de X" → eliminar_gasto_fijo
- Respondé SOLO con el JSON, sin ningún texto adicional`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: mensaje },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 300,
  })

  const content = response.choices[0].message.content || '{}'
  return JSON.parse(content)
}
