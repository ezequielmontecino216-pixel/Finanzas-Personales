import { ChatInterface } from '@/components/chat/ChatInterface'

export default function ChatPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(79,142,247,0.15)',
            border: '1px solid rgba(79,142,247,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#4F8EF7',
            flexShrink: 0,
          }}
        >
          ◈
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#F8FAFC',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Chat IA
            </h1>
            <span
              style={{
                background: 'rgba(79,142,247,0.1)',
                border: '1px solid rgba(79,142,247,0.2)',
                color: '#4F8EF7',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '99px',
                padding: '3px 10px',
                lineHeight: 1.4,
              }}
            >
              gpt-4o-mini
            </span>
          </div>
          <p
            style={{
              color: 'rgba(248,250,252,0.4)',
              fontSize: '14px',
              margin: '4px 0 0 0',
              lineHeight: 1.4,
            }}
          >
            Contame en palabras simples qué movimiento querés registrar
          </p>
        </div>
      </div>

      <ChatInterface />
    </div>
  )
}
