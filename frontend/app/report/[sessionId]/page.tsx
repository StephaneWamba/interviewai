'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, AlertCircle, Code2 } from 'lucide-react'

interface Report {
  technical_score: number
  communication_score: number
  code_quality_score: number
  strengths: string[]
  weaknesses: string[]
  detailed_feedback: string
  voice_summary: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/report/${sessionId}`)
      .then(r => r.json())
      .then(d => { setReport(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId])

  const overallScore = report
    ? ((report.technical_score + report.communication_score + report.code_quality_score) / 3).toFixed(1)
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '40px 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ maxWidth: 680, margin: '0 auto' }}
      >
        {/* Back */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: 'var(--foreground-muted)', cursor: 'pointer',
            marginBottom: 24, padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--foreground-muted)')}
        >
          <ArrowLeft size={14} />
          Nouvel entretien
        </button>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 24, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
            Rapport d&apos;entretien
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--foreground-subtle)', margin: '6px 0 0' }}>
            {sessionId.slice(0, 8)}
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--foreground-muted)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
            Génération du rapport...
          </div>
        )}

        {!loading && !report && (
          <div style={{ textAlign: 'center', color: 'var(--foreground-muted)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>
            Rapport non disponible. L&apos;entretien n&apos;a peut-être pas inclus d&apos;évaluation de code.
          </div>
        )}

        {report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Score card */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 40, fontWeight: 600, color: 'var(--foreground)' }}>
                  {overallScore}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--foreground-muted)' }}>/10</span>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                <ScorePill label="Technique" value={report.technical_score} />
                <ScorePill label="Communication" value={report.communication_score} />
                <ScorePill label="Qualité code" value={report.code_quality_score} />
              </div>
            </div>

            {/* Voice summary */}
            {report.voice_summary && (
              <div style={{ ...cardStyle, borderLeft: '2px solid var(--primary)', background: 'var(--muted)' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                  &ldquo;{report.voice_summary}&rdquo;
                </p>
              </div>
            )}

            {/* Strengths / Weaknesses */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <TrendingUp size={14} color="var(--success)" />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--success)' }}>Points forts</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(report.strengths ?? []).map((s, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--foreground-muted)', lineHeight: 1.5 }}>
                      • {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <AlertCircle size={14} color="var(--warning)" />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--warning)' }}>À travailler</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(report.weaknesses ?? []).map((w, i) => (
                    <li key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--foreground-muted)', lineHeight: 1.5 }}>
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Detailed feedback */}
            {report.detailed_feedback && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Code2 size={14} color="var(--foreground-muted)" />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--foreground-muted)' }}>Feedback détaillé</span>
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--foreground)', lineHeight: 1.7, margin: 0 }}>
                  {report.detailed_feedback}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 20,
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--foreground-subtle)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500, color: 'var(--foreground)' }}>
        {value?.toFixed(1)}
      </span>
    </div>
  )
}
