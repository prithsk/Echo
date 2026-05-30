import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, clearAuth } from '../api'
import GPUParticles from '../components/GPUParticles'

function useTilt(strength = 3.5) {
  const ref = useRef(null)
  function onMouseMove(e) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    el.style.transform = `perspective(800px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg) translateZ(8px)`
    el.style.transition = 'none'
  }
  function onMouseLeave() {
    const el = ref.current
    if (!el) return
    el.style.transform = ''
    el.style.transition = 'transform 0.65s cubic-bezier(0.23, 1, 0.32, 1)'
  }
  return { ref, onMouseMove, onMouseLeave }
}

function useCountUp(target, duration = 900) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    const start = Date.now()
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(ease * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return count
}

const AVATAR_PALETTES = [
  { bg: '#FFF0C8', color: '#A06010', border: '#F0D890' },
  { bg: '#FFDDE5', color: '#9C2F47', border: '#F5B8C4' },
  { bg: '#E0EDFF', color: '#1E4FAA', border: '#B0CAFE' },
  { bg: '#E0F5EB', color: '#1A6B38', border: '#90DABB' },
  { bg: '#FDEEE6', color: '#8B3A18', border: '#F0B898' },
  { bg: '#FFF4E6', color: '#9B5915', border: '#F5C890' },
]

function avatarPalette(name) {
  return AVATAR_PALETTES[(name?.charCodeAt(0) || 0) % AVATAR_PALETTES.length]
}

const OUTCOME_CFG = {
  mutual: { label: 'Mutual ✦', color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  one_sided: { label: 'One-sided', color: 'var(--accent)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
  no_interest: { label: 'Not this time', color: 'var(--text-muted)', bg: 'var(--surface-subtle)', border: 'var(--border)' },
}

const STATUS_CFG = {
  scheduled: { label: 'Upcoming', color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  awaiting_reflections: { label: 'Pending', color: 'var(--accent)', bg: 'var(--accent-bg)', border: 'var(--accent-border)' },
  revealed: { label: 'Revealed', color: 'var(--text-muted)', bg: 'var(--surface-subtle)', border: 'var(--border)' },
}

function Badge({ cfg }) {
  return (
    <span className="badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  )
}

function StatCard({ label, value, accent, icon, delay = 0 }) {
  const tilt = useTilt(6)
  const animated = useCountUp(value, 850)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      style={{
        flex: 1,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '18px 16px 16px',
        boxShadow: 'var(--shadow-md)',
        cursor: 'default',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle corner accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '48px',
        height: '48px',
        borderRadius: '0 16px 0 100%',
        background: accent ? `color-mix(in srgb, ${accent} 8%, transparent)` : 'var(--surface-subtle)',
        pointerEvents: 'none',
      }} />

      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'Syne, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: accent || 'var(--text-faint)',
        marginBottom: '10px',
        opacity: accent ? 1 : 0.6,
      }}>
        {icon && <span style={{ marginRight: '5px' }}>{icon}</span>}
        {label}
      </div>
      <div style={{
        fontSize: '38px',
        fontWeight: 800,
        fontFamily: 'Syne, sans-serif',
        color: accent || 'var(--text)',
        lineHeight: 1,
        letterSpacing: '-0.05em',
      }}>
        {animated}
      </div>
    </motion.div>
  )
}

function StatsStrip({ history }) {
  const total = history.length
  const mutual = history.filter(h => h.outcome === 'mutual').length
  const pending = history.filter(h => h.status === 'awaiting_reflections').length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.05 }}
      style={{ display: 'flex', gap: '10px', marginBottom: '36px' }}
    >
      <StatCard label="Total" value={total} delay={0.08} />
      <StatCard label="Mutual" value={mutual} accent="var(--amber)" icon="✦" delay={0.15} />
      <StatCard label="Pending" value={pending} accent="var(--accent)" delay={0.22} />
    </motion.div>
  )
}

function OutcomeBar({ history }) {
  const revealed = history.filter(h => h.outcome)
  if (revealed.length < 2) return null

  const mutual = revealed.filter(h => h.outcome === 'mutual').length
  const oneSided = revealed.filter(h => h.outcome === 'one_sided').length
  const noInterest = revealed.filter(h => h.outcome === 'no_interest').length
  const n = revealed.length

  const segments = [
    { count: mutual, color: 'var(--amber)', label: `${mutual} mutual` },
    { count: oneSided, color: 'var(--accent)', label: `${oneSided} one-sided` },
    { count: noInterest, color: 'var(--border-strong)', label: `${noInterest} not this time` },
  ].filter(s => s.count > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '18px 20px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span className="label-caps" style={{ color: 'var(--text-faint)', marginBottom: '12px', display: 'block' }}>
        Outcome Breakdown
      </span>

      <div style={{
        height: '7px',
        borderRadius: '4px',
        display: 'flex',
        gap: '3px',
        overflow: 'hidden',
        marginBottom: '12px',
        background: 'var(--surface-subtle)',
      }}>
        {segments.map((seg, i) => (
          <motion.div
            key={i}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${(seg.count / n) * 100}%`, opacity: 1 }}
            transition={{ delay: 0.35 + i * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: seg.color, borderRadius: '4px', height: '100%' }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
        {segments.map((seg, i) => (
          <span key={i} style={{
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'Karla, sans-serif',
            color: seg.color,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: seg.color,
              display: 'inline-block',
            }} />
            {seg.label}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function EmptyState({ onNew }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{
        textAlign: 'center',
        padding: '56px 24px 48px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 28px' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 2 + i * 0.5], opacity: [0.22, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.65, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1.5px solid var(--accent)',
            }}
          />
        ))}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 5px 0 var(--accent-border), var(--shadow-sm)',
        }}>
          <span style={{ fontSize: '28px', lineHeight: 1 }}>✦</span>
        </div>
      </div>
      <h3 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Syne, sans-serif', marginBottom: '10px', color: 'var(--text)' }}>
        No dates yet
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.7', maxWidth: '260px', margin: '0 auto 28px' }}>
        Reflections stay sealed until both of you submit. Neither side sees anything early.
      </p>
      <button className="btn-primary" onClick={onNew} style={{ display: 'inline-block', width: 'auto', padding: '13px 28px' }}>
        Schedule a Date →
      </button>
    </motion.div>
  )
}

export default function Dashboard() {
  const { userId } = useParams()
  const nav = useNavigate()
  const [user, setUser] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewDate, setShowNewDate] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    Promise.all([api.getUser(userId), api.getUserHistory(userId)])
      .then(([u, h]) => { setUser(u); setHistory(h) })
      .catch(() => nav('/'))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function copyUsername() {
    const handle = user?.username ? `@${user.username}` : userId
    navigator.clipboard.writeText(handle).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  async function handleLogout() {
    await api.logout()
    nav('/')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await api.deleteAccount()
      clearAuth()
      nav('/')
    } catch {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <GPUParticles />
      {/* Nav */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(248,247,243,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <span style={{
          fontSize: '22px',
          fontWeight: 800,
          fontFamily: 'Syne, sans-serif',
          letterSpacing: '-0.04em',
          color: 'var(--text)',
        }}>
          Echo<span style={{ color: 'var(--accent)' }}>.</span>
        </span>

        <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <motion.button
            onClick={() => setShowDropdown(v => !v)}
            whileTap={{ scale: 0.94 }}
            style={{
              background: showDropdown ? 'var(--surface-subtle)' : 'var(--surface)',
              border: `1px solid ${showDropdown ? 'var(--border-strong)' : 'var(--border)'}`,
              color: 'var(--text-muted)',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.22s',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            @{user?.username || '…'}
          </motion.button>

          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 800,
            fontFamily: 'Syne, sans-serif',
            color: 'white',
            boxShadow: '0 3px 0 var(--accent-dark)',
            flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: '160px',
                  overflow: 'hidden',
                  zIndex: 100,
                }}
              >
                <button
                  onClick={copyUsername}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'Karla, sans-serif',
                    color: copied ? 'var(--green)' : 'var(--text)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  {copied ? '✓ Copied' : 'Copy @username'}
                </button>
                <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'Karla, sans-serif',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-bg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  Log out
                </button>
                <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />
                <button
                  onClick={() => { setShowDropdown(false); setShowDeleteConfirm(true) }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'Karla, sans-serif',
                    color: 'var(--text-faint)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)' }}
                >
                  Delete account
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '44px 24px 80px' }}>
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: '32px' }}
        >
          <h2 style={{ fontSize: '34px', fontWeight: 800, fontFamily: 'Syne, sans-serif', marginBottom: '6px' }}>
            Hey, {user?.name}.
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            {history.length === 0
              ? 'Your story starts here.'
              : `${history.length} date${history.length > 1 ? 's' : ''} logged.`}
          </p>
        </motion.div>

        {/* Stats strip */}
        {history.length > 0 && <StatsStrip history={history} />}

        {/* Outcome breakdown bar */}
        {history.length > 0 && <OutcomeBar history={history} />}

        {/* Preference profile */}
        {user?.preference_summary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '24px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span className="label-caps" style={{ color: 'var(--accent)', marginBottom: '10px' }}>
              Preference Profile
            </span>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.65' }}>
              {user.preference_summary}
            </p>
          </motion.div>
        )}

        {/* Schedule a date */}
        <motion.button
          onClick={() => setShowNewDate(true)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          whileTap={{ scale: 0.995 }}
          style={{
            width: '100%',
            padding: '20px',
            borderRadius: '16px',
            border: '1.5px dashed var(--border-strong)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'Syne, sans-serif',
            cursor: 'pointer',
            marginBottom: '44px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.background = 'var(--accent-bg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          + Schedule a Date
        </motion.button>

        {/* History or empty state */}
        {history.length === 0 ? (
          <EmptyState onNew={() => setShowNewDate(true)} />
        ) : (
          <>
            <span className="label-caps" style={{ color: 'var(--text-faint)', marginBottom: '16px' }}>
              Date History
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {history.map((item, i) => (
                <DateCard key={item.date_id} item={item} userId={userId} index={i} />
              ))}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showNewDate && (
          <NewDateModal
            userId={userId}
            onClose={() => setShowNewDate(false)}
            onCreated={(d) => {
              setShowNewDate(false)
              nav(`/date/${d.id}/reflect`)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deleting && setShowDeleteConfirm(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(16,14,12,0.4)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: '32px 28px',
                maxWidth: '360px',
                width: '100%',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div style={{
                width: '44px', height: '44px',
                borderRadius: '12px',
                background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
                fontSize: '20px',
              }}>
                ⚠
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'Syne, sans-serif', marginBottom: '10px', color: 'var(--text)' }}>
                Delete your account?
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.65', marginBottom: '28px' }}>
                This permanently deletes your profile, all your dates, reflections, and reveals. <strong>There is no undo.</strong>
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    padding: '13px 20px',
                    borderRadius: '10px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: 'Syne, sans-serif',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.7 : 1,
                    boxShadow: deleting ? 'none' : '0 3px 0 var(--accent-dark)',
                    transform: deleting ? 'translateY(3px)' : '',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete it'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DateCard({ item, userId, index }) {
  const tilt = useTilt(3)
  const outcome = item.outcome ? OUTCOME_CFG[item.outcome] : null
  const status = STATUS_CFG[item.status] || STATUS_CFG.scheduled
  const canReflect = !item.has_reflected && (item.status === 'awaiting_reflections' || item.status === 'scheduled')
  const canReveal = item.status === 'revealed'
  const av = avatarPalette(item.match_name)
  const dateStr = new Date(item.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="card-lift"
      style={{ padding: '20px 22px' }}
    >
      {/* Header row: avatar + name + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '0' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: av.bg,
          border: `1.5px solid ${av.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 800,
          fontFamily: 'Syne, sans-serif',
          color: av.color,
          flexShrink: 0,
          boxShadow: `0 3px 0 ${av.border}`,
        }}>
          {item.match_name?.[0]?.toUpperCase() || '?'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
            <p style={{ fontWeight: 700, fontSize: '17px', fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>
              {item.match_name}
            </p>
            <Badge cfg={outcome || status} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{dateStr}</p>
            {item.location && (
              <>
                <span style={{ fontSize: '9px', color: 'var(--border-strong)' }}>•</span>
                <p style={{ fontSize: '12px', color: 'var(--text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                  {item.location}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {item.outcome_message && (
        <p style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: '1.65',
          marginTop: '14px',
          marginBottom: '0',
          fontStyle: 'italic',
          paddingLeft: '14px',
          borderLeft: '2px solid var(--border)',
        }}>
          "{item.outcome_message}"
        </p>
      )}

      {(canReflect || canReveal) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingLeft: '60px' }}>
          {canReflect && (
            <ActionLink
              to={`/date/${item.date_id}/reflect`}
              label="Reflect →"
              bg="var(--accent)"
              color="white"
              shadow="0 3px 0 var(--accent-dark)"
            />
          )}
          {canReveal && (
            <ActionLink
              to={`/date/${item.date_id}/reveal`}
              label="View Reveal →"
              bg="var(--amber-bg)"
              color="var(--amber)"
              border="var(--amber-border)"
              shadow="0 3px 0 rgba(138,85,16,0.25)"
            />
          )}
        </div>
      )}
    </motion.div>
  )
}

function ActionLink({ to, label, bg, color, border, shadow }) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1,
        padding: '10px 16px',
        borderRadius: '10px',
        background: bg,
        color,
        border: border ? `1px solid ${border}` : 'none',
        fontSize: '13px',
        fontWeight: 700,
        fontFamily: 'Syne, sans-serif',
        textAlign: 'center',
        textDecoration: 'none',
        display: 'block',
        boxShadow: hov ? 'none' : shadow,
        transform: hov ? 'translateY(2px)' : 'translateY(0)',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
      }}
    >
      {label}
    </Link>
  )
}

function NewDateModal({ userId, onClose, onCreated }) {
  const [matchUsername, setMatchUsername] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function sanitize(raw) {
    return raw.toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '')
  }

  async function submit(e) {
    e.preventDefault()
    const clean = sanitize(matchUsername)
    if (!clean) return
    setLoading(true); setErr('')
    try {
      const match = await api.getUserByUsername(clean).catch(() => {
        throw new Error(`No Echo user found with username @${clean}`)
      })
      if (match.id === userId) {
        throw new Error("You can't schedule a date with yourself.")
      }
      const date = await api.createDate({
        user1_id: userId,
        user2_id: match.id,
        scheduled_at: new Date(scheduledAt).toISOString(),
        location: location.trim() || undefined,
      })
      onCreated(date)
    } catch (ex) {
      setErr(ex.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(16,14,12,0.36)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          padding: '32px 28px 52px',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          boxShadow: '0 -8px 48px rgba(16,14,12,0.1)',
        }}
      >
        <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 28px' }} />
        <h3 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Syne, sans-serif', marginBottom: '28px' }}>
          Schedule a Date
        </h3>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span className="label-caps">Match's Echo username</span>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                fontFamily: 'Karla, sans-serif',
              }}>@</span>
              <input
                className="input-field"
                placeholder="theirname"
                value={matchUsername}
                onChange={(e) => setMatchUsername(sanitize(e.target.value))}
                required
                style={{ paddingLeft: '30px', fontFamily: 'monospace', fontSize: '15px' }}
              />
            </div>
          </div>
          <div>
            <span className="label-caps">Date & Time</span>
            <input
              className="input-field"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
          <div>
            <span className="label-caps">
              Location{' '}
              <span style={{ textTransform: 'none', fontWeight: 400, fontFamily: 'Karla, sans-serif', opacity: 0.65 }}>
                — optional
              </span>
            </span>
            <input
              className="input-field"
              placeholder="Central Park, NYC…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          {err && <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 500 }}>{err}</p>}
          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? 'Scheduling…' : 'Schedule Date →'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
      <div style={{ position: 'relative', width: '36px', height: '36px' }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 2.4], opacity: [0.3, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.55, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1.5px solid var(--accent)',
            }}
          />
        ))}
        <motion.div
          animate={{ scale: [0.9, 1.05, 0.9] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            background: 'var(--accent)',
          }}
        />
      </div>
    </div>
  )
}
