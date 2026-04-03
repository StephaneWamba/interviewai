'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, Upload, FileText, X, Info, ChevronRight, Mic, Code, Play } from 'lucide-react'

const JOB_ROLES = [
  'Frontend Engineer',
  'Backend Engineer',
  'Fullstack Engineer',
  'Data Engineer',
  'ML Engineer / IA',
  'DevOps Engineer',
  'Mobile Engineer',
  'Software Engineer',
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── Onboarding ──────────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    icon: <FileText size={20} color="var(--primary)" />,
    title: 'Bienvenue sur InterviewAI',
    body: 'Simulez un entretien technique avec un recruteur IA vocal. Sophie vous posera des questions, verra votre code en temps réel, et vous donnera un feedback détaillé.',
  },
  {
    icon: <Upload size={20} color="var(--primary)" />,
    title: 'Importez votre CV (optionnel)',
    body: 'Glissez un fichier PDF ou collez votre profil. Sophie adaptera l\'entretien à votre parcours — poste précédents, compétences, projets.',
  },
  {
    icon: <Mic size={20} color="var(--primary)" />,
    title: 'Parlez à voix haute',
    body: 'L\'entretien est vocal. Sophie vous pose des questions comme un vrai recruteur senior. Répondez naturellement, elle comprend le contexte.',
  },
  {
    icon: <Code size={20} color="var(--primary)" />,
    title: 'Codez en direct',
    body: 'Un éditeur Monaco (VS Code) est disponible pendant l\'entretien. Sophie voit vos modifications en temps réel et peut commenter votre code.',
  },
  {
    icon: <Play size={20} color="var(--primary)" />,
    title: 'Exécutez et itérez',
    body: 'Exécutez votre code directement dans le navigateur. Sophie voit les résultats et peut vous aider à déboguer ou optimiser votre solution.',
  },
]

function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const isLast = step === ONBOARDING_STEPS.length - 1
  const s = ONBOARDING_STEPS[step]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'hsla(0,0%,0%,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        style={{
          width: '100%', maxWidth: 380,
          background: 'var(--card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 10,
          padding: 24,
          display: 'flex', flexDirection: 'column', gap: 20,
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-subtle)', padding: 4 }}
        >
          <X size={14} />
        </button>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? 'var(--primary)' : 'var(--border-strong)', transition: 'all 200ms ease' }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {s.icon}
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>{s.title}</span>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--foreground-muted)', lineHeight: 1.65, margin: 0 }}>{s.body}</p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--foreground-subtle)', padding: 0 }}
          >
            Passer
          </button>
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--primary)', border: 'none', borderRadius: 6,
              padding: '7px 14px',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              color: 'var(--primary-foreground)', cursor: 'pointer',
            }}
          >
            {isLast ? 'Commencer' : 'Suivant'}
            {!isLast && <ChevronRight size={13} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', role: JOB_ROLES[0], resume: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfName, setPdfName] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Show onboarding on first visit
  useEffect(() => {
    const seen = localStorage.getItem('interviewai_onboarded')
    if (!seen) setShowOnboarding(true)
  }, [])

  const closeOnboarding = useCallback(() => {
    localStorage.setItem('interviewai_onboarded', '1')
    setShowOnboarding(false)
  }, [])

  const handlePdfFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Seuls les fichiers PDF sont supportés.')
      return
    }
    setPdfLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API_BASE}/api/parse-cv`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { markdown } = await res.json()
      setForm(f => ({ ...f, resume: markdown }))
      setPdfName(file.name)
    } catch {
      setError('Impossible de lire le PDF. Collez votre CV manuellement.')
    } finally {
      setPdfLoading(false)
    }
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handlePdfFile(file)
    e.target.value = ''
  }, [handlePdfFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handlePdfFile(file)
  }, [handlePdfFile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Votre prénom est requis.'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/api/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: form.name,
          job_role: form.role,
          resume_summary: form.resume,
        }),
      })

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      sessionStorage.setItem(`interview_${data.session_id}`, JSON.stringify({
        signed_url: data.signed_url,
        dynamic_variables: data.dynamic_variables,
      }))

      router.push(`/interview/${data.session_id}`)
    } catch {
      setError('Erreur lors du démarrage. Vérifiez que le backend est accessible.')
      setLoading(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {showOnboarding && <OnboardingModal onClose={closeOnboarding} />}
      </AnimatePresence>

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
          position: 'relative',
          overflow: 'hidden',
          padding: 16,
        }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            width: 600, height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsla(217,91%,60%,0.06) 0%, transparent 70%)',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            width: '100%', maxWidth: 420,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
                InterviewAI
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--foreground-muted)', margin: '5px 0 0' }}>
                Entretien technique avec Sophie, votre recruteur IA
              </p>
            </div>
            {/* Help / re-open onboarding */}
            <button
              onClick={() => setShowOnboarding(true)}
              title="Comment ça marche ?"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-subtle)', padding: 4, marginTop: -2 }}
            >
              <Info size={16} />
            </button>
          </div>

          {/* Progress steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 2px' }}>
            {['Profil', 'Entretien', 'Rapport'].map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: i === 0 ? 'var(--primary)' : 'var(--muted)',
                    border: `1px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 500,
                    color: i === 0 ? 'var(--primary-foreground)' : 'var(--foreground-subtle)',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: i === 0 ? 'var(--foreground)' : 'var(--foreground-subtle)', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{ flex: 1, height: 1, background: 'var(--border)', margin: '0 6px', marginBottom: 14 }} />
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Votre prénom">
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Stéphane"
                autoFocus
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsla(217,91%,60%,0.12)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </FormField>

            <FormField label="Poste visé">
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>

            {/* CV field with PDF upload */}
            <FormField label="CV (optionnel)">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />

              {/* Drop zone / upload trigger */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `1px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '8px 12px',
                  background: dragOver ? 'hsla(217,91%,60%,0.06)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'border-color 150ms, background 150ms',
                  marginBottom: 6,
                }}
                onClick={() => fileRef.current?.click()}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {pdfLoading ? (
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                  ) : pdfName ? (
                    <FileText size={13} color="var(--success)" />
                  ) : (
                    <Upload size={13} color="var(--foreground-subtle)" />
                  )}
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: pdfName ? 'var(--success)' : 'var(--foreground-subtle)' }}>
                    {pdfLoading ? 'Extraction en cours...' : pdfName ? pdfName : 'Glissez un PDF ou cliquez pour importer'}
                  </span>
                </div>
                {pdfName && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPdfName(''); setForm(f => ({ ...f, resume: '' })) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground-subtle)', padding: 0, lineHeight: 1 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <textarea
                value={form.resume}
                onChange={e => { setForm(f => ({ ...f, resume: e.target.value })); if (pdfName) setPdfName('') }}
                placeholder="Ou collez votre résumé / profil ici..."
                rows={3}
                style={{
                  ...inputStyle,
                  height: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  lineHeight: 1.6,
                  resize: 'vertical',
                  paddingTop: 9,
                  paddingBottom: 9,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px hsla(217,91%,60%,0.12)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </FormField>

            {error && (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--destructive)', background: 'hsla(0,72%,51%,0.08)', padding: '8px 10px', borderRadius: 6 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 40, marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? 'var(--muted)' : 'var(--primary)',
                border: 'none', borderRadius: 6,
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                color: loading ? 'var(--foreground-muted)' : 'var(--primary-foreground)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'filter 150ms ease',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)' }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
            >
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={15} />}
              {loading ? 'Démarrage...' : "Démarrer l'entretien"}
            </button>
          </form>

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--foreground-subtle)', textAlign: 'center', margin: 0 }}>
            Entretien simulé — aucune donnée transmise à des tiers
          </p>
        </motion.div>
      </div>
    </>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--foreground-muted)', display: 'block' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36,
  padding: '0 12px',
  background: 'var(--muted)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  color: 'var(--foreground)',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
  boxSizing: 'border-box',
}
