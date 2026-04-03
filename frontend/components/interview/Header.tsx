'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  sessionId: string
  status: 'active' | 'ended' | 'pending'
  onEnd: () => void
}

function useElapsedTime(active: boolean) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [active])

  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function Header({ sessionId, status, onEnd }: HeaderProps) {
  const elapsed = useElapsedTime(status === 'active')
  const shortId = sessionId.slice(0, 8)
  const router = useRouter()
  const [confirmExit, setConfirmExit] = useState(false)

  return (
    <header
      style={{
        height: 40,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--background)',
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>
          InterviewAI
        </span>
        <div style={{ width: 1, height: 16, background: 'var(--border-strong)' }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--foreground-subtle)' }}>
          Session
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--foreground-muted)',
            background: 'var(--muted)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {shortId}
        </span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--foreground-muted)' }}>
          {elapsed}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: status === 'active' ? 'var(--success)' : 'var(--foreground-subtle)',
              animation: status === 'active' ? 'status-dot 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
              color: status === 'active' ? 'var(--success)' : 'var(--foreground-subtle)',
              background: status === 'active' ? 'hsla(158,64%,40%,0.12)' : 'transparent',
              padding: status === 'active' ? '2px 7px' : '0',
              borderRadius: 4,
            }}
          >
            {status === 'active' ? 'En cours' : status === 'ended' ? 'Terminé' : 'En attente'}
          </span>
        </div>

        {/* Exit */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => status === 'active' ? setConfirmExit(v => !v) : router.push('/')}
            title="Quitter"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28,
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, cursor: 'pointer',
              color: 'var(--foreground-subtle)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--destructive)', e.currentTarget.style.color = 'var(--destructive)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)', e.currentTarget.style.color = 'var(--foreground-subtle)')}
          >
            <LogOut size={12} />
          </button>

          {confirmExit && (
            <div style={{
              position: 'absolute', top: 34, right: 0, zIndex: 50,
              background: 'var(--card)', border: '1px solid var(--border-strong)',
              borderRadius: 8, padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 8,
              minWidth: 200, boxShadow: '0 4px 20px hsla(0,0%,0%,0.4)',
            }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--foreground)', margin: 0 }}>
                Terminer et voir le rapport ?
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setConfirmExit(false); onEnd() }}
                  style={{
                    flex: 1, height: 28, background: 'var(--destructive)', border: 'none',
                    borderRadius: 5, cursor: 'pointer', fontSize: 12,
                    fontFamily: 'var(--font-sans)', fontWeight: 500,
                    color: '#fff',
                  }}
                >
                  Terminer
                </button>
                <button
                  onClick={() => setConfirmExit(false)}
                  style={{
                    flex: 1, height: 28, background: 'var(--muted)',
                    border: '1px solid var(--border)', borderRadius: 5,
                    cursor: 'pointer', fontSize: 12,
                    fontFamily: 'var(--font-sans)', color: 'var(--foreground-muted)',
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
