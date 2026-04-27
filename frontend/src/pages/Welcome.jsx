import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import GPUParticles from '../components/GPUParticles'

function useTilt(strength = 5) {
  const ref = useRef(null)
  function onMouseMove(e) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    el.style.transform = `perspective(900px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg) translateZ(14px)`
    el.style.transition = 'none'
  }
  function onMouseLeave() {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)'
    el.style.transition = 'transform 0.65s cubic-bezier(0.23, 1, 0.32, 1)'
  }
  return { ref, onMouseMove, onMouseLeave }
}

function sanitizeUsername(raw) {
  return raw.toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '')
}

export default function Welcome() {
  const nav = useNavigate()
  const [tab, setTab] = useState('create')

  // create fields
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')

  // sign-in fields
  const [signInUsername, setSignInUsername] = useState('')
  const [signInPassword, setSignInPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const tilt = useTilt(5)

  function storeAuth(token) {
    localStorage.setItem('echo_token', token.access_token)
    localStorage.setItem('echo_user_id', token.user_id)
    localStorage.setItem('echo_username', token.username)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const clean = sanitizeUsername(username)
    if (!clean || !name.trim() || password.length < 8) return
    setLoading(true); setErr('')
    try {
      const token = await api.register({
        username: clean,
        name: name.trim(),
        bio: bio.trim() || undefined,
        password,
      })
      storeAuth(token)
      nav(`/dashboard/${token.user_id}`)
    } catch (ex) {
      setErr(ex.message || 'Something went wrong.')
    } finally { setLoading(false) }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    const clean = sanitizeUsername(signInUsername)
    if (!clean || !signInPassword) return
    setLoading(true); setErr('')
    try {
      const token = await api.login({ username: clean, password: signInPassword })
      storeAuth(token)
      nav(`/dashboard/${token.user_id}`)
    } catch (ex) {
      setErr(ex.message === 'Failed to fetch'
        ? 'Cannot reach the server. Is the backend running?'
        : 'Incorrect username or password.')
    } finally { setLoading(false) }
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
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: '400px' }}
      >
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.55 }}
          >
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '54px',
              height: '54px',
              background: 'var(--accent)',
              borderRadius: '15px',
              marginBottom: '22px',
              boxShadow: '0 5px 0 var(--accent-dark), 0 10px 28px rgba(207,68,98,0.28)',
            }}>
              <span style={{ fontSize: '24px', color: 'white' }}>✦</span>
            </div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 800,
              letterSpacing: '-0.045em',
              color: 'var(--text)',
              marginBottom: '10px',
              fontFamily: 'Syne, sans-serif',
              lineHeight: 1,
            }}>
              Echo
            </h1>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '16px',
              fontStyle: 'italic',
              fontFamily: 'Karla, sans-serif',
            }}>
              Reflections, not regrets.
            </p>
          </motion.div>
        </div>

        {/* Card with 3D tilt */}
        <div
          ref={tilt.ref}
          onMouseMove={tilt.onMouseMove}
          onMouseLeave={tilt.onMouseLeave}
          className="card"
          style={{
            padding: '32px',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--bg)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '28px',
            border: '1px solid var(--border)',
          }}>
            {[
              { key: 'create', label: 'New Profile' },
              { key: 'enter', label: 'Sign In' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setErr('') }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'Syne, sans-serif',
                  letterSpacing: '0.01em',
                  transition: 'all 0.18s ease',
                  background: tab === key ? 'var(--surface)' : 'transparent',
                  color: tab === key ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: tab === key ? 'var(--shadow-sm)' : 'none',
                  border: tab === key ? '1px solid var(--border)' : '1px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'create' ? (
              <motion.form
                key="create"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleCreate}
                style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
              >
                {/* Username — the primary identifier */}
                <div>
                  <span className="label-caps">Ditto username</span>
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
                      placeholder="yourname"
                      value={username}
                      onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                      required
                      autoFocus
                      maxLength={20}
                      style={{ paddingLeft: '30px', fontFamily: 'monospace', fontSize: '15px' }}
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px', fontFamily: 'Karla, sans-serif' }}>
                    3–20 chars, letters, numbers, underscores. Share this with your dates.
                  </p>
                </div>

                <div>
                  <span className="label-caps">Display name</span>
                  <input
                    className="input-field"
                    placeholder="Alex"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <span className="label-caps">
                    Bio{' '}
                    <span style={{ textTransform: 'none', fontWeight: 400, fontFamily: 'Karla, sans-serif', opacity: 0.65 }}>
                      — optional
                    </span>
                  </span>
                  <textarea
                    className="input-field"
                    placeholder="A few words about yourself…"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    style={{ resize: 'none' }}
                  />
                </div>

                <div>
                  <span className="label-caps">Password</span>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {err && <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 500 }}>{err}</p>}
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={loading || username.length < 3 || password.length < 8}
                  style={{ marginTop: '4px' }}
                >
                  {loading ? 'Creating profile…' : 'Create Profile →'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="enter"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSignIn}
                style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
              >
                <div>
                  <span className="label-caps">Username</span>
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
                      placeholder="yourname"
                      value={signInUsername}
                      onChange={(e) => setSignInUsername(sanitizeUsername(e.target.value))}
                      required
                      autoFocus
                      style={{ paddingLeft: '30px', fontFamily: 'monospace', fontSize: '15px' }}
                    />
                  </div>
                </div>
                <div>
                  <span className="label-caps">Password</span>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                </div>
                {err && <p style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 500 }}>{err}</p>}
                <button className="btn-primary" type="submit" disabled={loading || !signInUsername || !signInPassword} style={{ marginTop: '4px' }}>
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          color: 'var(--text-faint)',
          fontSize: '12px',
        }}>
          Your reflections are sealed until both parties submit.
        </p>
      </motion.div>
    </div>
  )
}
