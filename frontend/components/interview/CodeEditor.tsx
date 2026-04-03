'use client'
import { useCallback, useRef } from 'react'
import MonacoEditor, { type OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { Play, Loader2 } from 'lucide-react'

const LANGUAGES = [
  { value: 'python',     label: 'Python',     dot: 'hsl(207,72%,55%)' },
  { value: 'javascript', label: 'JavaScript',  dot: 'hsl(50,92%,55%)' },
  { value: 'typescript', label: 'TypeScript',  dot: 'hsl(217,70%,60%)' },
  { value: 'java',       label: 'Java',        dot: 'hsl(25,80%,55%)' },
  { value: 'go',         label: 'Go',          dot: 'hsl(192,80%,50%)' },
]

interface CodeEditorProps {
  language: string
  onLanguageChange: (lang: string) => void
  onCodeChange: (code: string, language: string) => void
  onRunCode: (code: string) => void
  isRunning: boolean
}

const DEBOUNCE_MS = 300

export function CodeEditor({
  language,
  onLanguageChange,
  onCodeChange,
  onRunCode,
  isRunning,
}: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSentRef = useRef('')

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    monaco.editor.defineTheme('interviewai-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background':                '#0C0D12',
        'editor.foreground':                '#E2E4EC',
        'editor.lineHighlightBackground':   '#13151E',
        'editor.selectionBackground':       '#2B408099',
        'editorLineNumber.foreground':      '#3A3E52',
        'editorLineNumber.activeForeground':'#6B7099',
        'editorCursor.foreground':          '#3B82F6',
        'editorWidget.background':          '#0F1117',
        'editorWidget.border':              '#1E2130',
        'scrollbarSlider.background':       '#1E213080',
        'scrollbarSlider.hoverBackground':  '#2A2F4580',
        'editorIndentGuide.background':     '#1E2130',
        'editorIndentGuide.activeBackground':'#2A2F45',
      },
    })
    monaco.editor.setTheme('interviewai-dark')

    editor.focus()
  }, [])

  const handleChange = useCallback((value: string | undefined) => {
    if (value === undefined) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (value !== lastSentRef.current) {
        lastSentRef.current = value
        onCodeChange(value, language)
      }
    }, DEBOUNCE_MS)
  }, [language, onCodeChange])

  const handleRun = useCallback(() => {
    if (isRunning) return
    const code = editorRef.current?.getValue() ?? ''
    onRunCode(code)
  }, [isRunning, onRunCode])

  const currentLang = LANGUAGES.find(l => l.value === language) ?? LANGUAGES[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          height: 36,
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          flexShrink: 0,
        }}
      >
        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: currentLang.dot,
              flexShrink: 0,
            }}
          />
          <select
            value={language}
            onChange={e => onLanguageChange(e.target.value)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '0 6px',
              height: 24,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--foreground-muted)',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              paddingRight: 20,
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Right: shortcut + run */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--foreground-subtle)',
              background: 'var(--muted)',
              padding: '2px 5px',
              borderRadius: 3,
              userSelect: 'none',
            }}
          >
            ⌘↵
          </span>
          <button
            onClick={handleRun}
            disabled={isRunning}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 26, padding: '0 10px',
              background: 'var(--muted)',
              border: '1px solid var(--border-strong)',
              borderRadius: 6,
              fontFamily: 'var(--font-sans)',
              fontSize: 12, fontWeight: 500,
              color: isRunning ? 'var(--foreground-subtle)' : 'var(--foreground-muted)',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'background 150ms, border-color 150ms, color 150ms',
            }}
            onMouseEnter={e => {
              if (!isRunning) {
                e.currentTarget.style.background = 'hsla(158,64%,40%,0.12)'
                e.currentTarget.style.borderColor = 'hsla(158,64%,40%,0.4)'
                e.currentTarget.style.color = 'var(--success)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--muted)'
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.color = 'var(--foreground-muted)'
            }}
          >
            {isRunning
              ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
              : <Play size={10} />
            }
            Exécuter
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MonacoEditor
          height="100%"
          language={language}
          defaultValue={getDefaultCode(language)}
          theme="interviewai-dark"
          onMount={handleMount}
          onChange={handleChange}
          options={{
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: 13,
            lineHeight: 20,
            fontLigatures: true,
            minimap: { enabled: false },
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            roundedSelection: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  )
}

function getDefaultCode(language: string): string {
  const defaults: Record<string, string> = {
    python: `# Écrivez votre solution ici\n\ndef solution():\n    pass\n`,
    javascript: `// Écrivez votre solution ici\n\nfunction solution() {\n  \n}\n`,
    typescript: `// Écrivez votre solution ici\n\nfunction solution(): void {\n  \n}\n`,
    java: `// Écrivez votre solution ici\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`,
    go: `// Écrivez votre solution ici\n\npackage main\n\nfunc main() {\n    \n}\n`,
  }
  return defaults[language] ?? '// Écrivez votre solution ici\n'
}
