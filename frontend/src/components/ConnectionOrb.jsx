import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'

// Each particle = a potential connection. Amber nodes = mutual reveals.
// Click = the reveal moment: truth scatters outward, then spring physics
// pulls connections back — just like Echo's simultaneous unlock.

// ── Config ────────────────────────────────────────────────────────────────────
const N          = 720      // particles (connections in the network)
const SPHERE_R   = 2.1      // sphere radius in scene units
const LINK_D     = 0.66     // max chord distance to draw a connection line
const PULSE_AMP  = 0.058    // breathing amplitude (sealed reflections waiting)
const PULSE_FREQ = 1.5      // breathing cycles per second
const SPRING_K   = 0.026    // spring constant (toward pulsed target)
const DAMPING    = 0.88     // velocity damping per frame
const SCATTER_V  = 0.22     // radial scatter speed — the reveal burst

// ── Fibonacci sphere ──────────────────────────────────────────────────────────
function buildSphere() {
  const phi = Math.PI * (3 - Math.sqrt(5))
  const pts = []
  for (let i = 0; i < N; i++) {
    const y     = 1 - (i / (N - 1)) * 2
    const r     = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = phi * i
    pts.push({
      x:     Math.cos(theta) * r * SPHERE_R,
      y:     y * SPHERE_R,
      z:     Math.sin(theta) * r * SPHERE_R,
      phase: Math.random() * Math.PI * 2,
    })
  }
  return pts
}

// ── Pre-compute neighbor line segments ────────────────────────────────────────
function buildLines(pts) {
  const segs = []
  const d2   = LINK_D * LINK_D
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = pts[i].x - pts[j].x
      const dy = pts[i].y - pts[j].y
      const dz = pts[i].z - pts[j].z
      if (dx * dx + dy * dy + dz * dz < d2) {
        segs.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z)
      }
    }
  }
  return new Float32Array(segs)
}

// ── Vertex colors: warm light brown ──────────────────────────────────────────
function buildColors(pts) {
  const c = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const t = (pts[i].y / SPHERE_R + 1) * 0.5   // 0=bottom, 1=top
    // bottom: #B09060 = rgb(176,144,96) → top: #C8A87A = rgb(200,168,122)
    c[i * 3 + 0] = ((1 - t) * 176 + t * 200) / 255
    c[i * 3 + 1] = ((1 - t) * 144 + t * 168) / 255
    c[i * 3 + 2] = ((1 - t) * 96  + t * 122) / 255
  }
  return c
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ConnectionOrb({ size = 460, onReveal, onCharge, onExplode }) {
  const mountRef      = useRef(null)
  const mouseRef      = useRef({ x: 0, y: 0 })
  const revealRef     = useRef(0)
  const clickCountRef = useRef(0)
  // Keep prop refs current so the Three.js closure always calls the latest version
  const onChargeRef   = useRef(onCharge)
  const onExplodeRef  = useRef(onExplode)
  onChargeRef.current  = onCharge
  onExplodeRef.current = onExplode

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Build static sphere data once
    const base      = buildSphere()
    const lineArr   = buildLines(base)
    const colorArr  = buildColors(base)

    // Mutable per-frame state (Float32 arrays for cache efficiency)
    const pos = new Float32Array(N * 3)
    const vel = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 0] = base[i].x
      pos[i * 3 + 1] = base[i].y
      pos[i * 3 + 2] = base[i].z
    }

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.z = 6.8

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // ── Particles ─────────────────────────────────────────────────────────────
    const ptGeo     = new THREE.BufferGeometry()
    const ptPosAttr = new THREE.BufferAttribute(pos, 3)
    ptPosAttr.setUsage(THREE.DynamicDrawUsage)
    ptGeo.setAttribute('position', ptPosAttr)
    ptGeo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3))

    const ptMat = new THREE.PointsMaterial({
      size:             3.8,
      sizeAttenuation:  true,
      vertexColors:     true,
      transparent:      true,
      opacity:          0.62,
      depthWrite:       false,
    })
    const points = new THREE.Points(ptGeo, ptMat)

    // ── Larger "node" particles ───────────────────────────────────────────────
    // Pick ~28 particles as visible "connection nodes" (larger, amber)
    const NODE_COUNT = 28
    const nodeIdx   = []
    const step      = Math.floor(N / NODE_COUNT)
    for (let i = 0; i < NODE_COUNT; i++) nodeIdx.push(i * step + Math.floor(step / 2))

    const nodePos  = new Float32Array(NODE_COUNT * 3)
    const nodeCol  = new Float32Array(NODE_COUNT * 3)
    for (let i = 0; i < NODE_COUNT; i++) {
      const k = nodeIdx[i]
      nodePos[i * 3]     = pos[k * 3]
      nodePos[i * 3 + 1] = pos[k * 3 + 1]
      nodePos[i * 3 + 2] = pos[k * 3 + 2]
      // slightly brighter warm gold nodes
      nodeCol[i * 3]     = 218 / 255
      nodeCol[i * 3 + 1] = 190 / 255
      nodeCol[i * 3 + 2] = 138 / 255
    }

    const nodeGeo     = new THREE.BufferGeometry()
    const nodePosAttr = new THREE.BufferAttribute(nodePos, 3)
    nodePosAttr.setUsage(THREE.DynamicDrawUsage)
    nodeGeo.setAttribute('position', nodePosAttr)
    nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeCol, 3))

    const nodeMat = new THREE.PointsMaterial({
      size:            8.5,
      sizeAttenuation: true,
      vertexColors:    true,
      transparent:     true,
      opacity:         0.76,
      depthWrite:      false,
    })
    const nodePoints = new THREE.Points(nodeGeo, nodeMat)

    // ── Connection lines (static positions, rotate with group) ────────────────
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lineArr, 3))

    const lineMat = new THREE.LineBasicMaterial({
      color:       0xC8A87A,
      transparent: true,
      opacity:     0.055,
      depthWrite:  false,
    })
    const lines = new THREE.LineSegments(lineGeo, lineMat)

    // Node-to-node bright connection lines
    const nodeLinkSegs = []
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const ki = nodeIdx[i], kj = nodeIdx[j]
        const dx = base[ki].x - base[kj].x
        const dy = base[ki].y - base[kj].y
        const dz = base[ki].z - base[kj].z
        const d2 = dx*dx + dy*dy + dz*dz
        if (d2 < (LINK_D * 2.5) * (LINK_D * 2.5)) {
          nodeLinkSegs.push(
            base[ki].x, base[ki].y, base[ki].z,
            base[kj].x, base[kj].y, base[kj].z
          )
        }
      }
    }
    const nodeLinkGeo = new THREE.BufferGeometry()
    nodeLinkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nodeLinkSegs), 3))
    const nodeLinkMat = new THREE.LineBasicMaterial({
      color:       0xDAC090,
      transparent: true,
      opacity:     0.14,
      depthWrite:  false,
    })
    const nodeLinks = new THREE.LineSegments(nodeLinkGeo, nodeLinkMat)

    // ── Group ─────────────────────────────────────────────────────────────────
    const group = new THREE.Group()
    group.add(lines)
    group.add(nodeLinks)
    group.add(points)
    group.add(nodePoints)
    scene.add(group)

    // ── Interaction ───────────────────────────────────────────────────────────
    function onMouseMove(e) {
      mouseRef.current = {
        x:  (e.clientX / window.innerWidth  - 0.5) * 2.8,
        y: -(e.clientY / window.innerHeight - 0.5) * 1.8,
      }
    }

    function onPointerDown() {
      clickCountRef.current = Math.min(clickCountRef.current + 1, 3)
      const count = clickCountRef.current
      if (onChargeRef.current) onChargeRef.current(count)

      if (count >= 3) {
        // EXPLOSION — scatter hard from current positions, then signal Landing
        for (let i = 0; i < N; i++) {
          const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2]
          const len = Math.sqrt(px * px + py * py + pz * pz) || 1
          const speed = SCATTER_V * 6 * (0.6 + Math.random())
          vel[i * 3 + 0] += (px / len) * speed
          vel[i * 3 + 1] += (py / len) * speed
          vel[i * 3 + 2] += (pz / len) * speed
        }
        // Let particles fly for 420ms before handing off to Landing
        setTimeout(() => { if (onExplodeRef.current) onExplodeRef.current() }, 420)
        return
      }

      // Clicks 1–2: standard scatter with increasing intensity + reveal pulse
      revealRef.current = performance.now()
      const intensity = count === 2 ? 2.2 : 1
      for (let i = 0; i < N; i++) {
        const len = Math.sqrt(
          base[i].x * base[i].x +
          base[i].y * base[i].y +
          base[i].z * base[i].z
        ) || 1
        const speed = SCATTER_V * intensity * (0.5 + Math.random())
        vel[i * 3 + 0] += (base[i].x / len) * speed
        vel[i * 3 + 1] += (base[i].y / len) * speed
        vel[i * 3 + 2] += (base[i].z / len) * speed
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    mount.addEventListener('pointerdown', onPointerDown)

    // ── Render loop ───────────────────────────────────────────────────────────
    let smoothX = 0, smoothY = 0, autoT = 0, animId

    function animate() {
      animId = requestAnimationFrame(animate)
      autoT += 0.005

      // Update each particle: spring physics toward pulsing target
      for (let i = 0; i < N; i++) {
        const pulse = 1 + PULSE_AMP * Math.sin(PULSE_FREQ * autoT + base[i].phase)
        const tx = base[i].x * pulse
        const ty = base[i].y * pulse
        const tz = base[i].z * pulse

        vel[i * 3 + 0] = vel[i * 3 + 0] * DAMPING + (tx - pos[i * 3 + 0]) * SPRING_K
        vel[i * 3 + 1] = vel[i * 3 + 1] * DAMPING + (ty - pos[i * 3 + 1]) * SPRING_K
        vel[i * 3 + 2] = vel[i * 3 + 2] * DAMPING + (tz - pos[i * 3 + 2]) * SPRING_K

        pos[i * 3 + 0] += vel[i * 3 + 0]
        pos[i * 3 + 1] += vel[i * 3 + 1]
        pos[i * 3 + 2] += vel[i * 3 + 2]
      }

      // Sync node positions to their underlying particles
      for (let i = 0; i < NODE_COUNT; i++) {
        const k = nodeIdx[i]
        nodePos[i * 3 + 0] = pos[k * 3 + 0]
        nodePos[i * 3 + 1] = pos[k * 3 + 1]
        nodePos[i * 3 + 2] = pos[k * 3 + 2]
      }

      ptGeo.attributes.position.needsUpdate   = true
      nodeGeo.attributes.position.needsUpdate = true

      // Reveal pulse: connections flare up when truth is unlocked,
      // then fade back to resting state over ~1.4s
      const revealAge  = (performance.now() - revealRef.current) / 1000
      const revealFade = revealAge < 1.4 ? Math.pow(1 - revealAge / 1.4, 1.5) : 0
      lineMat.opacity     = 0.055 + 0.30  * revealFade
      nodeLinkMat.opacity = 0.14  + 0.58  * revealFade
      nodeMat.opacity     = 0.76  + 0.20  * revealFade
      ptMat.opacity       = 0.62  + 0.20  * revealFade

      // Smooth mouse tilt
      smoothX += (mouseRef.current.x - smoothX) * 0.032
      smoothY += (mouseRef.current.y - smoothY) * 0.032

      group.rotation.y = autoT * 0.45 + smoothX
      group.rotation.x = smoothY * 0.62

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      mount.removeEventListener('pointerdown', onPointerDown)
      ;[ptGeo, nodeGeo, lineGeo, nodeLinkGeo].forEach(g => g.dispose())
      ;[ptMat, nodeMat, lineMat, nodeLinkMat].forEach(m => m.dispose())
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [size])

  return (
    <motion.div
      ref={mountRef}
      initial={{ opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.45, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width:      size,
        height:     size,
        cursor:     'pointer',
        userSelect: 'none',
        flexShrink: 0,
        filter: 'none',
      }}
    />
  )
}
