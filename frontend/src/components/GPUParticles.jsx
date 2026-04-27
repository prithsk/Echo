import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const COUNT = 600

// Packed particle layout per element (vec4):
//   posLife[i] = { x, y, z, life }   life: 0→1 wraps, drives opacity arc
//   seed[i]    = { baseX, velY, phase, size }  immutable per-particle constants

export default function GPUParticles() {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!navigator.gpu) return

    const mount = mountRef.current
    if (!mount) return

    let animId
    let doCleanup = () => {}
    let isCurrent = true  // guards against React StrictMode double-invoke

    ;(async () => {
      try {
        const gpuMod = await import('three/webgpu')
        if (!isCurrent) return

        const WebGPURenderer = gpuMod.default ?? gpuMod.WebGPURenderer
        const { StorageBufferAttribute, MeshBasicNodeMaterial } = gpuMod

        const {
          storage, instanceIndex,
          sin, cos, time,
          positionLocal, uv,
          mix, clamp, float,
          color: c, vec3, Fn, If,
        } = await import('three/tsl')
        if (!isCurrent) return

        // ── Renderer ──────────────────────────────────────────────────────────
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
        camera.position.z = 5

        const renderer = new WebGPURenderer({ antialias: false, alpha: true })
        renderer.setClearColor(0x000000, 0)
        await renderer.init()

        function resize() {
          const w = mount.clientWidth
          const h = mount.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        }
        resize()
        mount.appendChild(renderer.domElement)

        const ro = new ResizeObserver(resize)
        ro.observe(mount)

        // ── Storage buffers ───────────────────────────────────────────────────
        // posLife: vec4 per particle — x, y, z, life(0..1)
        const posLife = new StorageBufferAttribute(COUNT, 4)
        // seed: vec4 per particle — baseX, velY, phase, size
        const seed = new StorageBufferAttribute(COUNT, 4)

        const plArr = posLife.array
        const sdArr = seed.array
        for (let i = 0; i < COUNT; i++) {
          // Scatter over a wide field
          plArr[i * 4 + 0] = (Math.random() - 0.5) * 10    // x
          plArr[i * 4 + 1] = (Math.random() - 0.5) * 8     // y
          plArr[i * 4 + 2] = (Math.random() - 0.5) * 1.5   // z
          plArr[i * 4 + 3] = Math.random()                  // life

          sdArr[i * 4 + 0] = (Math.random() - 0.5) * 9     // baseX
          sdArr[i * 4 + 1] = Math.random() * 0.006 + 0.002 // velY (upward speed)
          sdArr[i * 4 + 2] = Math.random() * Math.PI * 2   // phase offset
          sdArr[i * 4 + 3] = Math.random() * 0.6 + 0.4     // size scale
        }

        // ── Compute shader ────────────────────────────────────────────────────
        // Runs COUNT threads in parallel on the GPU each frame
        const computeUpdate = Fn(() => {
          const i = instanceIndex

          // Read mutable state
          const pl = storage(posLife, 'vec4', COUNT).element(i)
          const sd = storage(seed, 'vec4', COUNT).element(i)

          // Drift upward
          pl.y.addAssign(sd.y)

          // Swaying X — sinusoidal, unique per particle via phase
          pl.x.assign(sd.x.add(sin(time.mul(0.6).add(sd.z)).mul(0.35)))

          // Gentle Z oscillation for depth
          pl.z.assign(cos(time.mul(0.3).add(sd.z.mul(0.7))).mul(0.4))

          // Age
          pl.w.addAssign(float(0.0025))

          // Respawn: when particle drifts off top or life completes cycle
          If(pl.y.greaterThan(float(4.5)), () => {
            pl.y.assign(float(-4.5))
            pl.w.assign(float(0))
          })
        })().compute(COUNT)

        // ── Particle mesh ──────────────────────────────────────────────────────
        // Unit plane (1×1). positionNode scales and places each instance.
        const geo = new THREE.PlaneGeometry(1, 1)

        const mat = new MeshBasicNodeMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        })

        // Per-instance particle data nodes
        const plNode = storage(posLife, 'vec4', COUNT).element(instanceIndex)
        const sdNode = storage(seed, 'vec4', COUNT).element(instanceIndex)

        const particleLife = plNode.w  // 0..1
        const particleSize = sdNode.w  // 0.4..1.0

        // Place plane: scale by size then translate to particle world position
        mat.positionNode = positionLocal
          .mul(particleSize.mul(float(0.055)))
          .add(plNode.xyz)

        // Color: golden-ratio spread across coral ↔ amber ↔ peach palette
        const idF = instanceIndex.toFloat()
        const t0 = sin(idF.mul(2.3998)).mul(0.5).add(0.5)  // golden-ratio-ish irrational
        const t1 = sin(idF.mul(1.6180)).mul(0.5).add(0.5)
        const coral = c(0xCF4462)
        const amber = c(0xB87318)
        const peach = c(0xF0C4A8)
        const col = mix(mix(coral, amber, t0), peach, t1.mul(0.4))
        mat.colorNode = col

        // Opacity: UV circle mask × sin-arc life fade (soft appear → disappear)
        const centered = uv().sub(0.5)
        const dist = centered.length()
        const circleMask = clamp(float(0.5).sub(dist).mul(14.0), float(0.0), float(1.0))
        // sin arc: 0 at life=0 and life=1, peak at life=0.5
        const lifeFade = sin(clamp(particleLife, float(0.0), float(1.0)).mul(Math.PI))
        mat.opacityNode = circleMask.mul(lifeFade.mul(float(0.28)))

        // InstancedMesh — one plane per particle
        const mesh = new THREE.InstancedMesh(geo, mat, COUNT)
        mesh.frustumCulled = false

        // Initialize all instance matrices to identity (required)
        const identity = new THREE.Matrix4()
        for (let i = 0; i < COUNT; i++) mesh.setMatrixAt(i, identity)
        mesh.instanceMatrix.needsUpdate = true

        scene.add(mesh)
        scene.add(new THREE.AmbientLight(0xffffff, 1))

        // ── Render loop ────────────────────────────────────────────────────────
        async function animate() {
          animId = requestAnimationFrame(animate)
          await renderer.computeAsync(computeUpdate)
          await renderer.renderAsync(scene, camera)
        }
        animate()

        doCleanup = () => {
          cancelAnimationFrame(animId)
          ro.disconnect()
          geo.dispose()
          mat.dispose()
          renderer.dispose()
          if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
        }
      } catch (err) {
        console.warn('[GPUParticles] WebGPU init failed:', err)
      }
    })()

    return () => {
      isCurrent = false
      doCleanup()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  )
}
