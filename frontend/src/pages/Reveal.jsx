import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import ParticleReveal from '../components/ParticleReveal'
import GPUParticles from '../components/GPUParticles'

// ── State machine ──────────────────────────────────────────────────────────────
// loading → waiting → sealed → cracking → blooming → revealed

export default function Reveal() {
  const { dateId } = useParams()
  const nav = useNavigate()
  const userId = localStorage.getItem('echo_user_id')

  const [stage, setStage] = useState('loading')
  const [reveal, setReveal] = useState(null)
  const [user, setUser] = useState(null)
  const [particles, setParticles] = useState(false)
  const pollRef = useRef(null)

  const isMutual = reveal?.outcome === 'mutual'

  useEffect(() => {
    if (!userId) { nav('/welcome'); return }
    checkReveal()
    return () => clearTimeout(pollRef.current)
  }, [dateId, userId])

  async function checkReveal() {
    try {
      const [revealData, userData] = await Promise.all([
        api.getReveal(dateId),
        api.getUser(userId),
      ])
      setReveal(revealData)
      setUser(userData)
      setStage('sealed')
    } catch (ex) {
      if (ex.status === 202) {
        setStage('waiting')
        pollRef.current = setTimeout(checkReveal, 4000)
      } else if (ex.status === 403) {
        nav('/')
      } else {
        setStage('waiting')
        pollRef.current = setTimeout(checkReveal, 6000)
      }
    }
  }

  async function openReveal() {
    setStage('cracking')
    await new Promise((r) => setTimeout(r, 900))
    setStage('blooming')
    await new Promise((r) => setTimeout(r, 600))
    setStage('revealed')
    setTimeout(() => setParticles(true), 350)
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
      overflow: 'hidden',
    }}>
      <GPUParticles />
      <AnimatePresence mode="wait">

        {/* Loading */}
        {stage === 'loading' && (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center' }}
          >
            <Spinner />
          </motion.div>
        )}

        {/* Waiting */}
        {stage === 'waiting' && (
          <motion.div key="waiting"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: 'center', maxWidth: '360px' }}
          >
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              style={{
                display: 'inline-flex',
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '28px',
                boxShadow: 'var(--shadow-md)',
                fontSize: '32px',
              }}
            >
              ⏳
            </motion.div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'Syne, sans-serif', marginBottom: '12px' }}>
              Waiting for them…
            </h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '15px', marginBottom: '32px' }}>
              The reveal stays sealed until both reflections are in. We'll check automatically.
            </p>
            <PulseDots />
            <button
              className="btn-secondary"
              onClick={() => nav(`/dashboard/${userId}`)}
              style={{ marginTop: '36px' }}
            >
              ← Back to Dashboard
            </button>
          </motion.div>
        )}

        {/* Sealed orb */}
        {stage === 'sealed' && (
          <motion.div key="sealed"
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: 'center', maxWidth: '420px' }}
          >
            {/* Sealed card with pulsing rings */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
              {/* Pulse rings */}
              {[1, 2, 3].map((i) => (
                <motion.div key={i}
                  animate={{ scale: [1, 1.5 + i * 0.12], opacity: [0.3, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.38, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: 110, height: 110,
                    borderRadius: '50%',
                    border: '1.5px solid var(--accent)',
                    pointerEvents: 'none',
                    opacity: 0.3,
                  }}
                />
              ))}
              {/* Core */}
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '2.5px solid var(--accent)',
                  boxShadow: 'var(--shadow-xl), 0 0 0 6px var(--accent-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                }}
              >
                ✦
              </motion.div>
            </div>

            <h2 style={{ fontSize: '30px', fontWeight: 800, fontFamily: 'Syne, sans-serif', marginBottom: '14px' }}>
              The reveal is ready.
            </h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', marginBottom: '40px', fontSize: '15px' }}>
              Both reflections are sealed inside. When you open it, you both see the truth at the same moment.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={openReveal}
              className="btn-primary"
              style={{ fontSize: '17px', padding: '18px 28px' }}
            >
              Open the Reveal ✦
            </motion.button>
          </motion.div>
        )}

        {/* Cracking / bloom */}
        {(stage === 'cracking' || stage === 'blooming') && (
          <motion.div key="bloom"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {stage === 'blooming' && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 20, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 120, height: 120,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  pointerEvents: 'none',
                  zIndex: 100,
                }}
              />
            )}
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.3, 0.8, 1] }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
              style={{ fontSize: '48px', color: 'var(--accent)' }}
            >
              ✦
            </motion.div>
          </motion.div>
        )}

        {/* Revealed */}
        {stage === 'revealed' && reveal && (
          <motion.div key="revealed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ width: '100%', maxWidth: '520px' }}
          >
            {isMutual
              ? <MutualReveal reveal={reveal} user={user} particles={particles} onBack={() => nav(`/dashboard/${userId}`)} />
              : <ClosedReveal reveal={reveal} user={user} onBack={() => nav(`/dashboard/${userId}`)} />
            }
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

// ── Mutual ────────────────────────────────────────────────────────────────────

function MutualReveal({ reveal, user, particles, onBack }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <motion.div
        initial={{ scale: 0.75, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '28px',
          padding: '52px 32px 40px',
          background: 'var(--surface)',
          border: '1px solid var(--amber-border)',
          borderTop: '4px solid var(--amber)',
          boxShadow: 'var(--shadow-xl)',
          marginBottom: '16px',
        }}
      >
        <ParticleReveal outcome="mutual" active={particles} />

        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.25, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontSize: '56px', marginBottom: '18px', position: 'relative', zIndex: 1 }}
        >
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            style={{ display: 'inline-block', color: 'var(--amber)' }}
          >
            ✦
          </motion.span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          style={{
            fontSize: '40px',
            fontWeight: 900,
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.04em',
            color: 'var(--amber)',
            marginBottom: '8px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          It's mutual.
        </motion.h1>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.52, duration: 0.55 }}
          style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '30px', position: 'relative', zIndex: 1 }}
        >
          You both felt something real.
        </motion.p>

        {/* Claude message */}
        <motion.div
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.68, duration: 0.6 }}
          style={{
            background: 'var(--amber-bg)',
            borderRadius: '16px',
            padding: '20px 24px',
            position: 'relative',
            zIndex: 1,
            border: '1px solid var(--amber-border)',
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: '15px', lineHeight: '1.75', color: 'var(--text)', fontStyle: 'italic' }}>
            "{reveal.outcome_message}"
          </p>
        </motion.div>
      </motion.div>

      {/* Next step */}
      {reveal.next_step_suggestion && (
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.55 }}
          style={{
            borderRadius: '20px',
            padding: '22px 24px',
            marginBottom: '14px',
            background: 'var(--surface)',
            border: '1px solid var(--amber-border)',
            borderLeft: '3px solid var(--amber)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'left',
          }}
        >
          <span className="label-caps" style={{ color: 'var(--amber)', marginBottom: '10px' }}>✦ Next move</span>
          <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: '1.6', fontWeight: 500 }}>
            {reveal.next_step_suggestion}
          </p>
        </motion.div>
      )}

      {/* What we learned */}
      {user?.preference_summary && (
        <WhatWeLearned summary={user.preference_summary} delay={1.25} accentColor="var(--amber)" />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{ marginTop: '8px' }}
      >
        <button
          onClick={onBack}
          className="btn-primary"
          style={{
            background: 'var(--amber)',
            boxShadow: `0 4px 0 var(--amber-dark), 0 8px 20px rgba(184,115,24,0.2)`,
          }}
        >
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  )
}

// ── Not mutual ────────────────────────────────────────────────────────────────

function ClosedReveal({ reveal, user, onBack }) {
  const isOneSided = reveal.outcome === 'one_sided'

  const cfg = isOneSided
    ? {
        label: 'A little asymmetric.',
        sub: "Not every spark is equal — and that's okay.",
        color: 'var(--accent)',
        bg: 'var(--accent-bg)',
        border: 'var(--accent-border)',
        topBorder: 'var(--accent)',
        emoji: '◈',
      }
    : {
        label: 'Not this time.',
        sub: 'Some stories are complete in a single chapter.',
        color: 'var(--slate)',
        bg: 'var(--slate-bg)',
        border: 'var(--slate-border)',
        topBorder: 'var(--slate)',
        emoji: '◇',
      }

  return (
    <div style={{ textAlign: 'center' }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '28px',
          padding: '48px 32px 36px',
          background: 'var(--surface)',
          border: `1px solid ${cfg.border}`,
          borderTop: `4px solid ${cfg.topBorder}`,
          boxShadow: 'var(--shadow-xl)',
          marginBottom: '14px',
        }}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          style={{ fontSize: '50px', marginBottom: '20px', position: 'relative', zIndex: 1, color: cfg.color }}
        >
          {cfg.emoji}
        </motion.div>

        <motion.h1
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          style={{
            fontSize: '34px',
            fontWeight: 800,
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.03em',
            color: cfg.color,
            marginBottom: '10px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {cfg.label}
        </motion.h1>

        <motion.p
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.48, duration: 0.55 }}
          style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '28px', position: 'relative', zIndex: 1 }}
        >
          {cfg.sub}
        </motion.p>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.62, duration: 0.6 }}
          style={{
            background: cfg.bg,
            borderRadius: '14px',
            padding: '18px 22px',
            position: 'relative',
            zIndex: 1,
            border: `1px solid ${cfg.border}`,
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: '15px', lineHeight: '1.75', color: 'var(--text)', fontStyle: 'italic' }}>
            "{reveal.outcome_message}"
          </p>
        </motion.div>
      </motion.div>

      {user?.preference_summary && (
        <WhatWeLearned summary={user.preference_summary} delay={0.9} accentColor={cfg.color} />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{ marginTop: '8px' }}
      >
        <button onClick={onBack} className="btn-secondary">
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function WhatWeLearned({ summary, delay, accentColor }) {
  return (
    <motion.div
      initial={{ y: 16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.55 }}
      style={{
        borderRadius: '20px',
        padding: '20px 24px',
        marginBottom: '14px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'left',
      }}
    >
      <span className="label-caps" style={{ color: accentColor, marginBottom: '10px' }}>
        What we learned about you
      </span>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
        {summary}
      </p>
    </motion.div>
  )
}

function Spinner() {
  return (
    <motion.div
      animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.4, 1, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}
    />
  )
}

function PulseDots() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '7px' }}>
      {[0, 1, 2].map((i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.5, 1], opacity: [0.35, 1, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.3, delay: i * 0.22 }}
          style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent)' }}
        />
      ))}
    </div>
  )
}
