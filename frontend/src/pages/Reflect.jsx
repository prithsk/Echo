import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import GPUParticles from '../components/GPUParticles'

const STARS = [1, 2, 3, 4, 5]
const STAR_LABELS = ['', 'Rough', 'Okay', 'Good', 'Great', 'Amazing']

export default function Reflect() {
  const { dateId } = useParams()
  const nav = useNavigate()
  const userId = localStorage.getItem('echo_user_id')

  const [step, setStep] = useState('loading')
  const [aiPrompt, setAiPrompt] = useState('')

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [wouldSeeAgain, setWouldSeeAgain] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!userId) { nav('/welcome'); return }
    Promise.all([
      api.getDate(dateId),
      api.getReflectionPrompt(dateId),
    ])
      .then(([, { prompt }]) => {
        setAiPrompt(prompt)
        setStep('prompt')
      })
      .catch((err) => {
        if (err.status === 403 || err.status === 404) {
          nav('/')
          return
        }
        setAiPrompt('How did the date make you feel overall?')
        setStep('prompt')
      })
  }, [dateId, userId])

  async function submit() {
    if (!rating || !wouldSeeAgain) return
    setStep('submitting')
    setErr('')
    try {
      await api.submitFeedback({
        date_id: dateId,
        user_id: userId,
        rating,
        notes: notes || undefined,
        would_see_again: wouldSeeAgain,
      })
      setStep('done')
    } catch (ex) {
      setErr(ex.message || 'Something went wrong.')
      setStep('form')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      zIndex: 1,
    }}>
      <GPUParticles />
      <AnimatePresence mode="wait">

        {/* Loading */}
        {step === 'loading' && (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            <div style={{ position: 'relative', width: '48px', height: '48px' }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 2.8], opacity: [0.35, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.6, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '1.5px solid var(--accent)',
                  }}
                />
              ))}
              <motion.div
                animate={{ scale: [0.88, 1.06, 0.88] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                }}
              />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'Karla, sans-serif' }}>
              Crafting your reflection prompt…
            </p>
          </motion.div>
        )}

        {/* Prompt step */}
        {step === 'prompt' && (
          <motion.div key="prompt"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}
          >
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              color: 'var(--text-faint)',
              marginBottom: '28px',
            }}>
              Step 1 of 2 — Reflection Prompt
            </div>

            <div className="card" style={{
              padding: '40px 36px',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-xl)',
              textAlign: 'left',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative quote backdrop */}
              <div style={{
                position: 'absolute',
                top: '-8px',
                right: '20px',
                fontSize: '120px',
                lineHeight: 1,
                color: 'var(--accent)',
                opacity: 0.06,
                fontFamily: 'Georgia, serif',
                fontWeight: 900,
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                "
              </div>
              {/* Accent line */}
              <div style={{
                width: '32px',
                height: '3px',
                background: 'var(--accent)',
                borderRadius: '2px',
                marginBottom: '20px',
              }} />
              <p style={{
                fontSize: '20px',
                lineHeight: '1.6',
                fontWeight: 500,
                color: 'var(--text)',
                fontFamily: 'Karla, sans-serif',
              }}>
                {aiPrompt}
              </p>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px', lineHeight: '1.65' }}>
              Take a moment. Your reflection stays private until both of you submit.
            </p>
            <button className="btn-primary" onClick={() => setStep('form')}>
              I'm ready to reflect →
            </button>
            <button className="btn-secondary" onClick={() => nav(-1)} style={{ marginTop: '10px' }}>
              Not yet
            </button>
          </motion.div>
        )}

        {/* Form step */}
        {step === 'form' && (
          <motion.div key="form"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', maxWidth: '480px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <button onClick={() => setStep('prompt')} className="btn-ghost" style={{ padding: '6px 0' }}>
                ← Back
              </button>
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'Syne, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                color: 'var(--text-faint)',
              }}>
                Step 2 of 2 — Your Reflection
              </span>
            </div>

            <div className="card" style={{ padding: '28px', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', gap: '28px' }}>

              {/* Prompt reminder */}
              <div style={{
                borderLeft: '2px solid var(--accent)',
                paddingLeft: '16px',
              }}>
                <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'Syne, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', opacity: 0.7, display: 'block', marginBottom: '5px' }}>Prompt</span>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.6' }}>
                  {aiPrompt}
                </p>
              </div>

              {/* Star rating */}
              <div>
                <span className="label-caps">Overall rating</span>
                <StarRating
                  rating={rating}
                  hoverRating={hoverRating}
                  onRate={setRating}
                  onHover={setHoverRating}
                />
              </div>

              {/* Notes */}
              <div>
                <span className="label-caps">
                  Your reflection{' '}
                  <span style={{ textTransform: 'none', fontWeight: 400, fontFamily: 'Karla, sans-serif', opacity: 0.65 }}>
                    — optional
                  </span>
                </span>
                <textarea
                  className="input-field"
                  placeholder={aiPrompt}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Would see again */}
              <div>
                <span className="label-caps">Would you see them again?</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                  {[
                    { val: 'yes', label: 'Yes', icon: '✓', accent: 'var(--accent)', accentBg: 'var(--accent-bg)', accentBorder: 'var(--accent-border)', shadow: 'var(--accent-dark)' },
                    { val: 'maybe', label: 'Maybe', icon: '~', accent: 'var(--amber)', accentBg: 'var(--amber-bg)', accentBorder: 'var(--amber-border)', shadow: 'var(--amber-dark)' },
                    { val: 'no', label: 'No', icon: '×', accent: 'var(--slate)', accentBg: 'var(--slate-bg)', accentBorder: 'var(--slate-border)', shadow: '#2A2724' },
                  ].map(({ val, label, icon, accent, accentBg, accentBorder, shadow }) => {
                    const selected = wouldSeeAgain === val
                    return (
                      <motion.button
                        key={val}
                        whileTap={{ scale: 0.93, y: 2 }}
                        onClick={() => setWouldSeeAgain(val)}
                        style={{
                          padding: '16px 8px',
                          borderRadius: '12px',
                          border: `1.5px solid ${selected ? accentBorder : 'var(--border)'}`,
                          background: selected ? accentBg : 'var(--surface)',
                          color: selected ? accent : 'var(--text-muted)',
                          fontWeight: 700,
                          fontFamily: 'Syne, sans-serif',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: selected ? `0 4px 0 ${accentBorder}` : 'var(--shadow-xs)',
                          transform: selected ? 'none' : undefined,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
                        <span style={{ fontSize: '13px' }}>{label}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {err && <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 500 }}>{err}</p>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="btn-primary"
                onClick={submit}
                disabled={!rating || !wouldSeeAgain}
                style={{ opacity: (!rating || !wouldSeeAgain) ? 0.42 : 1 }}
              >
                Submit Reflection →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <motion.div key="submitting"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          >
            <div style={{ position: 'relative', width: '48px', height: '48px' }}>
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 2.6], opacity: [0.3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.7, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '1.5px solid var(--accent)',
                  }}
                />
              ))}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  inset: '6px',
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: 'var(--accent)',
                }}
              />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'Karla, sans-serif' }}>
              Sealing your reflection…
            </p>
          </motion.div>
        )}

        {/* Done */}
        {step === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}
          >
            {/* Expanding rings burst */}
            <div style={{ position: 'relative', width: '96px', height: '96px', margin: '0 auto 32px' }}>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.5, opacity: 0.6 }}
                  animate={{ scale: 2.5 + i * 0.7, opacity: 0 }}
                  transition={{ duration: 1.2, delay: i * 0.18, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: '2px solid var(--accent)',
                  }}
                />
              ))}
              {/* Floating center */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'var(--accent-bg)',
                  border: '1.5px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 0 var(--accent-border), var(--shadow-md)',
                }}
              >
                <span style={{ fontSize: '36px', lineHeight: 1 }}>✦</span>
              </motion.div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'Syne, sans-serif', marginBottom: '12px' }}
            >
              Reflection submitted.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              style={{
                color: 'var(--text-muted)',
                lineHeight: '1.7',
                marginBottom: '36px',
                fontSize: '15px',
                maxWidth: '320px',
                margin: '0 auto 36px',
              }}
            >
              Your reflection is sealed. Once your date submits theirs, the reveal unlocks — you'll both see the truth at the same time.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              <button
                className="btn-primary"
                onClick={() => nav(`/date/${dateId}/reveal`)}
              >
                Go to Reveal →
              </button>
              <button
                className="btn-secondary"
                onClick={() => nav(`/dashboard/${userId}`)}
              >
                Back to Dashboard
              </button>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

function StarRating({ rating, hoverRating, onRate, onHover }) {
  const active = hoverRating || rating
  const label = STAR_LABELS[active] || ''

  return (
    <div style={{ marginTop: '4px' }}>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', paddingTop: '4px' }}>
        {STARS.map((s) => {
          const lit = s <= active
          return (
            <motion.button
              key={s}
              whileTap={{ scale: 0.75 }}
              onMouseEnter={() => onHover(s)}
              onMouseLeave={() => onHover(0)}
              onClick={() => onRate(s)}
              animate={rating === s ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                width: '48px',
                height: '48px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                background: lit ? 'var(--amber-bg)' : 'transparent',
                transition: 'background 0.12s',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill={lit ? 'var(--amber)' : 'none'}
                stroke={lit ? 'var(--amber)' : 'var(--border-strong)'}
                strokeWidth="1.6"
                style={{
                  filter: lit ? 'drop-shadow(0 2px 4px rgba(184,115,24,0.3))' : 'none',
                  transition: 'filter 0.15s',
                }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </motion.button>
          )
        })}
      </div>
      <div style={{
        textAlign: 'center',
        height: '20px',
        marginTop: '6px',
      }}>
        <AnimatePresence mode="wait">
          {label && (
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'Syne, sans-serif',
                color: 'var(--amber)',
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
