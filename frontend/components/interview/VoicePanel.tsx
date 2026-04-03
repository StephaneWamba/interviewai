'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { Mic, MicOff, PhoneOff } from 'lucide-react'

interface Message {
  role: 'agent' | 'user'
  content: string
  timestamp: Date
}

interface VoicePanelProps {
  signedUrl: string
  dynamicVariables: Record<string, string>
  onContextInjectRef: React.RefObject<((ctx: string) => void) | null>
  onAgentSpeakingChange: (speaking: boolean) => void
  onEnd: () => void
  onReconnect: () => Promise<string>
}

type ConversationStatus = 'idle' | 'connecting' | 'active' | 'disconnected' | 'ended'

// Outer wrapper — provides the ConversationProvider context required by useConversation
export function VoicePanel(props: VoicePanelProps) {
  return (
    <ConversationProvider>
      <VoicePanelInner {...props} />
    </ConversationProvider>
  )
}

// Inner component — uses useConversation inside the provider
function VoicePanelInner({
  signedUrl,
  dynamicVariables,
  onContextInjectRef,
  onAgentSpeakingChange,
  onEnd,
  onReconnect,
}: VoicePanelProps) {
  const [status, setStatus] = useState<ConversationStatus>('idle')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const userEndedRef = useRef(false)

  // Stable callback refs — inline functions passed to useConversation are recreated
  // on every render (e.g. when setIsSpeaking fires). If the SDK detects new callback
  // references it may reinitialize the WebSocket, killing the session mid-conversation.
  const onAgentSpeakingChangeRef = useRef(onAgentSpeakingChange)
  useEffect(() => { onAgentSpeakingChangeRef.current = onAgentSpeakingChange }, [onAgentSpeakingChange])

  const handleConnect = useCallback(() => {
    setStatus('active')
  }, [])

  const handleDisconnect = useCallback((details?: { reason?: string; message?: string; closeCode?: number; closeReason?: string }) => {
    console.error('[ElevenLabs disconnect]', JSON.stringify(details))
    setIsSpeaking(false)
    onAgentSpeakingChangeRef.current(false)
    if (userEndedRef.current) {
      setStatus('ended')
      return
    }
    setStatus('disconnected')
  }, [])

  const handleError = useCallback((err: string) => {
    console.error('ElevenLabs error:', err)
    if (!userEndedRef.current) {
      setStatus('disconnected')
    } else {
      setStatus('ended')
    }
  }, [])

  const handleMessage = useCallback(({ message, source }: { message: string; source: 'ai' | 'user' }) => {
    if (message) {
      setMessages(prev => [...prev, {
        role: source === 'ai' ? 'agent' : 'user',
        content: message,
        timestamp: new Date(),
      }])
    }
  }, [])

  const handleModeChange = useCallback(({ mode }: { mode: 'speaking' | 'listening' }) => {
    const speaking = mode === 'speaking'
    setIsSpeaking(speaking)
    onAgentSpeakingChangeRef.current(speaking)
  }, [])

  const conversation = useConversation({
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError,
    onMessage: handleMessage,
    onModeChange: handleModeChange,
  })

  // Expose sendContextualUpdate to parent via ref
  useEffect(() => {
    onContextInjectRef.current = (ctx: string) => {
      conversation.sendContextualUpdate(ctx)
    }
    return () => { onContextInjectRef.current = null }
  }, [conversation, onContextInjectRef])

  // Auto-scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStart = useCallback(async () => {
    if (!signedUrl) return
    setStatus('connecting')
    try {
      // Do NOT call getUserMedia here — the SDK calls it internally when setting
      // up the AudioWorklet. Calling it before creates a "phantom" stream that
      // conflicts with the SDK's own stream on some browsers, causing silent audio
      // → ElevenLabs VAD timeout → disconnect. Let the SDK own mic acquisition.
      await conversation.startSession({
        signedUrl,
        dynamicVariables,
      })
    } catch (err) {
      console.error('Failed to start:', err)
      setStatus('idle')
    }
  }, [conversation, signedUrl, dynamicVariables])

  const handleEnd = useCallback(async () => {
    userEndedRef.current = true
    conversation.endSession()
    onEnd()
  }, [conversation, onEnd])

  const handleReconnect = useCallback(async () => {
    setStatus('connecting')
    try {
      const freshUrl = await onReconnect()
      await conversation.startSession({ signedUrl: freshUrl, dynamicVariables })
    } catch (err) {
      console.error('Reconnect failed:', err)
      setStatus('disconnected')
    }
  }, [conversation, dynamicVariables, onReconnect])

  const toggleMute = useCallback(() => {
    if (isMuted) {
      conversation.setVolume({ volume: 1 })
    } else {
      conversation.setVolume({ volume: 0 })
    }
    setIsMuted(prev => !prev)
  }, [conversation, isMuted])

  const interviewerName = dynamicVariables.interviewer_name ?? 'Sophie'
  const initials = interviewerName.slice(0, 2).toUpperCase()

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--card)',
      }}
    >
      {/* Agent identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 16px 16px' }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          {isSpeaking && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                boxShadow: '0 0 12px var(--agent-glow), 0 0 24px var(--agent-glow-outer)',
                animation: 'agent-pulse 2s ease-in-out infinite',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, hsl(228,13%,14%), hsl(228,13%,20%))',
              border: '1px solid var(--border-strong)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--foreground)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {initials}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>
            {interviewerName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--foreground-muted)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
            Interviewer technique
          </div>
        </div>

        <Waveform speaking={isSpeaking} />

        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            color: isSpeaking ? 'var(--primary)' : 'var(--foreground-subtle)',
            transition: 'color 200ms ease',
          }}
        >
          {status === 'idle' && 'Prêt à démarrer'}
          {status === 'connecting' && 'Connexion...'}
          {status === 'disconnected' && 'Connexion perdue'}
          {status === 'active' && (isSpeaking ? `${interviewerName} parle...` : 'En écoute')}
          {status === 'ended' && 'Entretien terminé'}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 12,
          minHeight: 0,
        }}
      >
        {messages.length === 0 && status === 'idle' && (
          <div style={{ fontSize: 12, color: 'var(--foreground-subtle)', textAlign: 'center', marginTop: 24, fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
            Cliquez sur Démarrer pour lancer l&apos;entretien
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
        {status === 'idle' && (
          <button
            onClick={handleStart}
            style={{
              flex: 1,
              height: 32,
              background: 'var(--primary)',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--primary-foreground)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            Démarrer
          </button>
        )}

        {status === 'connecting' && (
          <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--foreground-muted)', fontFamily: 'var(--font-sans)' }}>
            Connexion...
          </div>
        )}

        {status === 'disconnected' && (
          <button
            onClick={handleReconnect}
            style={{
              flex: 1,
              height: 32,
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--foreground-muted)',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            Reconnecter
          </button>
        )}

        {status === 'active' && (
          <>
            <button
              onClick={toggleMute}
              title={isMuted ? 'Réactiver le micro' : 'Couper le micro'}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--muted)',
                border: `1px solid ${isMuted ? 'var(--destructive)' : 'var(--border-strong)'}`,
                borderRadius: '50%',
                cursor: 'pointer',
                color: isMuted ? 'var(--destructive)' : 'var(--foreground-muted)',
              }}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            <button
              onClick={handleEnd}
              title="Terminer l'entretien"
              style={{
                flex: 1, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'transparent',
                border: '1px solid hsla(0,72%,51%,0.3)',
                borderRadius: 6,
                fontSize: 12, fontWeight: 500,
                color: 'var(--destructive)',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsla(0,72%,51%,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <PhoneOff size={13} />
              Terminer
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Waveform({ speaking }: { speaking: boolean }) {
  const bars = [
    { delay: '0ms',   peak: '24px' },
    { delay: '100ms', peak: '18px' },
    { delay: '200ms', peak: '28px' },
    { delay: '100ms', peak: '20px' },
    { delay: '50ms',  peak: '16px' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 32 }}>
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: 4,
            borderRadius: 2,
            background: speaking ? 'var(--primary)' : 'var(--border-strong)',
            transition: 'background 200ms ease',
            ['--peak-h' as string]: bar.peak,
            animation: speaking ? `wave-bar 0.8s ease-in-out infinite` : 'none',
            animationDelay: bar.delay,
          }}
        />
      ))}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.role === 'agent'
  return (
    <div
      style={{
        background: isAgent ? 'var(--muted)' : 'transparent',
        borderLeft: `2px solid ${isAgent ? 'var(--primary)' : 'var(--border-strong)'}`,
        borderRadius: 6,
        padding: '7px 10px',
        fontSize: 12,
        lineHeight: 1.55,
        color: isAgent ? 'var(--foreground)' : 'var(--foreground-muted)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {message.content}
    </div>
  )
}
