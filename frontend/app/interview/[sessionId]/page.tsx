'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { VoicePanel } from '@/components/interview/VoicePanel'
import { CodeEditor } from '@/components/interview/CodeEditor'
import { Terminal } from '@/components/interview/Terminal'
import { Header } from '@/components/interview/Header'

function InterviewHintBanner({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      style={{
        background: 'hsla(217,91%,60%,0.1)',
        borderBottom: '1px solid hsla(217,91%,60%,0.2)',
        padding: '7px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {[
          '🎤 Cliquez "Démarrer" dans le panneau gauche pour activer le micro',
          '💻 Écrivez votre code dans l\'éditeur — Sophie le voit en temps réel',
          '▶ Exécutez avec le bouton "Exécuter" ou ⌘↵',
        ].map((hint, i) => (
          <span key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--primary)' }}>
            {hint}
          </span>
        ))}
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-subtle)', padding: 0 }}
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

interface TerminalLine {
  type: 'stdout' | 'stderr' | 'info' | 'prompt'
  content: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function InterviewPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [sessionData, setSessionData] = useState<{
    signed_url: string
    dynamic_variables: Record<string, string>
  } | null>(null)

  const [language, setLanguage] = useState('python')
  const [isRunning, setIsRunning] = useState(false)
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [status, setStatus] = useState<'active' | 'ended' | 'pending'>('pending')
  const [showHints, setShowHints] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('interviewai_interview_hints')
    if (!seen) {
      setShowHints(true)
      localStorage.setItem('interviewai_interview_hints', '1')
    }
  }, [])

  const injectContextRef = useRef<((ctx: string) => void) | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch session data (signed URL + dynamic vars)
  useEffect(() => {
    const stored = sessionStorage.getItem(`interview_${sessionId}`)
    if (stored) {
      setSessionData(JSON.parse(stored))
      setStatus('active')
    } else {
      router.push('/')
    }
  }, [sessionId, router])

  // WebSocket connection
  useEffect(() => {
    if (!sessionId) return

    let ws: WebSocket

    const connect = () => {
      const wsUrl = API_BASE.replace(/^http/, 'ws')
      ws = new WebSocket(`${wsUrl}/ws/${sessionId}`)
      wsRef.current = ws

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'inject_context' && injectContextRef.current) {
          injectContextRef.current(data.context)
        }

        if (data.type === 'execution_start') {
          setIsRunning(true)
          setTerminalLines(prev => [...prev, { type: 'prompt', content: `$ python solution.py` }])
        }

        if (data.type === 'execution_result') {
          setIsRunning(false)
          setExitCode(data.exit_code)
          if (data.stdout) {
            setTerminalLines(prev => [
              ...prev,
              ...data.stdout.split('\n').filter(Boolean).map((l: string) => ({ type: 'stdout' as const, content: l }))
            ])
          }
          if (data.stderr) {
            setTerminalLines(prev => [
              ...prev,
              ...data.stderr.split('\n').filter(Boolean).map((l: string) => ({ type: 'stderr' as const, content: l }))
            ])
          }
        }
      }

      ws.onclose = () => setTimeout(connect, 2000)
    }

    connect()
    return () => ws?.close()
  }, [sessionId])

  const handleCodeChange = useCallback((code: string, lang: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'code_change', content: code, language: lang }))
    }
  }, [])

  const handleRunCode = useCallback((code: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'run_code', content: code, language }))
    }
  }, [language])

  const handleAgentSpeaking = useCallback((speaking: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'agent_speaking', speaking }))
    }
  }, [])

  const handleEnd = useCallback(() => {
    setStatus('ended')
    sessionStorage.removeItem(`interview_${sessionId}`)
    router.push(`/report/${sessionId}`)
  }, [sessionId, router])

  const handleReconnect = useCallback(async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/api/interview/${sessionId}/reconnect`)
    if (!res.ok) throw new Error('Reconnect failed')
    const data = await res.json()
    if (sessionData) {
      const updated = { ...sessionData, signed_url: data.signed_url }
      setSessionData(updated)
      sessionStorage.setItem(`interview_${sessionId}`, JSON.stringify(updated))
    }
    return data.signed_url as string
  }, [sessionId, sessionData])

  // Memoize dynamic variables so object reference stays stable across re-renders.
  // Without this, every state update (terminalLines, isRunning, etc.) recreates
  // the object, which changes useCallback deps in VoicePanel and can destabilize
  // the ElevenLabs WebSocket session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableDynamicVars = useMemo(
    () => sessionData?.dynamic_variables ?? {},
    // JSON.stringify gives deep equality — reference only changes when values actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(sessionData?.dynamic_variables)]
  )

  if (!sessionData) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ fontSize: 13, color: 'var(--foreground-muted)', fontFamily: 'var(--font-sans)' }}>
          Chargement...
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
    >
      <Header sessionId={sessionId} status={status} onEnd={handleEnd} />

      <AnimatePresence>
        {showHints && <InterviewHintBanner onClose={() => setShowHints(false)} />}
      </AnimatePresence>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <VoicePanel
          signedUrl={sessionData.signed_url}
          dynamicVariables={stableDynamicVars}
          onContextInjectRef={injectContextRef}
          onAgentSpeakingChange={handleAgentSpeaking}
          onEnd={handleEnd}
          onReconnect={handleReconnect}
        />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <CodeEditor
            language={language}
            onLanguageChange={setLanguage}
            onCodeChange={handleCodeChange}
            onRunCode={handleRunCode}
            isRunning={isRunning}
          />
          <Terminal
            lines={terminalLines}
            exitCode={exitCode}
            isRunning={isRunning}
            onClear={() => { setTerminalLines([]); setExitCode(null) }}
          />
        </div>
      </div>
    </motion.div>
  )
}
