'use client'
import { useRef, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

interface TerminalLine {
  type: 'stdout' | 'stderr' | 'info' | 'prompt'
  content: string
}

interface TerminalProps {
  lines: TerminalLine[]
  exitCode: number | null
  isRunning: boolean
  onClear: () => void
}

const EXPANDED_HEIGHT = 180
const COLLAPSED_HEIGHT = 32

const lineColors: Record<TerminalLine['type'], string> = {
  stdout:  'hsl(220, 14%, 80%)',
  stderr:  'hsl(0, 72%, 65%)',
  info:    'hsl(217, 91%, 65%)',
  prompt:  'hsl(220, 9%, 38%)',
}

export function Terminal({ lines, exitCode, isRunning, onClear }: TerminalProps) {
  const [expanded, setExpanded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-expand when execution starts
  useEffect(() => {
    if (isRunning) setExpanded(true)
  }, [isRunning])

  // Auto-expand when new output arrives
  useEffect(() => {
    if (lines.length > 0) {
      setExpanded(true)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines])

  const height = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT

  return (
    <div
      style={{
        height,
        flexShrink: 0,
        background: 'var(--terminal-background)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 200ms ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          height: COLLAPSED_HEIGHT,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        <button
          onClick={() => setExpanded(prev => !prev)}
          style={{
            display: 'flex', alignItems: 'center',
            background: 'none', border: 'none',
            color: 'var(--foreground-subtle)', cursor: 'pointer',
            padding: 0,
          }}
          aria-label={expanded ? 'Réduire' : 'Agrandir'}
        >
          {expanded
            ? <ChevronDown size={14} />
            : <ChevronUp size={14} />
          }
        </button>

        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12, fontWeight: 500,
            color: 'var(--foreground-muted)',
          }}
        >
          Sortie
        </span>

        {/* Exit code badge */}
        {exitCode !== null && !isRunning && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: exitCode === 0 ? 'hsla(158,64%,40%,0.12)' : 'hsla(0,72%,51%,0.12)',
              color: exitCode === 0 ? 'var(--success)' : 'var(--destructive)',
            }}
          >
            exit {exitCode}
          </span>
        )}

        {isRunning && (
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--foreground-subtle)',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--muted)',
            }}
          >
            En cours...
          </span>
        )}

        {/* Clear button — right side */}
        {lines.length > 0 && (
          <button
            onClick={onClear}
            title="Effacer"
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center',
              background: 'none', border: 'none',
              color: 'var(--foreground-subtle)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground-muted)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--foreground-subtle)')}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Output */}
      {expanded && (
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {lines.length === 0 && !isRunning && (
            <div style={{ color: 'var(--foreground-subtle)', fontSize: 12 }}>
              Cliquez sur Exécuter pour lancer votre code
            </div>
          )}
          {lines.map((line, i) => (
            <div key={i} style={{ color: lineColors[line.type], whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {line.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
