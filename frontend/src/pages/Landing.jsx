import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Heart3D from '../components/Heart3D'
import ConnectionOrb from '../components/ConnectionOrb'

function useTilt(strength = 4) {
  const ref = useRef(null)
  function onMouseMove(e) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    el.style.transform = `perspective(900px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg) translateZ(10px)`
    el.style.transition = 'none'
  }
  function onMouseLeave() {
    const el = ref.current
    if (!el) return
    el.style.transform = ''
    el.style.transition = 'transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)'
  }
  return { ref, onMouseMove, onMouseLeave }
}

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 780)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 780)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

const FEATURES = [
  {
    number: '01',
    icon: '◈',
    title: 'Reflect privately',
    body: 'Write your honest thoughts right after the date. Your reflection is cryptographically sealed — your match can\'t see a word until they submit theirs.',
    color: 'var(--accent)',
    bg: 'var(--accent-bg)',
    border: 'var(--accent-border)',
  },
  {
    number: '02',
    icon: '✦',
    title: 'Reveal together',
    body: 'The moment both reflections are in, the reveal unlocks simultaneously. You both see the truth at the exact same time. No awkward texts required.',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    border: 'var(--amber-border)',
  },
  {
    number: '03',
    icon: '◇',
    title: 'Learn your patterns',
    body: 'After each date, an AI builds your preference profile from your reflections — helping you understand what you actually want, not just what you think you want.',
    color: 'var(--slate)',
    bg: 'var(--slate-bg)',
    border: 'var(--slate-border)',
  },
]

export default function Landing() {
  const nav     = useNavigate()
  const mobile  = useIsMobile()
  const [splash, setSplash]       = useState(() => !sessionStorage.getItem('echo_seen'))
  const [orbCharge, setOrbCharge] = useState(0)   // 0–3
  const [exploded, setExploded]   = useState(false)
  const [showReveal, setShowReveal] = useState(false)
  const [orbKey, setOrbKey]       = useState(0)   // increment to reset orb

  function handleExplode() {
    setExploded(true)
    setTimeout(() => setShowReveal(true), 650)
  }
  function handleReset() {
    setShowReveal(false)
    setExploded(false)
    setOrbCharge(0)
    setOrbKey(k => k + 1)
  }

  useEffect(() => {
    if (!splash) return
    const t = setTimeout(() => {
      setSplash(false)
      sessionStorage.setItem('echo_seen', '1')
    }, 2600)
    return () => clearTimeout(t)
  }, [splash])

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      {/* ── Splash overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {splash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
            onClick={() => { setSplash(false); sessionStorage.setItem('echo_seen', '1') }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'var(--bg)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {/* Pulsing ring behind heart */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[1, 2, 3].map((i) => (
                <motion.div key={i}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [0.6, 1.8 + i * 0.15], opacity: [0.4, 0] }}
                  transition={{ delay: 0.6 + i * 0.18, duration: 1.4, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }}
                  style={{
                    position: 'absolute',
                    width: 260, height: 260,
                    borderRadius: '50%',
                    border: '1.5px solid var(--accent)',
                    pointerEvents: 'none',
                  }}
                />
              ))}
              <Heart3D size={mobile ? 320 : 480} />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.55 }}
              style={{
                marginTop: '8px',
                fontSize: '13px',
                color: 'var(--text-faint)',
                fontFamily: 'Karla, sans-serif',
                letterSpacing: '0.04em',
              }}
            >
              tap anywhere to continue
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav style={{
        padding: '0 clamp(24px, 5vw, 56px)',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'rgba(248,247,243,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 10,
      }}>
        <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.04em' }}>
          Echo<span style={{ color: 'var(--accent)' }}>.</span>
        </span>
        <button
          onClick={() => nav('/welcome')}
          style={{
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: 'var(--shadow-xs)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          Sign In →
        </button>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: '1160px',
        margin: '0 auto',
        padding: `clamp(60px, 8vw, 100px) clamp(24px, 5vw, 56px)`,
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '1fr 460px',
        gap: mobile ? '48px' : '72px',
        alignItems: 'flex-start',
        minHeight: 'calc(100vh - 64px)',
      }}>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Label pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent)',
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              borderRadius: '20px',
              padding: '5px 14px',
              marginBottom: '36px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            Honest dating, finally.
          </motion.div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(52px, 6.5vw, 88px)',
            fontWeight: 800,
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.045em',
            lineHeight: 1.0,
            marginBottom: '28px',
            color: 'var(--text)',
          }}>
            After every<br />
            date,{' '}
            <span style={{
              display: 'inline-block',
              position: 'relative',
            }}>
              the truth.
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'var(--accent)',
                  borderRadius: '2px',
                  transformOrigin: 'left',
                }}
              />
            </span>
          </h1>

          {/* Body */}
          <p style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            lineHeight: '1.72',
            marginBottom: '48px',
            maxWidth: '480px',
            fontFamily: 'Karla, sans-serif',
          }}>
            Every reflection is sealed until your match submits theirs — then both unlock
            at the exact same moment. No bias, no second-guessing. Click the sphere to
            feel what that reveal moment is like.
          </p>

          {/* CTA */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <motion.button
              onClick={() => nav('/welcome')}
              className="btn-primary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{ width: 'auto', fontSize: '16px', padding: '17px 36px' }}
            >
              Get started — it's free →
            </motion.button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '16px', fontFamily: 'Karla, sans-serif' }}>
            No account needed. Just a name and a date.
          </p>
        </motion.div>

        {/* Globe / confetti / reveal — aligned to h1 top */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.9, ease: 'easeOut' }}
          style={{
            paddingTop: mobile ? '0' : '62px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: mobile ? 'center' : 'flex-start',
          }}
        >
          <AnimatePresence mode="wait">
            {!exploded ? (
              <motion.div
                key="orb"
                exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.25 } }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}
              >
                <ConnectionOrb
                  key={orbKey}
                  size={mobile ? 300 : 440}
                  onCharge={setOrbCharge}
                  onExplode={handleExplode}
                />
                {/* Click-to-charge hint with 3 fill dots */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3].map(n => (
                      <motion.div
                        key={n}
                        animate={{
                          background: orbCharge >= n ? 'var(--text)' : 'var(--border)',
                          scale: orbCharge === n ? [1, 1.5, 1] : 1,
                        }}
                        transition={{ duration: 0.35, type: orbCharge === n ? 'spring' : 'tween' }}
                        style={{ width: '7px', height: '7px', borderRadius: '50%' }}
                      />
                    ))}
                  </div>
                  <p style={{
                    fontSize: '11px',
                    fontFamily: 'Karla, sans-serif',
                    color: 'var(--text-faint)',
                    fontStyle: 'italic',
                    userSelect: 'none',
                  }}>
                    {orbCharge === 0 && 'click to see the reveal'}
                    {orbCharge === 1 && 'once more…'}
                    {orbCharge === 2 && 'one last time →'}
                  </p>
                </div>
              </motion.div>
            ) : !showReveal ? (
              <ConfettiExplosion key="confetti" size={mobile ? 300 : 440} />
            ) : (
              <DemoRevealCard key="reveal" onClose={handleReset} mobile={mobile} />
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ── Reflection step ──────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)' }} />
      <section style={{
        maxWidth: '1160px',
        margin: '0 auto',
        padding: `80px clamp(24px, 5vw, 56px)`,
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
        gap: mobile ? '52px' : '80px',
        alignItems: 'center',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ order: mobile ? 1 : 2 }}
        >
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--accent)',
            display: 'block',
            marginBottom: '20px',
          }}>
            Step 1 — Reflect
          </span>
          <h2 style={{
            fontSize: 'clamp(32px, 3.8vw, 52px)',
            fontWeight: 800,
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            color: 'var(--text)',
            marginBottom: '20px',
          }}>
            Write first.<br />No peeking.
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-muted)',
            lineHeight: '1.72',
            fontFamily: 'Karla, sans-serif',
            maxWidth: '420px',
            marginBottom: '36px',
          }}>
            Right after the date, write your honest reflection. It seals the moment you submit — your match can't see a word until they've written theirs too.
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              { icon: '◈', label: 'AI-generated prompt per date' },
              { icon: '◇', label: 'Sealed on submit, never before' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ fontSize: '13px', color: 'var(--accent)' }}>{icon}</span>
                <span style={{ fontSize: '13px', fontFamily: 'Karla, sans-serif', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{ order: mobile ? 2 : 1 }}
        >
          <ReflectingCard />
        </motion.div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: '1160px',
        margin: '0 auto',
        padding: `80px clamp(24px, 5vw, 56px)`,
      }}>
        <div style={{ marginBottom: '56px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-faint)',
          }}>
            How it works
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '20px',
        }}>
          {FEATURES.map((f, i) => (
            <FeatureTile key={f.title} feature={f} index={i} />
          ))}
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)' }} />
      <section style={{
        padding: '96px clamp(24px, 5vw, 56px)',
        textAlign: 'center',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 style={{
            fontSize: 'clamp(36px, 4.5vw, 60px)',
            fontWeight: 800,
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.04em',
            marginBottom: '16px',
          }}>
            Ready to find out?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '40px', fontFamily: 'Karla, sans-serif' }}>
            Create a profile in 30 seconds. No downloads.
          </p>
          <motion.button
            onClick={() => nav('/welcome')}
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{ width: 'auto', display: 'inline-block', fontSize: '16px', padding: '17px 40px' }}
          >
            Create your profile →
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '24px clamp(24px, 5vw, 56px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em', color: 'var(--text-muted)' }}>
          Echo<span style={{ color: 'var(--accent)' }}>.</span>
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-faint)', fontFamily: 'Karla, sans-serif' }}>
          Reflections, not regrets.
        </span>
      </div>
    </div>
  )
}


// ── Reflecting card (Step 1 — write your reflection) ─────────────────────────

function ReflectingCard() {
  const tilt = useTilt(5)

  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: '3px solid var(--accent)',
        borderRadius: '20px',
        padding: '26px 24px',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <p style={{
              fontSize: '10px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--accent)', marginBottom: '3px',
            }}>
              ◈ Your reflection
            </p>
            <p style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>
              Coffee with Jamie
            </p>
          </div>
          <div style={{
            fontSize: '11px', fontFamily: 'Karla, sans-serif',
            color: 'var(--text-faint)', background: 'var(--bg)',
            border: '1px solid var(--border)', borderRadius: '20px',
            padding: '4px 10px',
          }}>
            tonight
          </div>
        </div>

        {/* AI prompt */}
        <div style={{
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
        }}>
          <p style={{
            fontSize: '10px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.09em',
            color: 'var(--accent)', marginBottom: '5px',
          }}>
            Echo prompt
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.6', fontFamily: 'Karla, sans-serif' }}>
            What surprised you most about the way the conversation went tonight?
          </p>
        </div>

        {/* Fake textarea */}
        <div style={{
          background: 'var(--bg)',
          border: '1.5px solid var(--accent)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
          minHeight: '72px',
          position: 'relative',
        }}>
          <p style={{
            fontSize: '13px', color: 'var(--text)', lineHeight: '1.65',
            fontFamily: 'Karla, sans-serif', fontStyle: 'italic',
          }}>
            "Honestly, how easy it was to just talk. Usually I overthink everything but tonight felt…
          </p>
          {/* Blinking cursor */}
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 1, ease: 'steps(1)' }}
            style={{
              display: 'inline-block', width: '1.5px', height: '14px',
              background: 'var(--accent)', verticalAlign: 'middle', marginLeft: '1px',
            }}
          />
        </div>

        {/* Star rating */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-faint)', marginBottom: '8px',
          }}>
            How'd it go?
          </p>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <motion.span
                key={n}
                animate={n <= 4 ? { scale: [1, 1.18, 1] } : {}}
                transition={{ delay: n * 0.06, duration: 0.4, ease: 'easeOut' }}
                style={{
                  fontSize: '20px',
                  color: n <= 4 ? 'var(--accent)' : 'var(--border-strong)',
                  lineHeight: 1,
                }}
              >
                ★
              </motion.span>
            ))}
          </div>
        </div>

        {/* Would see again */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-faint)', marginBottom: '8px',
          }}>
            Would you see them again?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Yes', active: true },
              { label: 'Maybe', active: false },
              { label: 'No', active: false },
            ].map(({ label, active }) => (
              <div
                key={label}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'Syne, sans-serif',
                  border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  background: active ? 'var(--accent-bg)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Sealed footer */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              style={{ fontSize: '14px', color: 'var(--accent)' }}
            >
              ◈
            </motion.span>
            <span style={{
              fontSize: '11px', fontFamily: 'Karla, sans-serif',
              color: 'var(--text-muted)', fontWeight: 500,
            }}>
              Sealed on submit — Jamie can't peek
            </span>
          </div>
          <div style={{
            fontSize: '10px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--text-faint)',
          }}>
            drafting
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Feature tile ──────────────────────────────────────────────────────────────

function FeatureTile({ feature: f, index }) {
  const tilt = useTilt(3.5)

  return (
    <motion.div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-lift"
      style={{ padding: '32px 28px', transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '14px',
        background: f.bg,
        border: `1px solid ${f.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        color: f.color,
        marginBottom: '24px',
        boxShadow: `0 3px 0 ${f.border}`,
      }}>
        {f.icon}
      </div>

      <span style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'Syne, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-faint)',
        marginBottom: '10px',
      }}>
        {f.number}
      </span>

      <h3 style={{
        fontSize: '20px',
        fontWeight: 800,
        fontFamily: 'Syne, sans-serif',
        letterSpacing: '-0.02em',
        marginBottom: '12px',
        color: 'var(--text)',
      }}>
        {f.title}
      </h3>

      <p style={{
        fontSize: '14px',
        color: 'var(--text-muted)',
        lineHeight: '1.7',
        fontFamily: 'Karla, sans-serif',
      }}>
        {f.body}
      </p>
    </motion.div>
  )
}

// ── Confetti explosion ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#CF4462', '#B87318', '#C8A87A', '#1C7C50',
  '#FFDDE5', '#F0D890', '#B0CAFE', '#D4A8C0',
]

function ConfettiExplosion({ size }) {
  const pieces = useMemo(() =>
    Array.from({ length: 72 }, (_, i) => ({
      angle: (i / 72) * Math.PI * 2 + (Math.random() - 0.5) * 0.6,
      dist:  120 + Math.random() * 260,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      isRect: Math.random() > 0.52,
      delay:  Math.random() * 0.12,
      w: 5 + Math.random() * 6,
      h: 5 + Math.random() * 14,
      spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    })), [])

  return (
    <div style={{
      width: size, height: size,
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist,
            opacity: 0,
            rotate: p.spin,
            scale: 0.15,
          }}
          transition={{
            duration: 0.75 + p.delay * 3,
            delay: p.delay,
            ease: [0.15, 0.85, 0.6, 1],
          }}
          style={{
            position: 'absolute',
            width:  p.isRect ? p.w : p.w + 2,
            height: p.isRect ? p.h : p.w + 2,
            borderRadius: p.isRect ? '2px' : '50%',
            background: p.color,
          }}
        />
      ))}
    </div>
  )
}

// ── Demo reveal card ───────────────────────────────────────────────────────────

const DEMO = {
  name: 'Alex',
  message: "The chemistry between you was unmistakable. Your reflections mirror each other so closely it's almost uncanny — this one is worth a second chapter.",
  next: 'Text them tonight. You both already know.',
  yours: "The conversation flowed so effortlessly. I kept hoping the night wouldn't end.",
  theirs: "I couldn't stop smiling the whole way home.",
}

function DemoRevealCard({ onClose, mobile }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: mobile ? '100%' : '440px' }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--amber-border)',
        borderTop: '3px solid var(--amber)',
        borderRadius: '20px',
        padding: '28px 24px 22px',
        boxShadow: 'var(--shadow-xl)',
        position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '18px', color: 'var(--text-faint)',
            lineHeight: 1, padding: '4px 8px', borderRadius: '6px',
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <motion.span
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{ display: 'inline-block', fontSize: '32px', color: 'var(--amber)', marginBottom: '8px' }}
          >
            ✦
          </motion.span>
          <h3 style={{
            fontSize: '26px', fontWeight: 800, fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.04em', color: 'var(--amber)', margin: '0 0 4px',
          }}>
            It's mutual.
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Karla, sans-serif' }}>
            You both felt something real.
          </p>
        </div>

        {/* AI insight */}
        <div style={{
          background: 'var(--amber-bg)',
          border: '1px solid var(--amber-border)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
        }}>
          <p style={{
            fontSize: '13px', lineHeight: '1.7', color: 'var(--text)',
            fontStyle: 'italic', fontFamily: 'Karla, sans-serif',
          }}>
            "{DEMO.message}"
          </p>
        </div>

        {/* Side-by-side reflections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'You', text: DEMO.yours },
            { label: DEMO.name, text: DEMO.theirs },
          ].map(({ label, text }) => (
            <div key={label} style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '12px',
            }}>
              <p style={{
                fontSize: '10px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                color: 'var(--text-faint)', marginBottom: '6px',
              }}>
                ◈ {label}
              </p>
              <p style={{
                fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic',
                lineHeight: '1.55', fontFamily: 'Karla, sans-serif',
              }}>
                "{text}"
              </p>
            </div>
          ))}
        </div>

        {/* Next step */}
        <div style={{
          borderLeft: '2.5px solid var(--amber)',
          paddingLeft: '12px',
        }}>
          <p style={{
            fontSize: '10px', fontWeight: 700, fontFamily: 'Syne, sans-serif',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            color: 'var(--amber)', marginBottom: '4px',
          }}>
            ✦ Next move
          </p>
          <p style={{
            fontSize: '13px', color: 'var(--text)', fontFamily: 'Karla, sans-serif',
            fontWeight: 500, lineHeight: '1.5',
          }}>
            {DEMO.next}
          </p>
        </div>
      </div>

      <p style={{
        textAlign: 'center', marginTop: '10px',
        fontSize: '11px', color: 'var(--text-faint)',
        fontFamily: 'Karla, sans-serif', fontStyle: 'italic',
      }}>
        this is what your reveal looks like
      </p>
    </motion.div>
  )
}
